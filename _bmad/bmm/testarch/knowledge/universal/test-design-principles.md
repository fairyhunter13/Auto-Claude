# Universal Test Design Principles

**Category:** Universal  
**Applies To:** All languages and frameworks  
**TEA Priority:** Always load

---

## Overview

These principles define what makes a **good test** regardless of programming language or test framework. They form the foundation for all TEA test generation and review.

---

## Core Principles

### 1. Determinism

**Definition:** A test must produce the same result every time it runs, given the same code and environment.

**Violations to avoid:**
- Relying on current time/date without mocking
- Using random values without seeding
- Depending on external services without mocking
- Race conditions in async code
- Shared mutable state between tests

**Universal pattern:**
```
GIVEN a controlled, reproducible starting state
WHEN the test action executes
THEN the result is always predictable
```

### 2. Isolation

**Definition:** Each test must be independent and not affect or be affected by other tests.

**Requirements:**
- No shared mutable state between tests
- Each test sets up its own data
- Each test cleans up after itself
- Test execution order must not matter

**Anti-patterns:**
- Tests that only pass when run in a specific order
- Tests that share database records
- Tests that depend on side effects from other tests

### 3. Single Responsibility

**Definition:** Each test should verify ONE behavior or scenario.

**Benefits:**
- Clear failure diagnosis
- Better documentation of expected behavior
- Easier maintenance

**Structure:**
```
Test: "should [single specific behavior] when [single specific condition]"
```

### 4. Clarity

**Definition:** Tests serve as documentation. Anyone should understand what's being tested.

**Guidelines:**
- Descriptive test names that explain the scenario
- Clear Given-When-Then structure
- Meaningful variable names
- Comments for complex setup (but prefer self-documenting code)

### 5. Speed Stratification

**Definition:** Tests should run as fast as possible at the appropriate level.

**Test Pyramid Guidance:**
| Level | Target Duration | Quantity |
|-------|-----------------|----------|
| Unit | < 10ms each | Many (70%+) |
| Integration | < 1s each | Some (20%) |
| E2E | < 60s each | Few (10%) |

### 6. Maintainability

**Definition:** Tests should be easy to update when requirements change.

**Patterns:**
- DRY for test utilities, not test logic
- Page Objects / Test Helpers for UI abstraction
- Data factories for test data
- Shared fixtures for common setup

**Anti-patterns:**
- Duplicating setup code across many tests
- Hard-coding values that might change
- Brittle selectors (e.g., CSS classes for styling)

---

## Test Structure Pattern (Universal)

### Given-When-Then (BDD)

```
GIVEN [preconditions and initial state]
  - Test data is set up
  - System is in known state
  - Dependencies are configured/mocked

WHEN [action under test]
  - Single action or operation
  - The behavior being verified

THEN [expected outcomes]
  - Assertions about state changes
  - Assertions about return values
  - Assertions about side effects
```

### Arrange-Act-Assert (AAA)

```
ARRANGE
  - Set up test data
  - Configure mocks/stubs
  - Prepare system state

ACT
  - Execute the code under test
  - Single operation

ASSERT
  - Verify expected outcomes
  - Check state changes
  - Validate return values
```

---

## Assertion Best Practices

### 1. Be Specific

```
BAD:  assert result != null
GOOD: assert result.userId == expectedUserId
```

### 2. Test Behavior, Not Implementation

```
BAD:  assert internalList.size() == 3
GOOD: assert getItemCount() == 3
```

### 3. One Logical Assertion Per Test

Multiple `assert` statements are fine if they verify ONE behavior:

```
// OK: Multiple asserts for one behavior (user creation)
assert user.id != null
assert user.email == "test@example.com"
assert user.createdAt != null

// BAD: Testing multiple behaviors
assert user.id != null
assert emailService.wasCalled()  // Different behavior!
```

### 4. Meaningful Failure Messages

Assertions should explain what went wrong:

```
assert user.status == "active", 
  f"Expected user {user.id} to be active but was {user.status}"
```

---

## Test Data Management

### Principles

1. **Explicit over implicit**: Test data should be visible in the test
2. **Minimal data**: Only create what's needed for the test
3. **Unique data**: Avoid collisions with parallel tests
4. **Cleanup**: Remove test data after test completion

### Factory Pattern (Conceptual)

```
Factory creates test entities with:
- Sensible defaults for required fields
- Override capability for test-specific values
- Automatic cleanup registration
- Unique identifiers to avoid collisions
```

---

## Flakiness Prevention

### Common Causes and Solutions

| Cause | Solution |
|-------|----------|
| Timing issues | Use explicit waits, not sleeps |
| Shared state | Isolate test data |
| External dependencies | Mock or use test doubles |
| Race conditions | Synchronize properly |
| Environment differences | Containerize, use CI parity |

### Flakiness Budget

- **P0 tests**: 0% flakiness tolerance
- **P1 tests**: < 0.1% flakiness tolerance
- **P2/P3 tests**: < 1% flakiness tolerance

Tests exceeding flakiness budget should be:
1. Fixed immediately (P0/P1)
2. Quarantined until fixed (P2/P3)
3. Deleted if unfixable

---

## Test Naming Conventions

### Pattern

```
[Unit/Feature]_[Scenario]_[ExpectedResult]
```

Or descriptive sentence:

```
"should return 404 when user not found"
"creates order with valid payment method"
"fails validation when email is empty"
```

### Guidelines

- Start with action verb or "should"
- Include the scenario/condition
- State the expected outcome
- Be specific enough to understand without reading code

---

## Code Coverage Guidelines

### Meaningful Coverage

Coverage is a **tool**, not a **goal**:

| Metric | Target | Notes |
|--------|--------|-------|
| Line coverage | 70-80% | Minimum for critical paths |
| Branch coverage | 60-70% | Focus on decision points |
| Critical path coverage | 100% | P0 functionality |

### What to Cover

- Business logic
- Error handling paths
- Edge cases
- Integration points

### What NOT to Obsess Over

- Generated code
- Simple getters/setters
- Framework boilerplate
- Third-party library internals

---

## Related Fragments

- `test-levels-framework.md` - When to use unit vs integration vs E2E
- `test-priorities-matrix.md` - How to prioritize test coverage
- `risk-governance.md` - Risk-based testing decisions
