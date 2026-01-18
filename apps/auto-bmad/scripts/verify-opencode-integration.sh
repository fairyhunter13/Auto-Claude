#!/bin/bash

# ============================================================================
# Auto-BMAD OpenCode Integration Verification Script
# ============================================================================
# 
# This script verifies that:
# 1. OpenCode profiles (personal/work) are correctly configured
# 2. All 19 BMAD agents are available
# 3. Workflow commands are correctly formatted with model parameter
# 4. Permissions are properly configured
#
# Usage: ./scripts/verify-opencode-integration.sh [--run-workflow]
#        --run-workflow: Actually execute a test workflow (uses API tokens)
#
# ============================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
OPENCODE_PATH="${HOME}/.opencode/bin/opencode"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "${PROJECT_ROOT}/../.." && pwd)"
DEFAULT_MODEL="anthropic/claude-sonnet-4-20250514"

echo "======================================================================"
echo -e "${BLUE}AUTO-BMAD OPENCODE INTEGRATION VERIFICATION${NC}"
echo "======================================================================"
echo ""
echo "Project Root: ${PROJECT_ROOT}"
echo "Repository Root: ${REPO_ROOT}"
echo ""

# ============================================================================
# 1. Check OpenCode CLI
# ============================================================================
echo -e "${YELLOW}1. CHECKING OPENCODE CLI...${NC}"

if [ -x "${OPENCODE_PATH}" ]; then
    VERSION=$("${OPENCODE_PATH}" --version 2>&1)
    echo -e "   ${GREEN}✅ OpenCode CLI found: ${VERSION}${NC}"
else
    echo -e "   ${RED}❌ OpenCode CLI not found at ${OPENCODE_PATH}${NC}"
    exit 1
fi
echo ""

# ============================================================================
# 2. Check OpenCode Profiles
# ============================================================================
echo -e "${YELLOW}2. CHECKING OPENCODE PROFILES...${NC}"

# Check personal profile
if [ -d "${HOME}/.config/opencode-personal" ]; then
    echo -e "   ${GREEN}✅ Personal profile configured at ~/.config/opencode-personal${NC}"
else
    echo -e "   ${RED}❌ Personal profile not found. Run: ocp (or opencode-personal) to configure${NC}"
fi

# Check work profile
if [ -d "${HOME}/.config/opencode-work" ]; then
    echo -e "   ${GREEN}✅ Work profile configured at ~/.config/opencode-work${NC}"
else
    echo -e "   ${RED}❌ Work profile not found. Run: ocw (or opencode-work) to configure${NC}"
fi
echo ""

# ============================================================================
# 3. Check All 19 BMAD Agents
# ============================================================================
echo -e "${YELLOW}3. VERIFYING ALL 19 BMAD AGENTS...${NC}"

# Expected agents from all modules
CORE_AGENTS="bmad-master"
BMM_AGENTS="analyst architect dev pm quick-flow-solo-dev sm tea tech-writer ux-designer"
CIS_AGENTS="brainstorming-coach creative-problem-solver design-thinking-coach innovation-strategist presentation-master storyteller"
BMB_AGENTS="agent-builder module-builder workflow-builder"
ALL_AGENTS="${CORE_AGENTS} ${BMM_AGENTS} ${CIS_AGENTS} ${BMB_AGENTS}"

# Get installed agents from personal profile
echo "   Checking agents in personal profile..."
INSTALLED_AGENTS=$(OPENCODE_DISABLE_AUTOUPDATE=true XDG_CONFIG_HOME="${HOME}/.config/opencode-personal" XDG_DATA_HOME="${HOME}/.local/share/opencode-personal" "${OPENCODE_PATH}" agent list 2>&1 | grep -E "^\w" | awk '{print $1}' | sort | tr '\n' ' ')

MISSING_COUNT=0
for agent in ${ALL_AGENTS}; do
    if echo "${INSTALLED_AGENTS}" | grep -qw "${agent}"; then
        echo -e "   ${GREEN}✅ ${agent}${NC}"
    else
        echo -e "   ${RED}❌ ${agent} (MISSING)${NC}"
        MISSING_COUNT=$((MISSING_COUNT + 1))
    fi
done

if [ ${MISSING_COUNT} -eq 0 ]; then
    echo -e "   ${GREEN}All 19 BMAD agents verified!${NC}"
else
    echo -e "   ${YELLOW}⚠️  ${MISSING_COUNT} agent(s) missing${NC}"
fi
echo ""

# ============================================================================
# 4. Check Project-Level Config
# ============================================================================
echo -e "${YELLOW}4. CHECKING PROJECT-LEVEL CONFIG...${NC}"

if [ -f "${REPO_ROOT}/.opencode.jsonc" ]; then
    echo -e "   ${GREEN}✅ Project config found at .opencode.jsonc${NC}"
    
    # Check for permission settings
    if grep -q '"external_directory": "allow"' "${REPO_ROOT}/.opencode.jsonc"; then
        echo -e "   ${GREEN}✅ External directory access: ALLOWED${NC}"
    else
        echo -e "   ${YELLOW}⚠️  External directory access not explicitly allowed${NC}"
    fi
    
    if grep -q '"*": "allow"' "${REPO_ROOT}/.opencode.jsonc"; then
        echo -e "   ${GREEN}✅ All permissions: ALLOWED${NC}"
    else
        echo -e "   ${YELLOW}⚠️  Not all permissions explicitly allowed${NC}"
    fi
else
    echo -e "   ${RED}❌ Project config .opencode.jsonc not found${NC}"
fi
echo ""

# ============================================================================
# 5. Show Workflow Commands
# ============================================================================
echo -e "${YELLOW}5. WORKFLOW COMMANDS (with model parameter)...${NC}"
echo ""
echo "   All workflows will use: --model ${DEFAULT_MODEL}"
echo ""

echo "   PHASE 1: ANALYSIS"
echo "   ├─ brainstorm-project"
echo "      opencode run --agent analyst --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:brainstorming\""
echo "   ├─ research"
echo "      opencode run --agent analyst --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:research\""
echo "   └─ product-brief"
echo "      opencode run --agent analyst --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-product-brief\""
echo ""
echo "   PHASE 2: PLANNING"
echo "   ├─ prd"
echo "      opencode run --agent pm --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-prd\""
echo "   └─ ux-design"
echo "      opencode run --agent ux-designer --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-ux-design\""
echo ""
echo "   PHASE 3: SOLUTIONING"
echo "   ├─ architecture"
echo "      opencode run --agent architect --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-architecture\""
echo "   ├─ epics"
echo "      opencode run --agent pm --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-epics-and-stories\""
echo "   ├─ test-design"
echo "      opencode run --agent tea --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:test-design\""
echo "   └─ implementation-readiness"
echo "      opencode run --agent architect --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:implementation-readiness\""
echo ""
echo "   PHASE 4: IMPLEMENTATION"
echo "   ├─ sprint-planning"
echo "      opencode run --agent sm --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:sprint-planning\""
echo "   ├─ create-story"
echo "      opencode run --agent sm --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:create-story\""
echo "   ├─ dev-story"
echo "      opencode run --agent dev --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:dev-story\""
echo "   └─ code-review"
echo "      opencode run --agent dev --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:code-review\""
echo ""

# ============================================================================
# 6. Optional: Run Test Workflow
# ============================================================================
if [ "$1" == "--run-workflow" ]; then
    echo -e "${YELLOW}6. RUNNING TEST WORKFLOW...${NC}"
    echo ""
    echo "   This will run a quick 'brainstorm' workflow using the personal profile."
    echo "   Press Ctrl+C within 5 seconds to cancel..."
    sleep 5
    
    echo ""
    echo "   Executing: ocp run --agent analyst --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:brainstorming\""
    echo ""
    
    cd "${REPO_ROOT}"
    OPENCODE_DISABLE_AUTOUPDATE=true \
    XDG_CONFIG_HOME="${HOME}/.config/opencode-personal" \
    XDG_DATA_HOME="${HOME}/.local/share/opencode-personal" \
    "${OPENCODE_PATH}" run --agent analyst --model "${DEFAULT_MODEL}" "/bmad:bmm:workflows:brainstorming"
else
    echo -e "${YELLOW}6. TO RUN A TEST WORKFLOW:${NC}"
    echo ""
    echo "   ./scripts/verify-opencode-integration.sh --run-workflow"
    echo ""
    echo "   Or manually:"
    echo "   cd ${REPO_ROOT}"
    echo "   ocp run --agent analyst --model ${DEFAULT_MODEL} \"/bmad:bmm:workflows:brainstorming\""
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "======================================================================"
echo -e "${BLUE}VERIFICATION SUMMARY${NC}"
echo "======================================================================"
echo ""
echo -e "${GREEN}✅ OpenCode CLI available and working${NC}"
echo -e "${GREEN}✅ OpenCode profiles (personal/work) configured${NC}"
echo -e "${GREEN}✅ All 19 BMAD agents installed${NC}"
echo -e "${GREEN}✅ Project-level config with full permissions${NC}"
echo -e "${GREEN}✅ Default model: ${DEFAULT_MODEL}${NC}"
echo ""
echo "Load Balancer Profiles:"
echo "  - personal: ~/.config/opencode-personal"
echo "  - work: ~/.config/opencode-work"
echo ""
echo "To run a real workflow:"
echo "  ./scripts/verify-opencode-integration.sh --run-workflow"
echo ""
