# Go Testing Strategy

**Language:** Go  
**Strategy Version:** 1.0.0  
**Last Updated:** 2026-01-16

---

## Detection Confirmed

When this strategy is loaded, the following indicators were detected:

| Indicator | Type | Found |
|-----------|------|-------|
| `go.mod` | Required | ✓ |
| `go.sum` | Optional | ? |
| `**/*.go` files | Optional | ✓ |

---

## Framework Selection Logic

### Decision Tree

```
Go Project Detected
│
├── Uses testify already?
│   └── YES → Use testify (existing dependency)
│
├── Prefers BDD style?
│   └── YES → Consider goconvey
│
├── Needs table-driven tests?
│   └── YES → Standard library (idiomatic Go)
│
└── DEFAULT → Standard library `go test`
    └── Add testify for complex assertions/mocks if needed
```

### Framework Recommendations

| Project Type | Primary | Unit Tests | Integration | E2E/API |
|--------------|---------|------------|-------------|---------|
| API Service | go test | go test | go test + testcontainers | go test + httptest |
| CLI Tool | go test | go test | go test | N/A |
| Library | go test | go test | go test | N/A |
| Microservice | go test + testify | go test | testcontainers | go test |

---

## Knowledge Fragments to Load

### Always Load (Universal)

```
1. universal/test-levels-framework.md
2. universal/test-priorities-matrix.md
3. universal/test-design-principles.md
```

### Go Core (Always)

```
4. languages/go/go-testing-patterns.md
5. languages/go/table-driven-tests.md
```

### Optional (Based on Detection)

**If testify detected:**
```
6. languages/go/testify-patterns.md
```

**If API project:**
```
7. languages/go/httptest-patterns.md
```

---

## Directory Structure

### Standard Go Project Structure

```
{project-root}/
├── cmd/                          # Application entrypoints
│   └── myapp/
│       └── main.go
├── internal/                     # Private application code
│   ├── auth/
│   │   ├── auth.go
│   │   └── auth_test.go         # Tests alongside code
│   ├── user/
│   │   ├── user.go
│   │   ├── user_test.go
│   │   └── testdata/            # Test fixtures
│   │       └── users.json
│   └── api/
│       ├── handler.go
│       └── handler_test.go
├── pkg/                          # Public libraries
│   └── validator/
│       ├── validator.go
│       └── validator_test.go
├── test/                         # Integration/E2E tests
│   └── integration/
│       └── api_test.go
├── go.mod
├── go.sum
└── Makefile
```

### Key Conventions

- **Tests live alongside code**: `foo.go` → `foo_test.go`
- **Package name**: Use `_test` suffix for black-box testing
- **Test data**: Store in `testdata/` directories (ignored by Go tooling)
- **Integration tests**: Use build tags or separate `test/` directory

---

## Configuration

### go.mod (Dependencies)

```go
module github.com/yourorg/yourproject

go 1.21

require (
    github.com/stretchr/testify v1.8.4 // For assertions and mocks
)
```

### Makefile (Common Targets)

```makefile
.PHONY: test test-coverage test-race test-integration

# Run all unit tests
test:
	go test ./...

# Run with coverage
test-coverage:
	go test -coverprofile=coverage.out ./...
	go tool cover -html=coverage.out -o coverage.html

# Run with race detector
test-race:
	go test -race ./...

# Run integration tests
test-integration:
	go test -tags=integration ./test/...

# Run all tests verbosely
test-verbose:
	go test -v ./...

# Run benchmarks
bench:
	go test -bench=. -benchmem ./...
```

---

## Common Commands

| Action | Command |
|--------|---------|
| Run all tests | `go test ./...` |
| Run with coverage | `go test -coverprofile=coverage.out ./...` |
| View coverage | `go tool cover -html=coverage.out` |
| Run single package | `go test ./internal/auth` |
| Run single test | `go test -run TestCreateUser ./internal/user` |
| Run with race detector | `go test -race ./...` |
| Run verbose | `go test -v ./...` |
| Run benchmarks | `go test -bench=. ./...` |
| Run short tests only | `go test -short ./...` |
| Skip cache | `go test -count=1 ./...` |

---

## Test Patterns

### Table-Driven Tests (Idiomatic Go)

```go
// internal/user/user_test.go
package user

import (
    "testing"
)

func TestValidateEmail(t *testing.T) {
    tests := []struct {
        name    string
        email   string
        want    bool
        wantErr bool
    }{
        {
            name:    "valid email",
            email:   "user@example.com",
            want:    true,
            wantErr: false,
        },
        {
            name:    "missing @",
            email:   "userexample.com",
            want:    false,
            wantErr: true,
        },
        {
            name:    "empty string",
            email:   "",
            want:    false,
            wantErr: true,
        },
        {
            name:    "multiple @",
            email:   "user@@example.com",
            want:    false,
            wantErr: true,
        },
    }

    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            got, err := ValidateEmail(tt.email)
            
            if (err != nil) != tt.wantErr {
                t.Errorf("ValidateEmail() error = %v, wantErr %v", err, tt.wantErr)
                return
            }
            
            if got != tt.want {
                t.Errorf("ValidateEmail() = %v, want %v", got, tt.want)
            }
        })
    }
}
```

### With testify (Enhanced Assertions)

```go
// internal/user/user_test.go
package user

import (
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestCreateUser(t *testing.T) {
    // Arrange
    repo := NewMockRepository()
    service := NewUserService(repo)
    
    input := CreateUserInput{
        Email: "test@example.com",
        Name:  "Test User",
    }
    
    // Act
    user, err := service.CreateUser(input)
    
    // Assert
    require.NoError(t, err, "CreateUser should not return error")
    assert.NotEmpty(t, user.ID, "User should have an ID")
    assert.Equal(t, input.Email, user.Email)
    assert.Equal(t, input.Name, user.Name)
    assert.False(t, user.CreatedAt.IsZero(), "CreatedAt should be set")
}

func TestCreateUser_DuplicateEmail(t *testing.T) {
    // Arrange
    repo := NewMockRepository()
    repo.ExistingEmails = []string{"taken@example.com"}
    service := NewUserService(repo)
    
    input := CreateUserInput{
        Email: "taken@example.com",
        Name:  "Another User",
    }
    
    // Act
    user, err := service.CreateUser(input)
    
    // Assert
    assert.Nil(t, user)
    assert.ErrorIs(t, err, ErrDuplicateEmail)
}
```

### HTTP Handler Testing

```go
// internal/api/handler_test.go
package api

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
    
    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
)

func TestCreateUserHandler(t *testing.T) {
    // Arrange
    handler := NewUserHandler(NewMockUserService())
    
    body := map[string]string{
        "email": "test@example.com",
        "name":  "Test User",
    }
    bodyBytes, _ := json.Marshal(body)
    
    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader(bodyBytes))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    
    // Act
    handler.CreateUser(rec, req)
    
    // Assert
    assert.Equal(t, http.StatusCreated, rec.Code)
    
    var response map[string]interface{}
    err := json.Unmarshal(rec.Body.Bytes(), &response)
    require.NoError(t, err)
    
    assert.Equal(t, "test@example.com", response["email"])
    assert.NotEmpty(t, response["id"])
}

func TestCreateUserHandler_InvalidJSON(t *testing.T) {
    handler := NewUserHandler(NewMockUserService())
    
    req := httptest.NewRequest(http.MethodPost, "/users", bytes.NewReader([]byte("invalid")))
    req.Header.Set("Content-Type", "application/json")
    rec := httptest.NewRecorder()
    
    handler.CreateUser(rec, req)
    
    assert.Equal(t, http.StatusBadRequest, rec.Code)
}
```

### Mock with testify/mock

```go
// internal/user/mock_repository.go
package user

import (
    "context"
    
    "github.com/stretchr/testify/mock"
)

type MockRepository struct {
    mock.Mock
}

func (m *MockRepository) Create(ctx context.Context, user *User) error {
    args := m.Called(ctx, user)
    return args.Error(0)
}

func (m *MockRepository) FindByEmail(ctx context.Context, email string) (*User, error) {
    args := m.Called(ctx, email)
    if args.Get(0) == nil {
        return nil, args.Error(1)
    }
    return args.Get(0).(*User), args.Error(1)
}

// Usage in tests:
func TestServiceWithMock(t *testing.T) {
    mockRepo := new(MockRepository)
    
    // Setup expectations
    mockRepo.On("FindByEmail", mock.Anything, "test@example.com").
        Return(nil, ErrNotFound)
    mockRepo.On("Create", mock.Anything, mock.AnythingOfType("*user.User")).
        Return(nil)
    
    service := NewUserService(mockRepo)
    
    // Test...
    
    // Verify expectations
    mockRepo.AssertExpectations(t)
}
```

### Integration Test with Build Tags

```go
// test/integration/api_test.go
//go:build integration

package integration

import (
    "net/http"
    "testing"
    
    "github.com/stretchr/testify/assert"
)

func TestAPIIntegration(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping integration test in short mode")
    }
    
    // Setup real database connection, etc.
    
    resp, err := http.Get("http://localhost:8080/health")
    assert.NoError(t, err)
    assert.Equal(t, http.StatusOK, resp.StatusCode)
}
```

---

## Test Helpers

### Setup/Teardown Pattern

```go
func TestMain(m *testing.M) {
    // Setup
    setup()
    
    // Run tests
    code := m.Run()
    
    // Teardown
    teardown()
    
    os.Exit(code)
}

func setup() {
    // Initialize test database, etc.
}

func teardown() {
    // Cleanup
}
```

### Test Fixtures (testdata)

```go
// Load test data from testdata/ directory
func loadTestData(t *testing.T, filename string) []byte {
    t.Helper()
    
    data, err := os.ReadFile(filepath.Join("testdata", filename))
    if err != nil {
        t.Fatalf("Failed to load test data %s: %v", filename, err)
    }
    
    return data
}
```

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        go-version: ['1.21', '1.22']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Go ${{ matrix.go-version }}
        uses: actions/setup-go@v5
        with:
          go-version: ${{ matrix.go-version }}
          cache: true
      
      - name: Run tests
        run: go test -v -race -coverprofile=coverage.out ./...
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.out
  
  integration:
    runs-on: ubuntu-latest
    needs: test
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: test
        ports:
          - 5432:5432
    
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with:
          go-version: '1.22'
      
      - name: Run integration tests
        run: go test -tags=integration -v ./test/...
        env:
          DATABASE_URL: postgres://postgres:test@localhost:5432/test?sslmode=disable
```

---

## Related Knowledge Fragments

### Universal Concepts
- `universal/test-design-principles.md` - Core testing principles
- `universal/test-levels-framework.md` - When to use each test level
- `universal/test-priorities-matrix.md` - P0-P3 prioritization

### Go-Specific (To Be Created)
- `languages/go/table-driven-tests.md` - Detailed table-driven patterns
- `languages/go/testify-patterns.md` - testify usage patterns
- `languages/go/httptest-patterns.md` - HTTP testing patterns
