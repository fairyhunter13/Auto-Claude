"""
AgentOrchestrator - Selects and coordinates agents for discussions.

Implements the Facilitator Pattern:
- Analyzes discussion topics
- Selects 2-3 relevant agents
- Maintains balanced participation
- Enables cross-talk between agents
"""

from __future__ import annotations

import csv
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class AgentPersona:
    """Agent persona loaded from BMAD manifest."""

    id: str
    display_name: str
    title: str
    icon: str
    role: str
    identity: str
    communication_style: str
    principles: list[str] = field(default_factory=list)
    module: str = ""
    path: str = ""

    def to_prompt_section(self) -> str:
        """Format agent for inclusion in prompt."""
        return f"""### {self.icon} {self.display_name} ({self.title})
**Role:** {self.role}
**Communication Style:** {self.communication_style}
**Key Principles:** {"; ".join(self.principles[:3])}
"""


# Topic keywords mapped to relevant agents
TOPIC_AGENT_MAP: dict[str, list[str]] = {
    # Product/Business topics
    "product": ["pm", "analyst"],
    "requirements": ["pm", "architect"],
    "vision": ["pm", "analyst"],
    "roadmap": ["pm", "sm"],
    "scope": ["pm", "architect"],
    "mvp": ["pm", "architect"],
    "feature": ["pm", "ux-designer"],
    "user": ["pm", "ux-designer", "analyst"],
    "persona": ["pm", "ux-designer", "analyst"],
    "story": ["pm", "sm"],
    "epic": ["pm", "sm"],
    # Technical topics
    "architecture": ["architect", "dev"],
    "technical": ["architect", "dev"],
    "database": ["architect", "dev"],
    "api": ["architect", "dev"],
    "infrastructure": ["architect", "dev"],
    "security": ["architect", "dev"],
    "performance": ["architect", "dev", "tea"],
    "scalability": ["architect", "dev"],
    "integration": ["architect", "dev"],
    # Design topics
    "design": ["ux-designer", "architect"],
    "ui": ["ux-designer", "dev"],
    "ux": ["ux-designer", "pm"],
    "interface": ["ux-designer", "dev"],
    "experience": ["ux-designer", "analyst"],
    # Process topics
    "sprint": ["sm", "dev"],
    "agile": ["sm", "pm"],
    "process": ["sm", "pm"],
    "planning": ["sm", "pm"],
    "backlog": ["sm", "pm"],
    # Quality topics
    "test": ["tea", "dev"],
    "quality": ["tea", "dev"],
    "coverage": ["tea", "dev"],
    # Research topics
    "research": ["analyst", "pm"],
    "market": ["analyst", "pm"],
    "competitive": ["analyst", "pm"],
    "analysis": ["analyst", "architect"],
}

# Phase lead agents
PHASE_LEADS: dict[str, str] = {
    "planning": "pm",
    "solutioning": "architect",
    "implementation": "sm",
}


class AgentOrchestrator:
    """
    Selects and coordinates agents for discussion topics.

    Selection Strategy:
    1. Analyze topic for keywords
    2. Match keywords to relevant agents
    3. Include phase lead agent
    4. Balance participation over time
    """

    def __init__(self, agents: dict[str, AgentPersona]):
        self.agents = agents
        self.participation_history: list[str] = []
        self.turn_count = 0

    def select_agents(
        self,
        topic: str,
        phase: str,
        user_directed: str | None = None,
        count: int = 3,
    ) -> list[str]:
        """
        Select 2-3 relevant agents for a topic.

        Args:
            topic: Discussion topic or user message
            phase: Current BMAD phase
            user_directed: Agent explicitly requested by user
            count: Number of agents to select (default 3)

        Returns:
            List of agent IDs
        """
        self.turn_count += 1
        selected: list[str] = []

        # 1. If user directed an agent, include them first
        if user_directed and user_directed in self.agents:
            selected.append(user_directed)

        # 2. Include phase lead
        phase_lead = PHASE_LEADS.get(phase, "pm")
        if phase_lead not in selected and phase_lead in self.agents:
            selected.append(phase_lead)

        # 3. Analyze topic for relevant agents
        topic_lower = topic.lower()
        topic_agents: dict[str, int] = {}  # agent -> relevance score

        for keyword, agents in TOPIC_AGENT_MAP.items():
            if keyword in topic_lower:
                for agent in agents:
                    if agent in self.agents and agent not in selected:
                        topic_agents[agent] = topic_agents.get(agent, 0) + 1

        # Sort by relevance and add top agents
        sorted_agents = sorted(topic_agents.items(), key=lambda x: -x[1])
        for agent, _ in sorted_agents:
            if len(selected) >= count:
                break
            if agent not in selected:
                selected.append(agent)

        # 4. If still need more, add based on rotation
        if len(selected) < count:
            # Find least recently participating agents
            for agent_id in self.agents:
                if agent_id not in selected:
                    # Check participation history
                    recent_count = self.participation_history[-20:].count(agent_id)
                    if recent_count < 3:  # Not too recent
                        selected.append(agent_id)
                        if len(selected) >= count:
                            break

        # Update participation history
        self.participation_history.extend(selected)

        return selected[:count]

    def build_discussion_prompt(
        self,
        topic: str,
        agents: list[str],
        context: str,
        user_message: str | None = None,
    ) -> str:
        """
        Build prompt for multi-agent discussion.

        Args:
            topic: Current discussion topic
            agents: Selected agent IDs
            context: Context from PartyMemory
            user_message: User's input (if any)

        Returns:
            Complete prompt for LLM
        """
        # Format agent personas
        agent_sections = []
        for agent_id in agents:
            if agent_id in self.agents:
                agent_sections.append(self.agents[agent_id].to_prompt_section())

        agent_personas = "\n".join(agent_sections)

        # Build the prompt
        prompt = f"""You are facilitating a BMAD party mode discussion.

## Active Agents for This Topic

{agent_personas}

## Project Context

{context}

## Current Topic

{topic}

## User Input

{user_message or "[Continue the discussion]"}

## Instructions

Each selected agent should respond in-character to this topic.
- Maintain their communication style and expertise
- Enable natural cross-talk and building on each other's points
- Focus on actionable insights for the artifact being created
- Keep responses focused and substantive (2-4 paragraphs per agent)

## Response Format

For each agent, respond as:

{self.agents[agents[0]].icon} **{self.agents[agents[0]].display_name}**: [Their response in character]

[Additional agents follow the same format]

After all responses, if any decisions are made, note them:

[DECISION]: [Topic] - [What was decided] - [Rationale]
"""
        return prompt

    def parse_agent_responses(
        self,
        llm_output: str,
    ) -> tuple[list[tuple[str, str]], list[dict[str, str]]]:
        """
        Parse individual agent responses and decisions from LLM output.

        Args:
            llm_output: Raw LLM response

        Returns:
            Tuple of (agent_responses, decisions)
            - agent_responses: [(agent_id, content), ...]
            - decisions: [{topic, decision, rationale}, ...]
        """
        responses: list[tuple[str, str]] = []
        decisions: list[dict[str, str]] = []

        # Parse agent responses
        # Pattern: ICON **Name**: content
        # We need to find patterns like: 📋 **John**: ...
        agent_pattern = r"([^\s]+)\s+\*\*([^*]+)\*\*:\s*"

        # Split by agent headers
        parts = re.split(agent_pattern, llm_output)

        # Process parts (groups of 3: before, icon, name, content)
        i = 1  # Skip first part (before any agent)
        while i + 2 < len(parts):
            icon = parts[i].strip()
            name = parts[i + 1].strip()
            content = parts[i + 2].strip()

            # Find agent by name
            agent_id = self._find_agent_by_name(name)
            if agent_id:
                # Remove any trailing agent headers from content
                next_agent_match = re.search(r"([^\s]+)\s+\*\*[^*]+\*\*:", content)
                if next_agent_match:
                    content = content[: next_agent_match.start()].strip()

                # Remove decision sections from content
                decision_match = re.search(r"\[DECISION\]:", content)
                if decision_match:
                    content = content[: decision_match.start()].strip()

                responses.append((agent_id, content))

            i += 3

        # Parse decisions
        # Pattern: [DECISION]: Topic - Decision - Rationale
        decision_pattern = r"\[DECISION\]:\s*([^-]+)\s*-\s*([^-]+)\s*-\s*(.+?)(?=\[DECISION\]|$)"
        for match in re.finditer(decision_pattern, llm_output, re.DOTALL):
            decisions.append(
                {
                    "topic": match.group(1).strip(),
                    "decision": match.group(2).strip(),
                    "rationale": match.group(3).strip(),
                }
            )

        return responses, decisions

    def _find_agent_by_name(self, name: str) -> str | None:
        """Find agent ID by display name."""
        name_lower = name.lower()
        for agent_id, agent in self.agents.items():
            if agent.display_name.lower() == name_lower:
                return agent_id
        return None

    @classmethod
    def load_agents_from_manifest(cls, manifest_path: Path) -> dict[str, AgentPersona]:
        """
        Load all agents from BMAD manifest CSV.

        Args:
            manifest_path: Path to agent-manifest.csv

        Returns:
            Dictionary of agent_id -> AgentPersona
        """
        agents: dict[str, AgentPersona] = {}

        if not manifest_path.exists():
            return agents

        with open(manifest_path, newline="", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                # Parse principles (semicolon-separated)
                principles = []
                if row.get("principles"):
                    principles = [p.strip() for p in row["principles"].split(";") if p.strip()]

                agent = AgentPersona(
                    id=row.get("name", ""),
                    display_name=row.get("displayName", ""),
                    title=row.get("title", ""),
                    icon=row.get("icon", ""),
                    role=row.get("role", ""),
                    identity=row.get("identity", ""),
                    communication_style=row.get("communicationStyle", ""),
                    principles=principles,
                    module=row.get("module", ""),
                    path=row.get("path", ""),
                )

                if agent.id:
                    agents[agent.id] = agent

        return agents
