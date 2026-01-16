# C-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but C-family syntax detected.

## Family Characteristics

C-family languages share these traits that affect testing:
- **Curly-brace block structure** - Clear scope boundaries
- **Semicolon statement termination** - Explicit statement endings
- **Imperative/OOP paradigm** - State mutation, method calls
- **Static typing** (usually) - Compile-time type checking

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| C | Unity, CUnit, Check | `test_*.c`, `*_test.c` |
| C++ | Google Test, Catch2, doctest | `*_test.cpp`, `test_*.cpp` |
| Java | JUnit, TestNG | `*Test.java`, `*IT.java` |
| C# | xUnit, NUnit, MSTest | `*Tests.cs` |
| Go | go test, testify | `*_test.go` |
| Rust | cargo test | `*_test.rs`, `tests/*.rs` |
| Swift | XCTest | `*Tests.swift` |
| Kotlin | JUnit, Kotest | `*Test.kt` |
| Zig | zig test | `test` blocks inline |
| D | unittest | `unittest` blocks inline |

## Universal Testing Patterns

### 1. Test File Organization

```
project/
├── src/           # or lib/, app/
│   └── module/
│       └── feature.{ext}
└── tests/         # or test/, __tests__/
    └── module/
        └── feature_test.{ext}  # or test_feature.{ext}
```

**Alternative**: Co-located tests
```
src/
└── module/
    ├── feature.{ext}
    └── feature_test.{ext}
```

### 2. Test Structure Pattern

C-family languages universally use **Arrange-Act-Assert**:

```
test_function_name_scenario_expected():
    // Arrange - Set up preconditions
    input = create_test_data()
    system = initialize_system()
    
    // Act - Execute the behavior
    result = system.perform_action(input)
    
    // Assert - Verify outcomes
    assert result == expected_value
    assert system.state == expected_state
```

### 3. Test Naming Conventions

| Convention | Example | Common In |
|------------|---------|-----------|
| `test_*` | `test_user_creation_succeeds` | Python, Go, Rust |
| `*_test` | `user_creation_test` | Go (file), Rust |
| `Test*` | `TestUserCreation` | Go (function), C# |
| `*Test` | `UserCreationTest` | Java, Kotlin |
| `*Spec` | `UserCreationSpec` | Scala, Kotlin |
| `should_*` | `should_create_user` | BDD styles |

### 4. Assertion Patterns

**Equality assertions**:
```
assert_equal(expected, actual)
assert_eq!(expected, actual)      // Rust
assertEquals(expected, actual)    // Java
expect(actual).toBe(expected)     // JS-like
```

**Boolean assertions**:
```
assert_true(condition)
assert(condition)
assertTrue(condition)
```

**Exception/Error assertions**:
```
assert_throws(ExceptionType, callable)
assertThrows(Exception.class, () -> ...)
expect(() -> ...).toThrow()
```

### 5. Setup/Teardown Patterns

Most C-family test frameworks support:

| Phase | Purpose | Common Names |
|-------|---------|--------------|
| Before All | Once per test suite | `@BeforeAll`, `setup_module`, `init` |
| Before Each | Before each test | `@BeforeEach`, `setUp`, `before` |
| After Each | After each test | `@AfterEach`, `tearDown`, `after` |
| After All | Once per test suite | `@AfterAll`, `teardown_module`, `cleanup` |

### 6. Mocking Patterns

C-family languages typically use:
- **Interface-based mocking** - Mock interface implementations
- **Dependency injection** - Pass dependencies for testing
- **Spy objects** - Track calls to real objects

```
// Interface-based
mock_repository = create_mock(Repository)
when(mock_repository.find(1)).return(test_user)

// Dependency injection
service = UserService(repository=mock_repository)
result = service.get_user(1)

verify(mock_repository.find).called_once_with(1)
```

## Framework Detection Heuristics

When language is unknown but C-family, look for:

### Build System Files
| File | Likely Language |
|------|-----------------|
| `Makefile`, `CMakeLists.txt` | C/C++ |
| `pom.xml`, `build.gradle` | Java/Kotlin |
| `*.csproj`, `*.sln` | C# |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `Package.swift` | Swift |
| `dub.json`, `dub.sdl` | D |
| `build.zig` | Zig |

### Test Runner Config Files
| File | Framework |
|------|-----------|
| `jest.config.*` | Jest (JS/TS) |
| `pytest.ini`, `pyproject.toml` | pytest (Python) |
| `phpunit.xml` | PHPUnit (PHP) |

## Recommended Test Strategy

### For Unknown C-Family Language

1. **Identify build system** - Check for build files above
2. **Search for existing tests**:
   ```
   find . -name "*test*" -o -name "*spec*"
   ```
3. **Analyze test file structure** - Determine naming convention
4. **Look for test framework imports** in existing test files
5. **Apply Arrange-Act-Assert** pattern universally

### Test Levels (Universal)

| Level | Scope | Isolation | Speed |
|-------|-------|-----------|-------|
| Unit | Single function/method | Full (mocked deps) | Fast (<100ms) |
| Integration | Multiple components | Partial | Medium (<1s) |
| E2E | Full system | None | Slow (>1s) |

### Coverage Guidance

- **Target**: 80% line coverage minimum
- **Critical paths**: 100% coverage
- **Edge cases**: Explicitly test boundaries
- **Error paths**: Test error handling

## Fallback Commands

When framework unknown, try these in order:

```bash
# Common test runners
make test
./test.sh
./run_tests.sh

# Language-specific (if detected)
go test ./...           # Go
cargo test              # Rust
dotnet test             # C#
mvn test                # Java (Maven)
gradle test             # Java (Gradle)
swift test              # Swift
zig build test          # Zig
```

## Integration with TEA Workflows

When C-family inference is used:

1. **Log confidence level** - Note this is family-based, not language-specific
2. **Prompt for confirmation** - Ask user to validate language detection
3. **Apply universal patterns** - Use patterns above
4. **Offer discovery mode** - Suggest web research for specific framework
5. **Save learnings** - If user provides corrections, update knowledge base
