# BMAD-Claude

**Autonomous BMAD Workflow Orchestration System**

BMAD-Claude combines BMAD's expert software development methodology with autonomous execution capabilities, enabling AI-driven development without manual workflow driving.

## Features

- 🤖 **Autonomous Execution** - Drives BMAD workflows without manual intervention
- 👥 **Persona-Driven** - 20 specialized agent personas for different development phases
- 🔄 **Workflow Orchestration** - Automatic workflow selection, transitions, and state management
- 💾 **State Persistence** - Resume interrupted workflows seamlessly
- 📊 **Progress Tracking** - Real-time visibility into workflow execution

## Installation

```bash
# From the repository root
cd src/bmad_claude
pip install -e .
```

## Quick Start

### Initialize a Project

```bash
bmad-claude init "My Awesome App"
```

### Run a Workflow

```bash
# Run PRD workflow
bmad-claude run prd -p "My App" -d "A task management application"

# Run Architecture workflow
bmad-claude run create-architecture

# Run PRD-to-Architecture chain
bmad-claude run prd-to-arch -p "My App"
```

### Check Status

```bash
# Check all workflows
bmad-claude status

# Check specific workflow
bmad-claude status prd
```

### Resume Interrupted Workflow

```bash
bmad-claude resume prd
```

### List Available Workflows

```bash
bmad-claude list-workflows
```

### List Agent Personas

```bash
bmad-claude list-agents
```

## Architecture

```
BMAD-Claude System
├── User Interface Layer (CLI)
├── Orchestration Layer
│   ├── Workflow Engine (parser, executor, state)
│   ├── Persona System (loader, injector)
│   └── Output Manager
├── Execution Layer (OpenCode SDK)
├── Persistence Layer (files, Graphiti)
└── Methodology Layer (BMAD workflows & agents)
```

## Supported Workflows (POC)

| Workflow | Agent | Description |
|----------|-------|-------------|
| prd | PM (John) | Create Product Requirements Document |
| create-architecture | Architect (Winston) | Create System Architecture |
| prd-to-arch | PM → Architect | Full PRD-to-Architecture chain |

## Configuration

Configuration is stored in `.bmad-claude/config.yaml`:

```yaml
version: 1

user:
  name: "Developer"
  skill_level: "intermediate"

llm:
  provider: "anthropic"
  model: "claude-sonnet-4"
  api_key_env: "ANTHROPIC_API_KEY"

workflow:
  auto_approve_checkpoints: true
  max_retries: 3
  timeout_minutes: 30
```

## Development

```bash
# Install dev dependencies
pip install -e ".[dev]"

# Run tests
pytest

# Type checking
mypy bmad_claude

# Linting
ruff check bmad_claude
```

## License

MIT
