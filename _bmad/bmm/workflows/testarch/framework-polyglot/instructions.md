# Test Framework Setup (Polyglot)

**Workflow ID**: `_bmad/bmm/testarch/framework-polyglot`
**Version**: 1.0.0 (Language-Agnostic)

---

## Overview

Initialize a production-ready test framework architecture with **automatic language detection** for polyglot/multi-language projects. This workflow:

1. Detects all programming languages in the project
2. Loads appropriate testing strategies for each language
3. Scaffolds test infrastructure per component
4. Generates unified documentation

---

## Step 0: Load Detection Rules

### Actions

1. **Load Detection Rules**
   - Read `{detection_rules}` (languages/_detection-rules.yaml)
   - Parse language indicators, priorities, and framework mappings
   - Store rules in session for use in Step 1

2. **Load Universal Knowledge**
   - Read `{universal_knowledge}/_index.md`
   - Load `{universal_knowledge}/test-design-principles.md`
   - These apply to ALL languages detected

---

## Step 1: Detect Project Languages

### Actions

1. **Scan Project Root**
   
   For each language in detection_rules (ordered by priority):
   
   ```
   FOR language IN detection_rules (sorted by priority ASC):
     FOR indicator IN language.indicators.required OR required_any:
       IF indicator matches in {project-root}:
         ADD to detected_languages with path and confidence
   ```

2. **Scan Subdirectories (Monorepo Support)**
   
   Check common monorepo patterns:
   - `apps/*` - Application directories
   - `packages/*` - Package directories
   - `services/*` - Service directories
   - `libs/*` - Library directories
   
   For each subdirectory with a language indicator:
   ```
   detected_components.push({
     path: subdirectory_path,
     language: detected_language,
     confidence: detection_confidence
   })
   ```

3. **Apply Exclusions**
   
   Remove from detection:
   - Paths matching `global_exclusions` from detection rules
   - Paths matching `exclude_paths` from workflow variables
   - `node_modules`, `vendor`, `.venv`, etc.

4. **Handle Ambiguous Detection**
   
   If a path has multiple language indicators (e.g., `go.mod` + `package.json`):
   - Use priority order (lower priority number wins)
   - Check for `language_overrides` in config
   - If still ambiguous, ASK user:
   
   ```
   "I detected multiple languages in '{path}':
   - Go (go.mod found)
   - TypeScript (package.json with typescript)
   
   Which is the PRIMARY language for this component?
   [1] Go
   [2] TypeScript
   [3] Both (treat as separate test suites)"
   ```

5. **Present Detection Results**
   
   ```markdown
   ## Language Detection Results
   
   **Project Root:** {project-root}
   **Detection Mode:** {detection_mode}
   
   ### Detected Components
   
   | Path | Language | Test Framework | Confidence |
   |------|----------|----------------|------------|
   | / | TypeScript | Playwright | 95% |
   | /apps/api | Go | go test | 100% |
   | /services/ml | Python | pytest | 100% |
   
   ### Excluded Paths
   - node_modules/
   - vendor/
   - dist/
   
   **Continue with these detections? [Y/n/edit]**
   ```

---

## Step 2: Load Language Strategies

### Actions

For each unique language in `detected_components`:

1. **Load Strategy File**
   - Read `{language_strategies}/{language}/_strategy.md`
   - Parse recommended frameworks, knowledge fragments, config templates

2. **Determine Framework Selection**
   
   For each component:
   ```
   IF existing framework config found (e.g., playwright.config.ts):
     USE existing framework
   ELSE IF framework_preference is set:
     USE specified framework
   ELSE:
     USE strategy.test_framework_default
     CONSIDER strategy.framework_selection_logic
   ```

3. **Load Required Knowledge Fragments**
   
   From each strategy's `knowledge_fragments` list:
   ```
   loaded_knowledge = []
   
   FOR fragment IN strategy.knowledge_fragments:
     IF fragment.condition is met OR no condition:
       LOAD fragment file
       ADD to loaded_knowledge
   ```

4. **Present Strategy Summary**
   
   ```markdown
   ## Testing Strategy Summary
   
   ### TypeScript (apps/frontend, packages/ui)
   - **Framework:** Playwright
   - **Unit Tests:** Vitest
   - **Knowledge Loaded:** 
     - fixture-architecture.md
     - network-first.md
     - playwright-config.md
   
   ### Go (services/api)
   - **Framework:** go test + testify
   - **Knowledge Loaded:**
     - go-testing-patterns.md
     - table-driven-tests.md
     - testify-patterns.md
   
   ### Python (services/ml)
   - **Framework:** pytest
   - **Knowledge Loaded:**
     - pytest-patterns.md
     - pytest-fixtures.md
   
   **Proceed with framework scaffold? [Y/n]**
   ```

---

## Step 3: Scaffold Test Infrastructure

### Actions

For each component in `detected_components`:

1. **Create Directory Structure**
   
   Use the directory structure from the component's strategy file.
   
   **TypeScript Example:**
   ```
   {component_path}/
   └── tests/
       ├── e2e/
       ├── support/
       │   ├── fixtures/
       │   └── helpers/
       └── README.md
   ```
   
   **Go Example:**
   ```
   {component_path}/
   ├── internal/
   │   └── *_test.go (alongside code)
   └── test/
       └── integration/
   ```
   
   **Python Example:**
   ```
   {component_path}/
   └── tests/
       ├── conftest.py
       ├── unit/
       └── integration/
   ```

2. **Generate Configuration Files**
   
   Use templates from strategy file's "Configuration Templates" section.
   
   - TypeScript: `playwright.config.ts`, `vitest.config.ts`
   - Go: Update `Makefile` with test targets
   - Python: `pyproject.toml` with pytest config

3. **Generate Environment Configuration**
   
   Create `.env.example` with common test variables:
   ```
   TEST_ENV=local
   BASE_URL=http://localhost:3000
   ```

4. **Generate Sample Tests (if enabled)**
   
   Create one example test per component using the strategy's test example pattern.

---

## Step 4: Generate Unified Documentation

### Actions

1. **Create Root Test README**
   
   At `{project-root}/tests/README.md` or `{project-root}/TESTING.md`:
   
   ```markdown
   # Testing Guide
   
   This project uses multiple testing frameworks across different components.
   
   ## Quick Start
   
   | Component | Language | Run Tests | Run Coverage |
   |-----------|----------|-----------|--------------|
   | Frontend | TypeScript | `npm run test:e2e` | `npm run test:coverage` |
   | API | Go | `go test ./...` | `go test -cover ./...` |
   | ML Service | Python | `pytest` | `pytest --cov` |
   
   ## Component Details
   
   ### Frontend (apps/frontend)
   [Link to component-specific testing docs]
   
   ### API Service (services/api)
   [Link to component-specific testing docs]
   
   ## CI/CD Integration
   [Details about how tests run in CI]
   ```

2. **Create Component READMEs**
   
   For each component, create `tests/README.md` with:
   - Setup instructions specific to that language
   - Common commands
   - Architecture overview
   - Links to knowledge fragments used

---

## Step 5: Generate CI Configuration (if enabled)

### Actions

If `generate_ci_config: true`:

1. **Detect CI Platform**
   - Check for `.github/workflows/` → GitHub Actions
   - Check for `.gitlab-ci.yml` → GitLab CI
   - Check for `Jenkinsfile` → Jenkins
   - If none found, default to GitHub Actions

2. **Generate Multi-Language CI Config**
   
   **GitHub Actions Example:**
   ```yaml
   name: Tests
   on: [push, pull_request]
   
   jobs:
     typescript-tests:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: apps/frontend
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-node@v4
         - run: npm ci
         - run: npm test
         - run: npx playwright install --with-deps
         - run: npm run test:e2e
     
     go-tests:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: services/api
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-go@v5
         - run: go test -race -cover ./...
     
     python-tests:
       runs-on: ubuntu-latest
       defaults:
         run:
           working-directory: services/ml
       steps:
         - uses: actions/checkout@v4
         - uses: actions/setup-python@v5
         - run: pip install -e ".[dev]"
         - run: pytest --cov
   ```

---

## Step 6: Summary and Next Steps

### Actions

1. **Present Completion Summary**
   
   ```markdown
   ## Framework Scaffold Complete
   
   ### Languages Detected and Configured
   
   | Language | Components | Framework | Config File |
   |----------|------------|-----------|-------------|
   | TypeScript | 2 | Playwright | playwright.config.ts |
   | Go | 1 | go test | Makefile |
   | Python | 1 | pytest | pyproject.toml |
   
   ### Artifacts Created
   
   **TypeScript (apps/frontend):**
   - ✅ tests/e2e/ directory
   - ✅ tests/support/fixtures/index.ts
   - ✅ playwright.config.ts
   - ✅ tests/README.md
   
   **Go (services/api):**
   - ✅ Makefile test targets
   - ✅ test/integration/ directory
   - ✅ tests/README.md
   
   **Python (services/ml):**
   - ✅ tests/ directory structure
   - ✅ tests/conftest.py
   - ✅ pyproject.toml [tool.pytest]
   - ✅ tests/README.md
   
   **Project-Wide:**
   - ✅ TESTING.md (root documentation)
   - ✅ .github/workflows/test.yml (CI config)
   
   ### Next Steps
   
   1. Review generated configuration files
   2. Install test dependencies per component
   3. Run sample tests to verify setup
   4. Customize fixtures and helpers for your domain
   
   ### Knowledge Fragments Applied
   
   - universal/test-design-principles.md
   - universal/test-levels-framework.md
   - languages/typescript/_strategy.md
   - languages/go/_strategy.md
   - languages/python/_strategy.md
   ```

2. **Offer Follow-up Workflows**
   
   ```
   Would you like to:
   [A] Run ATDD workflow to generate acceptance tests
   [T] Run test-review on existing tests
   [N] Done for now
   ```

---

## Validation

After completing all steps, verify:

- [ ] All languages detected correctly
- [ ] Configuration files created per component
- [ ] Directory structures match language conventions
- [ ] Sample tests run successfully
- [ ] Documentation is accurate
- [ ] CI config (if generated) is valid

Refer to `checklist.md` for comprehensive validation criteria.

---

## Troubleshooting

### Detection Issues

**"Language not detected"**
- Check if indicator files exist (e.g., `go.mod`, `package.json`)
- Verify files are not in excluded paths
- Use `language_overrides` in config for manual specification

**"Wrong language detected"**
- Check priority order in detection rules
- Use `language_overrides` to force correct language
- Report edge case for detection rules improvement

### Framework Selection Issues

**"Wrong framework selected"**
- Check for existing config files that might influence selection
- Use `framework_preference` in workflow variables
- Review strategy file's selection logic

---

## Related Workflows

- `framework` - Original TypeScript-focused workflow (backup)
- `atdd-polyglot` - Generate acceptance tests for polyglot projects
- `automate-polyglot` - Expand test coverage for polyglot projects
