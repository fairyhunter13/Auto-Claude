# Universal Fallback Testing Strategy

> **Tier 4** - Applied when language is completely unknown and all other tiers fail.

## When This Strategy Applies

This universal fallback is used when:
1. Language is not in the detection rules (Tier 1 miss)
2. No language family could be inferred (Tier 2 miss)
3. Discovery mode failed or was skipped (Tier 3 miss)
4. User explicitly chose universal fallback

**Confidence Level**: MINIMAL - These are safe, generic patterns that work for any language but may not be optimal.

---

## Universal Testing Principles

These principles apply to ALL programming languages:

### 1. Test Organization

**Directory Structure** (choose one):
```
# Option A: Separate test directory
project/
├── src/           # Source code
└── tests/         # All tests
    ├── unit/
    ├── integration/
    └── e2e/

# Option B: Co-located tests
project/
└── src/
    └── module/
        ├── feature.{ext}
        └── feature.test.{ext}  # or test_feature.{ext}
```

**File Naming Patterns** (common across languages):
| Pattern | Example | Common In |
|---------|---------|-----------|
| `test_*` | `test_user.py` | Python, Go |
| `*_test` | `user_test.go` | Go, Rust |
| `*.test.*` | `user.test.ts` | JavaScript/TypeScript |
| `*.spec.*` | `user.spec.js` | JavaScript BDD |
| `*Test.*` | `UserTest.java` | Java, C# |
| `*_spec.*` | `user_spec.rb` | Ruby |

### 2. Test Structure

**Arrange-Act-Assert (AAA)** - Universal pattern:
```
test function_name_scenario_expected:
    # ARRANGE - Set up test preconditions
    input = create_test_input()
    system = create_system_under_test()
    
    # ACT - Execute the behavior being tested
    result = system.perform_action(input)
    
    # ASSERT - Verify the outcome
    assert result equals expected_value
    assert system.state equals expected_state
```

**Given-When-Then (BDD)** - Alternative:
```
test "user registration":
    # GIVEN - Initial context
    given a new user with email "test@example.com"
    
    # WHEN - Action occurs
    when the user submits registration
    
    # THEN - Expected outcome
    then the user should be created
    and a confirmation email should be sent
```

### 3. Test Categories

| Level | Scope | Dependencies | Speed |
|-------|-------|--------------|-------|
| **Unit** | Single function/method | Mocked | <100ms |
| **Integration** | Multiple components | Some real | <1s |
| **E2E** | Full system | All real | >1s |

**Recommended Distribution**:
```
        ┌─────────────┐
        │   E2E: 10%  │
       ─┼─────────────┼─
       │Integration:20%│
      ─┼───────────────┼─
      │   Unit: 70%    │
     ─┴─────────────────┴─
```

### 4. Test Naming

**Pattern**: `test_[unit]_[scenario]_[expected]`

Examples:
```
test_calculateTotal_withEmptyCart_returnsZero
test_login_withInvalidPassword_throwsAuthError
test_parseDate_withIsoFormat_returnsCorrectDate
test_sendEmail_whenServerDown_retriesThreeTimes
```

### 5. Assertions

**Common Assertion Types** (exist in all frameworks):
| Type | Description | Example |
|------|-------------|---------|
| Equality | Values match | `assertEqual(a, b)` |
| Boolean | True/False | `assertTrue(cond)` |
| Null/Nil | Null check | `assertNotNull(obj)` |
| Exception | Error thrown | `assertThrows(fn)` |
| Contains | Has element | `assertContains(list, item)` |
| Type | Type check | `assertInstanceOf(obj, Type)` |

### 6. Test Isolation

**Each test must be independent**:
```
# GOOD: Test is self-contained
test isolated_test:
    data = create_fresh_data()
    result = operation(data)
    assert result is correct

# BAD: Test depends on global state
shared_data = None  # Dangerous!

test dependent_test_1:
    shared_data = create_data()
    
test dependent_test_2:
    # Fails if test_1 didn't run first!
    assert shared_data is not None
```

### 7. Test Fixtures

**Setup/Teardown Pattern**:
```
before_all:
    # Run once before all tests
    initialize_database()

before_each:
    # Run before each test
    clear_test_data()
    seed_default_data()

test my_test:
    # Test runs here
    ...

after_each:
    # Run after each test
    rollback_transaction()

after_all:
    # Run once after all tests
    destroy_database()
```

### 8. Mocking

**Universal Mocking Concepts**:
```
# Create mock object
mock_service = create_mock(ExternalService)

# Define behavior
when(mock_service.fetch_data()).return(test_data)

# Inject mock
system = System(service=mock_service)

# Execute test
result = system.process()

# Verify interaction
verify(mock_service.fetch_data).was_called_once()
```

---

## Finding Tests in Unknown Languages

### Step 1: Search for Test Files

```bash
# Find files with "test" in name
find . -name "*test*" -type f

# Find files with "spec" in name
find . -name "*spec*" -type f

# Find test directories
find . -type d -name "test*"
find . -type d -name "*test"
find . -type d -name "spec*"
```

### Step 2: Search for Test Content

```bash
# Find files containing assertion keywords
grep -r "assert" --include="*.*" .
grep -r "expect" --include="*.*" .
grep -r "should" --include="*.*" .

# Find files containing test keywords
grep -r "test\s*(" --include="*.*" .
grep -r "describe\s*(" --include="*.*" .
grep -r "it\s*(" --include="*.*" .
```

### Step 3: Check Build/Project Files

Look for test commands in:
- `Makefile` - `test:` target
- `package.json` - `"test":` script
- `*.toml` - `[test]` section
- `README*` - Testing instructions
- `.github/workflows/*` - CI test steps
- `.gitlab-ci.yml` - CI test jobs

### Step 4: Look for Test Framework Imports

```bash
# Find framework imports/requires
grep -r "import.*test" --include="*.*" .
grep -r "require.*test" --include="*.*" .
grep -r "using.*test" --include="*.*" .
```

---

## Running Tests (Universal Commands)

Try these commands in order:

```bash
# Generic make target
make test

# Common scripts
./test.sh
./run_tests.sh

# Check README for instructions
cat README* | grep -A5 -i "test"

# Check package manager
npm test          # Node.js
pip test          # Python (rare)
cargo test        # Rust
go test ./...     # Go
dotnet test       # .NET
mvn test          # Java Maven
gradle test       # Java Gradle
```

---

## When User Provides Information

If the user tells you about their testing setup:

1. **Framework Name Given**
   - Search for `{framework} getting started`
   - Apply framework-specific patterns
   - Update provisional strategy

2. **Test Command Given**
   - Document the command
   - Analyze output format
   - Determine test file patterns from what runs

3. **Test Directory Given**
   - Scan the directory for patterns
   - Infer naming conventions
   - Analyze file structure

---

## User Prompts for Universal Fallback

When using universal fallback, ask the user:

```markdown
## Universal Fallback Mode

I'll apply language-agnostic testing principles for your project.

To improve the strategy, please answer any of these (optional):

1. **Test Framework**: What testing framework do you use?
   > _e.g., "pytest", "jest", "junit"_

2. **Test Location**: Where are your tests located?
   > _e.g., "tests/", "src/**/*.test.ts"_

3. **Test Command**: How do you run tests?
   > _e.g., "npm test", "make test"_

4. **Special Considerations**: Any unique requirements?
   > _e.g., "Tests need Docker", "Uses custom assertion library"_

Or type "continue" to proceed with universal patterns.
```

---

## Fallback Test Template

When generating test files with no language knowledge:

```
# Universal Test Template
# Language: Unknown
# Framework: Unknown
# Generated by TEA Universal Fallback

# ===========================================
# TEST: {module_name}
# ===========================================

# Setup (if needed)
# - Initialize test environment
# - Create test fixtures

# ------------------------------------------
# Test Case: {function_name} - Happy Path
# ------------------------------------------
# ARRANGE
# - Set up inputs and expected outputs

# ACT  
# - Call the function under test

# ASSERT
# - Verify result matches expected

# ------------------------------------------
# Test Case: {function_name} - Error Case
# ------------------------------------------
# ARRANGE
# - Set up invalid inputs

# ACT
# - Call the function

# ASSERT
# - Verify error is handled correctly

# Teardown (if needed)
# - Clean up resources
```

---

## Confidence and Limitations

**Universal Fallback Limitations**:
- Cannot generate language-specific syntax
- May miss idiomatic testing patterns
- Cannot determine optimal test framework
- Generic assertions may not leverage type system

**When to Escalate to User**:
- Need to write actual test code
- Configuring CI pipeline
- Choosing between multiple frameworks
- Performance/benchmark testing

**Always Inform User**:
```markdown
Note: Using universal fallback strategy.
The recommendations are generic and may need adjustment
for {detected_or_unknown} language specifics.
```
