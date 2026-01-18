# Project Maturity Detection for Test Strategy

**Version**: 1.0.0
**Purpose**: Dynamically detect project stage and adapt test strategy accordingly

---

## Project Maturity Levels

| Level | Stage | Test Strategy | Coverage Target |
|-------|-------|---------------|-----------------|
| **L1** | Experiment/Spike | Minimal smoke tests | 20-30% |
| **L2** | Pilot/POC | Core happy paths | 40-50% |
| **L3** | MVP | Happy paths + critical edge cases | 60-70% |
| **L4** | Production | Comprehensive test suite | 80-90% |
| **L5** | Enterprise | Full coverage + compliance | 90%+ |

---

## Detection Signals

### L1: Experiment/Spike Indicators

**Strong Signals (weight: 5)**
- README contains: "experiment", "spike", "exploration", "prototype", "throwaway"
- Package.json version: `0.0.x` or `0.1.x`
- No CI/CD configuration present
- Single contributor in git history
- No architecture documents
- No test directory exists

**Weak Signals (weight: 2)**
- Repository age < 7 days
- < 10 commits in history
- No issues/PRs in repository
- "WIP" or "draft" in branch names

**Test Strategy for L1:**
```yaml
focus: smoke-only
tests_to_generate:
  - Basic connectivity test
  - Primary endpoint health check
  - One happy path per feature
coverage_target: 20%
time_investment: minimal (< 1 hour)
```

---

### L2: Pilot/POC Indicators

**Strong Signals (weight: 5)**
- README contains: "pilot", "POC", "proof of concept", "demo", "evaluation"
- Package.json version: `0.x.x` (not 0.0.x)
- Basic CI exists (e.g., GitHub Actions for build only)
- 2-5 contributors
- Sprint/epic documents mention "pilot" or "evaluation"

**Weak Signals (weight: 2)**
- Repository age 7-30 days
- 10-50 commits
- No production environment mentioned
- Limited documentation

**Test Strategy for L2:**
```yaml
focus: happy-paths
tests_to_generate:
  - All primary user journeys
  - Basic API contract tests
  - Authentication flow (if present)
  - One negative case per feature
coverage_target: 50%
time_investment: moderate (2-4 hours)
```

---

### L3: MVP Indicators

**Strong Signals (weight: 5)**
- README contains: "MVP", "minimum viable", "beta", "early access"
- Package.json version: `0.x.x` with x >= 5, or `1.0.0-beta/alpha`
- CI/CD with test stage present
- 3-10 contributors
- Sprint planning documents exist
- Production or staging environment defined

**Weak Signals (weight: 2)**
- Repository age 1-3 months
- 50-200 commits
- Some documentation present
- PRD or requirements documents exist

**Test Strategy for L3:**
```yaml
focus: balanced
tests_to_generate:
  - Full happy path coverage
  - Error handling for critical paths
  - Edge cases for core features
  - API integration tests
  - Performance baseline tests
coverage_target: 70%
time_investment: significant (4-8 hours)
```

---

### L4: Production Indicators

**Strong Signals (weight: 5)**
- Package.json version: `1.x.x` or higher
- CI/CD pipeline with quality gates
- Multiple environments (dev, staging, production)
- 10+ contributors
- Monitoring/observability configured
- Security scanning in place

**Weak Signals (weight: 2)**
- Repository age > 3 months
- 200+ commits
- Documentation comprehensive
- SLA/SLO defined

**Test Strategy for L4:**
```yaml
focus: comprehensive
tests_to_generate:
  - Full feature coverage
  - Exhaustive edge cases
  - Security tests (auth, injection)
  - Performance tests
  - Accessibility tests (if UI)
  - Contract tests (microservices)
coverage_target: 85%
time_investment: substantial (8-16 hours)
```

---

### L5: Enterprise Indicators

**Strong Signals (weight: 5)**
- Compliance requirements (SOC2, HIPAA, PCI)
- Multi-region deployment
- Formal release process
- Change advisory board
- Audit logging required
- 50+ contributors

**Test Strategy for L5:**
```yaml
focus: compliance-driven
tests_to_generate:
  - All L4 tests plus:
  - Compliance verification tests
  - Audit trail validation
  - Data residency tests
  - Disaster recovery tests
  - Chaos engineering
coverage_target: 95%
time_investment: extensive (16+ hours)
```

---

## Detection Algorithm

```yaml
project_maturity_detection:
  step_1_gather_signals:
    - Read README.md for keywords
    - Parse package.json/pyproject.toml version
    - Check for CI/CD configuration
    - Analyze git history (age, commits, contributors)
    - Look for architecture/PRD documents
    - Check for BMAD workflow status
    
  step_2_calculate_score:
    for each maturity_level:
      score = 0
      for signal in detected_signals:
        if signal.type == "strong":
          score += 5
        elif signal.type == "weak":
          score += 2
      maturity_scores[level] = score
      
  step_3_determine_level:
    # Start from highest level and work down
    if maturity_scores[L5] >= 15: return L5
    if maturity_scores[L4] >= 15: return L4
    if maturity_scores[L3] >= 10: return L3
    if maturity_scores[L2] >= 10: return L2
    return L1  # Default to experiment
    
  step_4_adapt_strategy:
    load test_strategy for detected_level
    apply coverage_target
    generate appropriate tests
```

---

## BMAD Workflow Integration

When BMAD workflow artifacts are present, use them to refine detection:

| BMAD Artifact | Indicates | Level Adjustment |
|---------------|-----------|------------------|
| `product-brief.md` only | Early exploration | L1 → L2 |
| `prd.md` present | Requirements defined | L2 → L3 |
| `architecture.md` present | Design complete | L2+ → L3+ |
| `epics/` with stories | Sprint planning active | L3 minimum |
| `sprint-status.yaml` | Active development | L3-L4 |
| Implementation artifacts | Code being written | L3+ |
| CI/CD in workflow status | Pipeline defined | L4 minimum |

---

## Test Strategy Adaptation Examples

### Example 1: Experiment Project Detection

```yaml
signals_detected:
  - README contains "spike" (strong: 5)
  - version: 0.0.1 (strong: 5)
  - no CI/CD (strong: 5)
  - 3 commits (weak: 2)
  - age: 2 days (weak: 2)

total_L1_score: 19
detected_level: L1 (Experiment)

adapted_strategy:
  message: "Detected EXPERIMENT project. Applying minimal test strategy."
  actions:
    - Generate 1-3 smoke tests only
    - Skip fixture architecture
    - Skip factory patterns
    - Create simple test file
    - No coverage requirements
```

### Example 2: MVP Project Detection

```yaml
signals_detected:
  - README contains "MVP" (strong: 5)
  - version: 0.8.0 (strong: 5)
  - GitHub Actions present (strong: 5)
  - prd.md exists (BMAD: +L3)
  - sprint-status.yaml exists (BMAD: +L3)
  - 85 commits (weak: 2)

total_L3_score: 17
detected_level: L3 (MVP)

adapted_strategy:
  message: "Detected MVP project. Applying balanced test strategy."
  actions:
    - Generate happy path tests for all features
    - Include critical edge cases
    - Set up fixture architecture
    - Create data factories
    - Target 70% coverage
```

### Example 3: Production Project Detection

```yaml
signals_detected:
  - version: 2.1.0 (strong: 5)
  - CI/CD with quality gates (strong: 5)
  - staging + production environments (strong: 5)
  - 250+ commits (weak: 2)
  - 15 contributors (strong: 5)
  - monitoring configured (strong: 5)

total_L4_score: 27
detected_level: L4 (Production)

adapted_strategy:
  message: "Detected PRODUCTION project. Applying comprehensive test strategy."
  actions:
    - Full test coverage for all features
    - Exhaustive edge case coverage
    - Performance test suite
    - Security test scenarios
    - Contract tests for APIs
    - Target 85% coverage
```

---

## Output Format

When maturity detection completes, output:

```markdown
## Project Maturity Detection Results

**Detected Level**: L3 (MVP)
**Confidence**: 85%

**Signals Identified**:
- ✅ README mentions "MVP" (strong)
- ✅ Version 0.8.0 indicates pre-release (strong)
- ✅ CI/CD pipeline present (strong)
- ✅ BMAD sprint-status.yaml found (BMAD indicator)
- ⚠️ No production environment defined yet

**Test Strategy Applied**:
- Focus: Balanced (happy paths + critical edge cases)
- Coverage Target: 70%
- Time Investment: 4-8 hours
- Fixtures: Full architecture
- Factories: Data factories with cleanup

**Recommendations**:
1. Generate happy path tests for Stories 1.1-1.5
2. Add error handling tests for API endpoints
3. Create integration tests for storage layer
4. Skip performance tests until L4
```

---

## Configuration Override

Users can override detected maturity in `config.yaml`:

```yaml
# In _bmad/bmm/config.yaml
project_maturity:
  override: L4  # Force production-level testing
  # or
  auto_detect: true  # Use detection algorithm (default)
```

---

## Integration with TEA Workflows

All TEA workflows should:

1. **TF/TF-P (Framework)**: Use maturity level to determine scaffold complexity
2. **TD (Test Design)**: Adjust scenario depth based on level
3. **AT (ATDD)**: Generate appropriate test count for level
4. **TA (Test Automate)**: Apply coverage targets from level
5. **CI (CI Scaffold)**: Configure quality gates for level

This ensures test investment matches project maturity.
