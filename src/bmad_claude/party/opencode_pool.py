"""
OpenCodePool - Load balancing across multiple OpenCode profiles.

Manages multiple OpenCode server instances for:
- Round-robin load distribution
- Automatic failover
- Rate limit avoidance

Usage:
    pool = OpenCodePool([
        OpenCodeProfile("personal", config_home="~/.config/opencode-personal"),
        OpenCodeProfile("work", config_home="~/.config/opencode-work"),
    ])

    async with pool:
        response = await pool.send_prompt("Hello!")
"""

from __future__ import annotations

import asyncio
import os
import random
import subprocess
import time
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path
from typing import Any, AsyncIterator, Callable

from bmad_claude.party.opencode_client import (
    OpenCodeClient,
    OpenCodeConfig,
    StreamEvent,
)


class LoadBalanceStrategy(Enum):
    """Load balancing strategies."""

    ROUND_ROBIN = "round_robin"
    RANDOM = "random"
    LEAST_USED = "least_used"
    FAILOVER = "failover"  # Use primary, fallback on failure


@dataclass
class OpenCodeProfile:
    """Configuration for a single OpenCode profile."""

    name: str
    config_home: str | None = None  # XDG_CONFIG_HOME
    data_home: str | None = None  # XDG_DATA_HOME
    port: int = 0  # Auto-assigned if 0
    model: str = "anthropic/claude-opus-4-5"
    variant: str = "max"
    priority: int = 1  # Higher = preferred for failover

    # Runtime state
    request_count: int = field(default=0, repr=False)
    error_count: int = field(default=0, repr=False)
    last_error_time: float = field(default=0.0, repr=False)

    def get_env(self) -> dict[str, str]:
        """Get environment variables for this profile."""
        env = os.environ.copy()
        env["OPENCODE_DISABLE_AUTOUPDATE"] = "true"

        if self.config_home:
            env["XDG_CONFIG_HOME"] = os.path.expanduser(self.config_home)
        if self.data_home:
            env["XDG_DATA_HOME"] = os.path.expanduser(self.data_home)

        return env


# Pre-configured profiles matching ~/.bash_aliases
BUILTIN_PROFILES = {
    "personal": OpenCodeProfile(
        name="personal",
        config_home="~/.config/opencode-personal",
        data_home="~/.local/share/opencode-personal",
        priority=2,
    ),
    "work": OpenCodeProfile(
        name="work",
        config_home="~/.config/opencode-work",
        data_home="~/.local/share/opencode-work",
        priority=2,
    ),
    "default": OpenCodeProfile(
        name="default",
        priority=1,
    ),
}


@dataclass
class PoolStats:
    """Statistics for the pool."""

    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    failovers: int = 0
    profile_stats: dict[str, dict[str, int]] = field(default_factory=dict)


class OpenCodePool:
    """
    Pool of OpenCode clients for load balancing.

    Features:
    - Multiple profile support (personal, work, default)
    - Round-robin, random, or failover strategies
    - Automatic server management per profile
    - Streaming support across all profiles
    - Error tracking and recovery
    """

    BASE_PORT = 4096

    def __init__(
        self,
        profiles: list[OpenCodeProfile] | list[str] | None = None,
        strategy: LoadBalanceStrategy = LoadBalanceStrategy.ROUND_ROBIN,
        project_root: Path | None = None,
    ):
        """
        Initialize the pool.

        Args:
            profiles: List of OpenCodeProfile objects or profile names
                     (e.g., ["personal", "work"])
                     If None, uses all builtin profiles
            strategy: Load balancing strategy
            project_root: Project root directory
        """
        self.project_root = project_root or Path.cwd()
        self.strategy = strategy

        # Parse profiles
        if profiles is None:
            # Default: use personal and work
            profiles = ["personal", "work"]

        self.profiles: list[OpenCodeProfile] = []
        for p in profiles:
            if isinstance(p, str):
                if p in BUILTIN_PROFILES:
                    self.profiles.append(BUILTIN_PROFILES[p])
                else:
                    raise ValueError(
                        f"Unknown profile: {p}. Available: {list(BUILTIN_PROFILES.keys())}"
                    )
            else:
                self.profiles.append(p)

        # Assign ports
        for i, profile in enumerate(self.profiles):
            if profile.port == 0:
                profile.port = self.BASE_PORT + i

        # State
        self._clients: dict[str, OpenCodeClient] = {}
        self._servers: dict[str, subprocess.Popen] = {}
        self._round_robin_index = 0
        self._lock = asyncio.Lock()
        self.stats = PoolStats()

    async def __aenter__(self) -> "OpenCodePool":
        """Start all profile servers."""
        await self.start()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Stop all servers."""
        await self.stop()

    async def start(self) -> None:
        """Start OpenCode servers for all profiles."""
        for profile in self.profiles:
            await self._start_profile(profile)

    async def stop(self) -> None:
        """Stop all OpenCode servers."""
        # Close clients
        for client in self._clients.values():
            await client.disconnect()
        self._clients.clear()

        # Stop servers
        for name, proc in self._servers.items():
            proc.terminate()
            try:
                proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                proc.kill()
        self._servers.clear()

    async def _start_profile(self, profile: OpenCodeProfile) -> None:
        """Start server for a single profile."""
        # Check if already running
        if profile.name in self._clients:
            return

        # Start server with profile's environment
        cmd = [
            "opencode",
            "serve",
            "--port",
            str(profile.port),
            "--hostname",
            "127.0.0.1",
        ]

        proc = subprocess.Popen(
            cmd,
            env=profile.get_env(),
            cwd=str(self.project_root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        self._servers[profile.name] = proc

        # Create client
        config = OpenCodeConfig(
            host="127.0.0.1",
            port=profile.port,
            model=profile.model,
            variant=profile.variant,
        )
        client = OpenCodeClient(config, self.project_root)

        # Wait for server to be ready
        max_wait = 30
        start_time = time.time()
        while time.time() - start_time < max_wait:
            try:
                await client.connect()
                self._clients[profile.name] = client
                self.stats.profile_stats[profile.name] = {
                    "requests": 0,
                    "errors": 0,
                }
                return
            except Exception:
                await asyncio.sleep(0.5)

        raise RuntimeError(f"Failed to start OpenCode server for profile: {profile.name}")

    def _select_profile(self) -> OpenCodeProfile:
        """Select next profile based on strategy."""
        if not self.profiles:
            raise RuntimeError("No profiles configured")

        if self.strategy == LoadBalanceStrategy.ROUND_ROBIN:
            profile = self.profiles[self._round_robin_index]
            self._round_robin_index = (self._round_robin_index + 1) % len(self.profiles)
            return profile

        elif self.strategy == LoadBalanceStrategy.RANDOM:
            return random.choice(self.profiles)

        elif self.strategy == LoadBalanceStrategy.LEAST_USED:
            return min(self.profiles, key=lambda p: p.request_count)

        elif self.strategy == LoadBalanceStrategy.FAILOVER:
            # Sort by priority, use first healthy one
            sorted_profiles = sorted(self.profiles, key=lambda p: -p.priority)
            for profile in sorted_profiles:
                # Skip if recently errored (backoff)
                if profile.error_count > 3:
                    if time.time() - profile.last_error_time < 60:
                        continue
                    # Reset after backoff
                    profile.error_count = 0
                return profile
            # All profiles in backoff, use highest priority anyway
            return sorted_profiles[0]

        return self.profiles[0]

    async def send_prompt(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> str:
        """
        Send prompt using load balancing.

        Args:
            prompt: User message
            system_prompt: Optional system prompt

        Returns:
            Complete response text
        """
        async with self._lock:
            profile = self._select_profile()

        client = self._clients.get(profile.name)
        if not client:
            raise RuntimeError(f"No client for profile: {profile.name}")

        try:
            profile.request_count += 1
            self.stats.total_requests += 1
            self.stats.profile_stats[profile.name]["requests"] += 1

            response = await client.send_prompt(prompt, system_prompt)

            self.stats.successful_requests += 1
            return response

        except Exception as e:
            profile.error_count += 1
            profile.last_error_time = time.time()
            self.stats.failed_requests += 1
            self.stats.profile_stats[profile.name]["errors"] += 1

            # Try failover
            if len(self.profiles) > 1:
                self.stats.failovers += 1
                for fallback in self.profiles:
                    if fallback.name != profile.name:
                        fallback_client = self._clients.get(fallback.name)
                        if fallback_client:
                            try:
                                return await fallback_client.send_prompt(prompt, system_prompt)
                            except Exception:
                                continue

            raise RuntimeError(f"All profiles failed. Last error: {e}")

    async def stream_prompt(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """
        Stream prompt response using load balancing.

        Args:
            prompt: User message
            system_prompt: Optional system prompt

        Yields:
            StreamEvent objects with text chunks
        """
        async with self._lock:
            profile = self._select_profile()

        client = self._clients.get(profile.name)
        if not client:
            raise RuntimeError(f"No client for profile: {profile.name}")

        profile.request_count += 1
        self.stats.total_requests += 1
        self.stats.profile_stats[profile.name]["requests"] += 1

        try:
            async for event in client.stream_prompt(prompt, system_prompt):
                yield event
            self.stats.successful_requests += 1

        except Exception as e:
            profile.error_count += 1
            profile.last_error_time = time.time()
            self.stats.failed_requests += 1
            self.stats.profile_stats[profile.name]["errors"] += 1
            raise

    def get_status(self) -> dict[str, Any]:
        """Get pool status."""
        return {
            "strategy": self.strategy.value,
            "profiles": [
                {
                    "name": p.name,
                    "port": p.port,
                    "requests": p.request_count,
                    "errors": p.error_count,
                    "healthy": p.error_count < 3,
                }
                for p in self.profiles
            ],
            "stats": {
                "total_requests": self.stats.total_requests,
                "successful": self.stats.successful_requests,
                "failed": self.stats.failed_requests,
                "failovers": self.stats.failovers,
            },
        }


def get_available_profiles() -> list[str]:
    """Get list of available profile names."""
    return list(BUILTIN_PROFILES.keys())


def create_pool_from_names(
    profile_names: list[str],
    strategy: str = "round_robin",
    project_root: Path | None = None,
) -> OpenCodePool:
    """
    Create a pool from profile names.

    Args:
        profile_names: List of profile names (e.g., ["personal", "work"])
        strategy: Load balancing strategy name
        project_root: Project root directory

    Returns:
        Configured OpenCodePool
    """
    strategy_map = {
        "round_robin": LoadBalanceStrategy.ROUND_ROBIN,
        "random": LoadBalanceStrategy.RANDOM,
        "least_used": LoadBalanceStrategy.LEAST_USED,
        "failover": LoadBalanceStrategy.FAILOVER,
    }

    lb_strategy = strategy_map.get(strategy.lower(), LoadBalanceStrategy.ROUND_ROBIN)

    return OpenCodePool(
        profiles=profile_names,
        strategy=lb_strategy,
        project_root=project_root,
    )
