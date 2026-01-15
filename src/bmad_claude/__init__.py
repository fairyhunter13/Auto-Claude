"""
BMAD-Claude: Autonomous BMAD Workflow Orchestration System

Combines BMAD's expert methodology with autonomous execution capabilities.
"""

__version__ = "0.1.0"
__author__ = "Hafiz"

from bmad_claude.engine.models import WorkflowConfig, StepConfig, WorkflowState
from bmad_claude.persona.models import AgentPersona

__all__ = [
    "WorkflowConfig",
    "StepConfig",
    "WorkflowState",
    "AgentPersona",
]
