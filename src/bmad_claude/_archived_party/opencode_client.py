"""
OpenCodeClient - HTTP client for OpenCode server interaction.

Provides streaming LLM responses via Server-Sent Events (SSE).

Usage:
    async with OpenCodeClient() as client:
        async for chunk in client.stream_prompt("Hello!"):
            print(chunk, end="", flush=True)
"""

from __future__ import annotations

import asyncio
import json
import subprocess
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, AsyncIterator

import httpx


@dataclass
class OpenCodeConfig:
    """Configuration for OpenCode client."""

    host: str = "127.0.0.1"
    port: int = 4096
    model: str = "anthropic/claude-opus-4-5"
    variant: str = "max"
    opencode_path: str = "opencode"
    timeout: float = 300.0  # 5 minutes for long responses
    startup_timeout: float = 30.0


@dataclass
class StreamEvent:
    """A streaming event from OpenCode."""

    event_type: str
    data: dict[str, Any] = field(default_factory=dict)
    text: str = ""


class OpenCodeClient:
    """
    Async HTTP client for OpenCode server.

    Manages:
    - Server lifecycle (start/stop)
    - Session creation
    - SSE streaming for real-time responses

    Example:
        async with OpenCodeClient() as client:
            # Stream a prompt
            async for event in client.stream_prompt("Explain Python decorators"):
                if event.text:
                    print(event.text, end="", flush=True)
    """

    def __init__(
        self,
        config: OpenCodeConfig | None = None,
        project_root: Path | None = None,
    ):
        self.config = config or OpenCodeConfig()
        self.project_root = project_root or Path.cwd()
        self.base_url = f"http://{self.config.host}:{self.config.port}"

        # State
        self._server_process: subprocess.Popen | None = None
        self._http_client: httpx.AsyncClient | None = None
        self._session_id: str | None = None
        self._owns_server = False  # Did we start the server?

    async def __aenter__(self) -> "OpenCodeClient":
        """Start client and ensure server is running."""
        await self.connect()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb) -> None:
        """Clean up resources."""
        await self.disconnect()

    async def connect(self) -> None:
        """Connect to OpenCode server, starting it if necessary."""
        self._http_client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=httpx.Timeout(self.config.timeout),
        )

        # Check if server is already running
        if not await self._is_server_running():
            await self._start_server()
            self._owns_server = True

        # Create a session
        await self._create_session()

    async def disconnect(self) -> None:
        """Disconnect and clean up."""
        if self._http_client:
            await self._http_client.aclose()
            self._http_client = None

        if self._owns_server and self._server_process:
            self._server_process.terminate()
            try:
                self._server_process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                self._server_process.kill()
            self._server_process = None

    async def _is_server_running(self) -> bool:
        """Check if OpenCode server is running."""
        try:
            response = await self._http_client.get("/global/health")
            return response.status_code == 200
        except httpx.ConnectError:
            return False

    async def _start_server(self) -> None:
        """Start OpenCode server in background."""
        cmd = [
            self.config.opencode_path,
            "serve",
            "--port",
            str(self.config.port),
            "--hostname",
            self.config.host,
        ]

        self._server_process = subprocess.Popen(
            cmd,
            cwd=str(self.project_root),
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Wait for server to be ready
        start_time = time.time()
        while time.time() - start_time < self.config.startup_timeout:
            if await self._is_server_running():
                return
            await asyncio.sleep(0.5)

        raise RuntimeError(f"OpenCode server failed to start within {self.config.startup_timeout}s")

    async def _create_session(self) -> str:
        """Create a new OpenCode session."""
        response = await self._http_client.post(
            "/session",
            json={"title": "BMAD Party Mode"},
        )
        response.raise_for_status()
        data = response.json()
        self._session_id = data["id"]
        return self._session_id

    async def stream_prompt(
        self,
        prompt: str,
        system_prompt: str | None = None,
    ) -> AsyncIterator[StreamEvent]:
        """
        Send a prompt and stream the response.

        Args:
            prompt: User message to send
            system_prompt: Optional system prompt to prepend

        Yields:
            StreamEvent objects with text chunks and metadata
        """
        if not self._session_id:
            raise RuntimeError("No active session. Call connect() first.")

        # Build message parts
        parts = []
        if system_prompt:
            parts.append({"type": "text", "text": system_prompt})
        parts.append({"type": "text", "text": prompt})

        # Send prompt asynchronously
        await self._http_client.post(
            f"/session/{self._session_id}/prompt_async",
            json={
                "model": {
                    "providerID": self.config.model.split("/")[0],
                    "modelID": self.config.model.split("/")[1],
                },
                "parts": parts,
            },
        )

        # Stream events
        async for event in self._stream_events():
            yield event

    async def _stream_events(self) -> AsyncIterator[StreamEvent]:
        """
        Stream Server-Sent Events from OpenCode.

        Yields events until the assistant message is complete.
        """
        async with self._http_client.stream("GET", "/event") as response:
            current_text = ""
            message_complete = False

            async for line in response.aiter_lines():
                if message_complete:
                    break

                if not line.strip():
                    continue

                # Parse SSE format: "event: type" or "data: {...}"
                if line.startswith("event:"):
                    event_type = line[6:].strip()
                    continue

                if line.startswith("data:"):
                    try:
                        data = json.loads(line[5:].strip())
                    except json.JSONDecodeError:
                        continue

                    event = self._parse_event(data)
                    if event:
                        yield event

                        # Check for completion
                        if event.event_type in ("message.complete", "assistant.done"):
                            message_complete = True

    def _parse_event(self, data: dict[str, Any]) -> StreamEvent | None:
        """Parse raw SSE data into StreamEvent."""
        event_type = data.get("type", "")

        # Text content events
        if "part" in data and data["part"].get("type") == "text":
            text = data["part"].get("text", "")
            if text:
                return StreamEvent(
                    event_type="text",
                    data=data,
                    text=text,
                )

        # Text delta events (streaming chunks)
        if event_type == "part.text.delta":
            text = data.get("delta", "")
            if text:
                return StreamEvent(
                    event_type="text.delta",
                    data=data,
                    text=text,
                )

        # Message complete
        if event_type in ("message.complete", "assistant.done", "part.done"):
            return StreamEvent(
                event_type="complete",
                data=data,
            )

        # Tool calls (for reference)
        if event_type == "tool.call":
            return StreamEvent(
                event_type="tool.call",
                data=data,
            )

        return None

    async def send_prompt(self, prompt: str, system_prompt: str | None = None) -> str:
        """
        Send a prompt and wait for complete response.

        Args:
            prompt: User message to send
            system_prompt: Optional system prompt

        Returns:
            Complete response text
        """
        full_response = []
        async for event in self.stream_prompt(prompt, system_prompt):
            if event.text:
                full_response.append(event.text)

        return "".join(full_response)

    async def get_session_messages(self) -> list[dict[str, Any]]:
        """Get all messages in the current session."""
        if not self._session_id:
            raise RuntimeError("No active session.")

        response = await self._http_client.get(f"/session/{self._session_id}/message")
        response.raise_for_status()
        return response.json()


class OpenCodeClientSync:
    """
    Synchronous wrapper for OpenCodeClient.

    For use in non-async contexts.
    """

    def __init__(
        self,
        config: OpenCodeConfig | None = None,
        project_root: Path | None = None,
    ):
        self._async_client = OpenCodeClient(config, project_root)

    def __enter__(self) -> "OpenCodeClientSync":
        asyncio.run(self._async_client.connect())
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        asyncio.run(self._async_client.disconnect())

    def send_prompt(self, prompt: str, system_prompt: str | None = None) -> str:
        """Send prompt and get complete response."""
        return asyncio.run(self._async_client.send_prompt(prompt, system_prompt))
