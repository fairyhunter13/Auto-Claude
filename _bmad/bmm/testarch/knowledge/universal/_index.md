# Universal Testing Concepts

This folder contains **language-agnostic** testing concepts that apply across all programming languages and test frameworks.

## Purpose

These knowledge fragments define the foundational testing principles, risk frameworks, and quality criteria that TEA workflows use regardless of the detected project language.

## Contents

| Fragment | Description | Always Load |
|----------|-------------|-------------|
| `test-levels-framework.md` | Unit/Integration/E2E selection guidelines | Yes |
| `test-priorities-matrix.md` | P0-P3 risk-based prioritization | Yes |
| `risk-governance.md` | Risk scoring and gate decisions | Yes |
| `probability-impact.md` | Risk assessment scales | Yes |
| `nfr-criteria.md` | Non-functional requirements criteria | On demand |
| `test-design-principles.md` | Universal test design patterns | Yes |
| `quality-gates.md` | Go/no-go decision framework | On demand |
| `ci-cd-patterns.md` | Generic CI/CD integration patterns | On demand |
| `universal-fallback.md` | Tier 4 fallback for unknown languages | On demand |

## Usage in TEA Workflows

TEA workflows should **always load** these universal fragments before loading language-specific strategies:

```markdown
## Knowledge Loading Sequence

1. Load universal fragments (always):
   - universal/test-levels-framework.md
   - universal/test-priorities-matrix.md
   - universal/test-design-principles.md

2. Detect project language(s)

3. Load language-specific strategy:
   - languages/{detected_language}/_strategy.md

4. Load framework-specific patterns:
   - As directed by the strategy file
```

## Fragment References

The following fragments from the parent `knowledge/` folder are considered **universal** and may be referenced directly:

- `../test-levels-framework.md` - Test level selection
- `../test-priorities-matrix.md` - Priority matrix
- `../risk-governance.md` - Risk management
- `../probability-impact.md` - Risk scales
- `../nfr-criteria.md` - NFR assessment
- `../test-quality.md` - Quality principles (partially universal)
- `../selective-testing.md` - Risk-based test selection
- `../contract-testing.md` - Contract testing concepts

## Design Principles

### 1. Language Independence
Universal fragments must NOT contain:
- Language-specific syntax examples
- Framework-specific configurations
- Tool-specific commands

### 2. Concept Focus
Universal fragments should contain:
- Conceptual frameworks (e.g., test pyramid)
- Decision criteria (e.g., when to use E2E vs unit)
- Risk assessment methodologies
- Quality metrics definitions

### 3. Reference Pattern
When a concept has both universal and language-specific aspects:
- Universal fragment: Explains the concept and decision criteria
- Language fragment: Provides implementation examples

Example:
- `universal/test-design-principles.md` - "Tests should be deterministic"
- `languages/typescript/playwright-patterns.md` - "Use `await expect()` not `setTimeout()`"
