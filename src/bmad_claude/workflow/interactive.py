"""
Interactive Mode - Sequential Workflow Automation with Chat Interface

Provides an interactive chat interface for BMAD workflow automation:
- Loads all agents from agent-manifest.csv
- Selects relevant agents based on topic analysis
- Executes workflows sequentially via OpenCode's --agent flag
- Supports all BMAD slash commands for workflow execution

Note: This is NOT multi-agent simulation in a single session.
Each agent call is a separate OpenCode invocation.
"""

from __future__ import annotations

import asyncio
import csv
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Callable, Any

from bmad_claude.workflow.config import (
    AGENTS,
    WORKFLOWS,
    SLASH_COMMANDS,
    AgentConfig,
    get_workflow,
    get_workflow_by_command,
)


@dataclass
class BMADAgent:
    """A BMAD agent that can be invoked via OpenCode."""

    id: str
    display_name: str
    title: str
    icon: str
    role: str
    identity: str
    communication_style: str
    principles: str
    module: str
    path: str

    @classmethod
    def from_csv_row(cls, row: dict[str, str]) -> "BMADAgent":
        """Create BMADAgent from CSV row."""
        return cls(
            id=row.get("name", ""),
            display_name=row.get("displayName", ""),
            title=row.get("title", ""),
            icon=row.get("icon", ""),
            role=row.get("role", ""),
            identity=row.get("identity", ""),
            communication_style=row.get("communicationStyle", ""),
            principles=row.get("principles", ""),
            module=row.get("module", ""),
            path=row.get("path", ""),
        )

    @classmethod
    def from_config(cls, config: AgentConfig) -> "BMADAgent":
        """Create BMADAgent from AgentConfig."""
        return cls(
            id=config.id,
            display_name=config.display_name,
            title=config.title,
            icon=config.icon,
            role=config.role,
            identity=config.identity,
            communication_style=config.communication_style,
            principles=config.principles,
            module=config.module,
            path=config.path,
        )


@dataclass
class InteractionTurn:
    """A single turn in the interactive session."""

    agent_id: str
    agent_name: str
    agent_icon: str
    content: str
    timestamp: datetime = field(default_factory=datetime.now)
    is_user: bool = False


@dataclass
class InteractiveSession:
    """An interactive session with conversation history."""

    session_id: str
    project_name: str
    agents: dict[str, BMADAgent]
    conversation: list[InteractionTurn] = field(default_factory=list)
    active: bool = True
    current_topic: str = ""
    created_at: datetime = field(default_factory=datetime.now)

    def add_turn(self, turn: InteractionTurn) -> None:
        """Add a turn to the conversation."""
        self.conversation.append(turn)

    def get_context(self, max_turns: int = 10) -> str:
        """Get recent conversation context."""
        recent = (
            self.conversation[-max_turns:]
            if len(self.conversation) > max_turns
            else self.conversation
        )

        context_parts = []
        for turn in recent:
            if turn.is_user:
                context_parts.append(f"User: {turn.content}")
            else:
                context_parts.append(f"{turn.agent_icon} {turn.agent_name}: {turn.content}")

        return "\n\n".join(context_parts)


class InteractiveOrchestrator:
    """
    Orchestrates interactive workflow automation sessions.

    This provides a chat interface where:
    1. Users can discuss topics with BMAD agents
    2. Relevant agents are selected based on the topic
    3. Each agent response is a separate OpenCode call
    4. BMAD workflows can be executed via slash commands
    """

    EXIT_TRIGGERS = ["exit", "quit", "bye", "/exit", "/quit"]

    def __init__(
        self,
        project_root: Path | None = None,
        opencode_path: str = "opencode",
        verbose: bool = True,
    ):
        self.project_root = project_root or Path.cwd()
        self.opencode_path = opencode_path
        self.verbose = verbose
        self.agents: dict[str, BMADAgent] = {}
        self.session: InteractiveSession | None = None

    def _log(self, msg: str) -> None:
        """Log message if verbose."""
        if self.verbose:
            print(msg)

    def load_agents(self) -> dict[str, BMADAgent]:
        """
        Load all agents from agent-manifest.csv.

        Falls back to built-in AGENTS config if CSV not found.
        """
        manifest_path = self.project_root / "_bmad" / "_config" / "agent-manifest.csv"

        if manifest_path.exists():
            self._log(f"Loading agents from {manifest_path}")
            with open(manifest_path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    agent = BMADAgent.from_csv_row(row)
                    if agent.id:
                        self.agents[agent.id] = agent
        else:
            self._log("Agent manifest not found, using built-in agents")
            for agent_id, config in AGENTS.items():
                self.agents[agent_id] = BMADAgent.from_config(config)

        self._log(f"Loaded {len(self.agents)} agents")
        return self.agents

    def create_session(self, project_name: str) -> InteractiveSession:
        """Create a new interactive session."""
        if not self.agents:
            self.load_agents()

        session_id = f"interactive-{datetime.now().strftime('%Y-%m-%d-%H%M%S')}"
        self.session = InteractiveSession(
            session_id=session_id,
            project_name=project_name,
            agents=self.agents,
        )
        return self.session

    def get_welcome_message(self) -> str:
        """Generate the interactive mode welcome message."""
        if not self.session:
            return "No active session"

        # Show 3-4 diverse agents as examples
        sample_agents = list(self.agents.values())[:4]
        agent_intro = "\n".join(
            [
                f"  {a.icon} **{a.display_name}** ({a.title}): {a.role[:60]}..."
                for a in sample_agents
            ]
        )

        return f"""🚀 **INTERACTIVE MODE** 🚀

Welcome to BMAD Interactive Mode! This provides a chat interface for 
workflow automation where relevant agents respond to your questions.

**Available Agents:**

{agent_intro}

**{len(self.agents)} agents** available for consultation.

**Commands:**
- Type any message to get agent responses
- `/workflow <id>` - Run a BMAD workflow (e.g., `/workflow prd`)
- `/ask <agent> <question>` - Ask a specific agent
- `/agents` - List all available agents
- `/help` - Show help
- `/exit` - End session

**What would you like to discuss?**
"""

    def select_agents_for_topic(
        self,
        topic: str,
        user_mentioned_agent: str | None = None,
        max_agents: int = 3,
    ) -> list[BMADAgent]:
        """
        Select relevant agents based on topic analysis.

        Selection logic:
        - If user mentions a specific agent, prioritize that agent
        - Analyze topic for domain expertise requirements
        - Select 2-3 most relevant agents for balanced perspective
        """
        selected = []

        # If user mentioned a specific agent, include them first
        if user_mentioned_agent:
            mentioned = self.agents.get(user_mentioned_agent)
            if mentioned:
                selected.append(mentioned)

        # Topic-based selection using keyword matching
        topic_lower = topic.lower()

        # Define expertise keywords for each agent type
        expertise_map = {
            "pm": [
                "product",
                "prd",
                "requirements",
                "user story",
                "feature",
                "roadmap",
                "priority",
            ],
            "architect": [
                "architecture",
                "system",
                "design",
                "scalability",
                "infrastructure",
                "api",
                "database",
                "tech",
            ],
            "analyst": [
                "research",
                "market",
                "analysis",
                "brief",
                "business",
                "competitive",
                "strategy",
            ],
            "dev": [
                "code",
                "implement",
                "develop",
                "bug",
                "fix",
                "refactor",
                "test",
                "programming",
            ],
            "ux-designer": [
                "ux",
                "ui",
                "design",
                "user experience",
                "interface",
                "wireframe",
                "prototype",
            ],
            "sm": ["sprint", "story", "agile", "scrum", "planning", "backlog", "velocity"],
            "tea": ["test", "qa", "quality", "automation", "coverage", "regression"],
            "tech-writer": ["document", "docs", "write", "readme", "api docs"],
            "brainstorming-coach": ["brainstorm", "idea", "creative", "innovation", "explore"],
        }

        # Score agents by topic relevance
        scores = {}
        for agent_id, keywords in expertise_map.items():
            if agent_id in self.agents:
                score = sum(1 for kw in keywords if kw in topic_lower)
                if score > 0:
                    scores[agent_id] = score

        # Sort by score and select top agents
        sorted_agents = sorted(scores.items(), key=lambda x: x[1], reverse=True)

        for agent_id, _ in sorted_agents:
            if len(selected) >= max_agents:
                break
            agent = self.agents.get(agent_id)
            if agent and agent not in selected:
                selected.append(agent)

        # If we don't have enough agents, add some defaults
        default_agents = ["pm", "architect", "analyst"]
        for agent_id in default_agents:
            if len(selected) >= max_agents:
                break
            agent = self.agents.get(agent_id)
            if agent and agent not in selected:
                selected.append(agent)

        return selected

    def parse_user_input(self, user_input: str) -> dict[str, Any]:
        """
        Parse user input for commands and agent mentions.

        Returns:
            {
                "type": "message" | "command" | "workflow" | "ask" | "exit",
                "content": str,
                "command": str | None,
                "args": list[str],
                "mentioned_agent": str | None,
            }
        """
        result = {
            "type": "message",
            "content": user_input,
            "command": None,
            "args": [],
            "mentioned_agent": None,
        }

        # Check for exit triggers
        if any(trigger in user_input.lower() for trigger in self.EXIT_TRIGGERS):
            result["type"] = "exit"
            return result

        # Check for slash commands
        if user_input.startswith("/"):
            parts = user_input.split()
            command = parts[0].lower()
            args = parts[1:] if len(parts) > 1 else []

            result["command"] = command
            result["args"] = args

            if command in ["/exit", "/quit", "/bye"]:
                result["type"] = "exit"
            elif command == "/workflow":
                result["type"] = "workflow"
                result["content"] = " ".join(args)
            elif command == "/ask":
                result["type"] = "ask"
                if args:
                    result["mentioned_agent"] = args[0]
                    result["content"] = " ".join(args[1:])
            elif command == "/agents":
                result["type"] = "command"
            elif command == "/help":
                result["type"] = "command"
            elif command == "/status":
                result["type"] = "command"
            elif command.startswith("/bmad:"):
                # Direct BMAD slash command
                result["type"] = "workflow"
                result["content"] = command
            else:
                result["type"] = "command"

        # Check for @agent mentions
        for agent_id in self.agents:
            if f"@{agent_id}" in user_input.lower():
                result["mentioned_agent"] = agent_id
                break

        return result

    def generate_agent_response_prompt(
        self,
        agent: BMADAgent,
        topic: str,
        conversation_context: str,
        other_agents: list[BMADAgent],
    ) -> str:
        """
        Generate a prompt for an agent to respond in character.
        """
        other_names = ", ".join([a.display_name for a in other_agents if a.id != agent.id])

        return f"""You are {agent.display_name} ({agent.title}), responding to a user question.

**Your Identity:**
{agent.identity}

**Your Communication Style:**
{agent.communication_style}

**Your Principles:**
{agent.principles}

**Your Role:**
{agent.role}

**User's Question:**
{topic}

**Other Experts Available:**
{other_names}

**Recent Context:**
{conversation_context}

**Instructions:**
1. Respond in character as {agent.display_name}
2. Use your documented communication style
3. Draw from your expertise and principles
4. Keep response focused and actionable (2-4 paragraphs max)
5. If you have questions for the user, ask clearly

**Now respond as {agent.display_name}:**
"""

    async def run_agent_response(
        self,
        agent: BMADAgent,
        prompt: str,
        on_output: Callable[[str], None] | None = None,
    ) -> str:
        """
        Run an agent response using OpenCode.

        Uses opencode --agent <id> to activate the correct agent persona.
        """
        try:
            # Build OpenCode command
            cmd = [
                self.opencode_path,
                "--agent",
                agent.id,
                "run",
                prompt,
            ]

            # Execute with streaming output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_root),
            )

            # Stream stdout
            full_output = []
            while True:
                chunk = await process.stdout.read(100)
                if not chunk:
                    break

                text = chunk.decode("utf-8", errors="replace")
                full_output.append(text)

                if on_output:
                    on_output(text)

            await process.wait()
            return "".join(full_output)

        except FileNotFoundError:
            return f"[Error: OpenCode not found at {self.opencode_path}]"
        except Exception as e:
            return f"[Error: {e}]"

    async def run_workflow(
        self,
        workflow_id: str,
        on_output: Callable[[str], None] | None = None,
    ) -> bool:
        """
        Run a BMAD workflow via OpenCode.
        """
        workflow = get_workflow(workflow_id)
        if not workflow:
            # Try to find by slash command
            workflow = get_workflow_by_command(workflow_id)

        if not workflow:
            self._log(f"Unknown workflow: {workflow_id}")
            return False

        self._log(f"\n{'=' * 60}")
        self._log(f"Running: {workflow.name}")
        self._log(f"Agent: {workflow.agent}")
        self._log(f"Command: {workflow.command}")
        self._log(f"{'=' * 60}\n")

        try:
            # Build OpenCode command
            cmd = [
                self.opencode_path,
                "--agent",
                workflow.agent,
                "run",
                workflow.command,
            ]

            # Execute with streaming output
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=str(self.project_root),
            )

            # Stream stdout
            while True:
                chunk = await process.stdout.read(100)
                if not chunk:
                    break

                text = chunk.decode("utf-8", errors="replace")

                if on_output:
                    on_output(text)
                elif self.verbose:
                    print(text, end="", flush=True)

            await process.wait()
            return process.returncode == 0

        except Exception as e:
            self._log(f"Error running workflow: {e}")
            return False

    async def interact(
        self,
        user_message: str,
        on_output: Callable[[str], None] | None = None,
    ) -> list[InteractionTurn]:
        """
        Process user input and generate agent responses.

        1. Parse user input for commands and mentions
        2. Select relevant agents for the topic
        3. Execute agent responses sequentially
        4. Return interaction turns
        """
        if not self.session:
            return []

        # Parse user input
        parsed = self.parse_user_input(user_message)

        # Handle exit
        if parsed["type"] == "exit":
            return [
                InteractionTurn(
                    agent_id="system",
                    agent_name="System",
                    agent_icon="👋",
                    content="Session ended. Thank you for using BMAD Interactive Mode!",
                )
            ]

        # Handle workflow commands
        if parsed["type"] == "workflow":
            workflow_id = parsed["content"]
            success = await self.run_workflow(workflow_id, on_output)
            status = "completed successfully" if success else "failed"
            return [
                InteractionTurn(
                    agent_id="system",
                    agent_name="System",
                    agent_icon="⚡",
                    content=f"Workflow '{workflow_id}' {status}.",
                )
            ]

        # Handle /agents command
        if parsed["type"] == "command" and parsed["command"] == "/agents":
            agents_list = "\n".join(
                [
                    f"  {a.icon} **{a.display_name}** ({a.id}): {a.title}"
                    for a in self.agents.values()
                ]
            )
            return [
                InteractionTurn(
                    agent_id="system",
                    agent_name="System",
                    agent_icon="🤖",
                    content=f"**Available Agents:**\n\n{agents_list}",
                )
            ]

        # Handle /help command
        if parsed["type"] == "command" and parsed["command"] == "/help":
            help_text = """**Interactive Mode Commands:**

- Type any message to get agent responses
- `/workflow <id>` - Run a BMAD workflow (e.g., `/workflow prd`)
- `/ask <agent> <question>` - Ask a specific agent
- `/agents` - List all available agents
- `/status` - Show current session status
- `/exit` - End session

**Available Workflows:**
- `prd` - Create Product Requirements Document
- `architecture` - Create System Architecture
- `epics` - Create Epics and Stories
- `sprint-planning` - Plan Sprint
- Use `/bmad:bmm:workflows:<name>` for any BMAD workflow
"""
            return [
                InteractionTurn(
                    agent_id="system",
                    agent_name="System",
                    agent_icon="❓",
                    content=help_text,
                )
            ]

        # Add user message to conversation
        user_turn = InteractionTurn(
            agent_id="user",
            agent_name="User",
            agent_icon="👤",
            content=user_message,
            is_user=True,
        )
        self.session.add_turn(user_turn)
        self.session.current_topic = user_message

        # Select relevant agents
        agents = self.select_agents_for_topic(
            user_message,
            user_mentioned_agent=parsed.get("mentioned_agent"),
        )

        # Generate responses from each agent (sequentially)
        turns = []
        conversation_context = self.session.get_context()

        for agent in agents:
            # Generate prompt for this agent
            prompt = self.generate_agent_response_prompt(
                agent=agent,
                topic=user_message,
                conversation_context=conversation_context,
                other_agents=agents,
            )

            # Get agent response
            if on_output:
                on_output(f"\n{agent.icon} **{agent.display_name}**:\n")

            response = await self.run_agent_response(agent, prompt, on_output)

            turn = InteractionTurn(
                agent_id=agent.id,
                agent_name=agent.display_name,
                agent_icon=agent.icon,
                content=response,
            )
            turns.append(turn)
            self.session.add_turn(turn)

            # Update context for next agent
            conversation_context = self.session.get_context()

        return turns

    def get_goodbye_message(self) -> str:
        """Generate goodbye message."""
        if not self.session:
            return "Session ended."

        return """👋 **Session Complete!**

Thank you for using BMAD Interactive Mode!

**Next Steps:**
- Run `bmad-claude workflow prd` to create a PRD
- Run `bmad-claude run` to execute the full BMAD methodology
- Run `bmad-claude status` to check workflow progress

Keep building great products! 🚀
"""


# =============================================================================
# Convenience Functions
# =============================================================================


def create_interactive_session(project_name: str) -> InteractiveOrchestrator:
    """Create a new interactive session."""
    orchestrator = InteractiveOrchestrator()
    orchestrator.create_session(project_name)
    return orchestrator


async def run_interaction(
    orchestrator: InteractiveOrchestrator,
    user_message: str,
) -> list[InteractionTurn]:
    """Run an interaction round."""
    return await orchestrator.interact(user_message)
