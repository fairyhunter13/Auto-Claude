#!/bin/bash
#
# COMPREHENSIVE BMAD WORKFLOW TEST RUNNER
#
# Runs all BMAD workflow tests with OpenCode integration.
# This script provides various options for running tests.
#
# Usage:
#   ./run-comprehensive-tests.sh           # Run all tests
#   ./run-comprehensive-tests.sh --unit    # Run only unit tests
#   ./run-comprehensive-tests.sh --e2e     # Run only E2E tests
#   ./run-comprehensive-tests.sh --phase 2 # Run specific phase tests
#   ./run-comprehensive-tests.sh --quick   # Quick smoke test
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}"
echo "═══════════════════════════════════════════════════════════════════════════"
echo "  COMPREHENSIVE BMAD WORKFLOW TEST SUITE"
echo "  Auto-BMAD E2E Testing with OpenCode Integration"
echo "═══════════════════════════════════════════════════════════════════════════"
echo -e "${NC}"

# Check OpenCode availability
check_opencode() {
    echo -e "${YELLOW}Checking OpenCode CLI availability...${NC}"
    
    if command -v opencode &> /dev/null; then
        VERSION=$(opencode --version 2>/dev/null || echo "unknown")
        echo -e "${GREEN}✓ OpenCode found: $VERSION${NC}"
        return 0
    else
        echo -e "${RED}✗ OpenCode CLI not found in PATH${NC}"
        echo -e "${YELLOW}  Install OpenCode or add it to your PATH to run workflow tests${NC}"
        echo -e "${YELLOW}  Unit tests will still run${NC}"
        return 1
    fi
}

# Run unit tests
run_unit_tests() {
    echo ""
    echo -e "${BLUE}═══ RUNNING UNIT TESTS ═══${NC}"
    echo ""
    
    cd "$APP_DIR"
    npm run test -- --run src/main/bmad/__tests__/bmad-modules.test.ts
    
    echo -e "${GREEN}✓ Unit tests completed${NC}"
}

# Run E2E tests
run_e2e_tests() {
    echo ""
    echo -e "${BLUE}═══ RUNNING E2E TESTS ═══${NC}"
    echo ""
    
    cd "$APP_DIR"
    npx playwright test --config=e2e/playwright.config.ts opencode-workflow-comprehensive.e2e.ts
    
    echo -e "${GREEN}✓ E2E tests completed${NC}"
}

# Run specific phase tests
run_phase_tests() {
    local phase=$1
    echo ""
    echo -e "${BLUE}═══ RUNNING PHASE $phase TESTS ═══${NC}"
    echo ""
    
    cd "$APP_DIR"
    npx playwright test --config=e2e/playwright.config.ts --grep="Phase $phase" opencode-workflow-comprehensive.e2e.ts
    
    echo -e "${GREEN}✓ Phase $phase tests completed${NC}"
}

# Run quick smoke test
run_quick_test() {
    echo ""
    echo -e "${BLUE}═══ RUNNING QUICK SMOKE TEST ═══${NC}"
    echo ""
    
    cd "$APP_DIR"
    
    # Run only OpenCode availability test
    npx playwright test --config=e2e/playwright.config.ts --grep="OpenCode CLI Availability" opencode-workflow-comprehensive.e2e.ts
    
    echo -e "${GREEN}✓ Quick smoke test completed${NC}"
}

# Run all tests
run_all_tests() {
    local opencode_available=false
    
    if check_opencode; then
        opencode_available=true
    fi
    
    echo ""
    echo -e "${BLUE}Starting comprehensive test suite...${NC}"
    
    # Always run unit tests
    run_unit_tests
    
    # Run E2E tests if OpenCode is available
    if [ "$opencode_available" = true ]; then
        run_e2e_tests
    else
        echo ""
        echo -e "${YELLOW}⚠️  Skipping E2E workflow tests (OpenCode not available)${NC}"
    fi
}

# Print usage
print_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --unit         Run only unit tests"
    echo "  --e2e          Run only E2E tests"
    echo "  --phase N      Run tests for specific phase (1-4)"
    echo "  --quick        Run quick smoke test"
    echo "  --help         Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                    # Run all tests"
    echo "  $0 --unit             # Run unit tests only"
    echo "  $0 --e2e              # Run E2E tests only"
    echo "  $0 --phase 2          # Run Phase 2 (Planning) tests"
    echo "  $0 --quick            # Quick availability check"
}

# Parse arguments
case "${1:-}" in
    --unit)
        run_unit_tests
        ;;
    --e2e)
        check_opencode || exit 1
        run_e2e_tests
        ;;
    --phase)
        if [ -z "${2:-}" ]; then
            echo -e "${RED}Error: --phase requires a phase number (1-4)${NC}"
            exit 1
        fi
        check_opencode || exit 1
        run_phase_tests "$2"
        ;;
    --quick)
        run_quick_test
        ;;
    --help)
        print_usage
        ;;
    "")
        run_all_tests
        ;;
    *)
        echo -e "${RED}Unknown option: $1${NC}"
        print_usage
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  TEST RUN COMPLETE${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════════════════${NC}"
