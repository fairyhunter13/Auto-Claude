# Rust Testing Strategy

## Language Profile
- **Family**: Systems (C-Family influenced)
- **Paradigms**: Multi-paradigm (imperative, functional, concurrent)
- **Type System**: Static, strongly typed with ownership model
- **Testing Culture**: First-class testing support built into toolchain

## Built-in Test Framework

### `#[test]` Attribute
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_addition() {
        assert_eq!(2 + 2, 4);
    }

    #[test]
    #[should_panic(expected = "divide by zero")]
    fn test_panic() {
        let _ = 1 / 0;
    }

    #[test]
    #[ignore]
    fn expensive_test() {
        // Run with: cargo test -- --ignored
    }
}
```

### Assertions
- `assert!()` - Boolean assertion
- `assert_eq!()` - Equality with debug output
- `assert_ne!()` - Inequality with debug output
- `debug_assert!()` - Debug-only assertions

### Test Organization
```
src/
  lib.rs          # Unit tests in same file
  module.rs       # Tests at bottom of module
tests/
  integration_tests.rs  # Integration tests
  common/
    mod.rs        # Shared test utilities
```

## Recommended Frameworks

### Property-Based Testing
**proptest** or **quickcheck**
```rust
use proptest::prelude::*;

proptest! {
    #[test]
    fn test_add_commutative(a: i32, b: i32) {
        prop_assert_eq!(a + b, b + a);
    }
}
```

### Async Testing
**tokio::test** for async runtime
```rust
#[tokio::test]
async fn test_async_operation() {
    let result = async_function().await;
    assert!(result.is_ok());
}
```

### Mocking
**mockall** - Derive-based mocking
```rust
use mockall::automock;

#[automock]
trait Database {
    fn get(&self, key: &str) -> Option<String>;
}

#[test]
fn test_with_mock() {
    let mut mock = MockDatabase::new();
    mock.expect_get()
        .with(eq("key"))
        .returning(|_| Some("value".to_string()));
}
```

### Snapshot Testing
**insta** - Snapshot assertions
```rust
use insta::assert_snapshot;

#[test]
fn test_output() {
    assert_snapshot!(generate_output());
}
```

## Test Patterns

### Result-Based Tests
```rust
#[test]
fn test_result() -> Result<(), Error> {
    let value = function_that_might_fail()?;
    assert_eq!(value, expected);
    Ok(())
}
```

### Parameterized Tests
```rust
// Using rstest
use rstest::rstest;

#[rstest]
#[case(0, 0)]
#[case(1, 1)]
#[case(2, 4)]
fn test_square(#[case] input: i32, #[case] expected: i32) {
    assert_eq!(input * input, expected);
}
```

### Integration Tests
```rust
// tests/integration_test.rs
use my_crate::public_function;

#[test]
fn test_public_api() {
    let result = public_function("input");
    assert!(result.is_ok());
}
```

## Coverage Tools

### cargo-tarpaulin
```bash
cargo install cargo-tarpaulin
cargo tarpaulin --out Html
```

### llvm-cov
```bash
cargo install cargo-llvm-cov
cargo llvm-cov --html
```

## Benchmark Testing

### Criterion.rs
```rust
use criterion::{criterion_group, criterion_main, Criterion};

fn fibonacci_benchmark(c: &mut Criterion) {
    c.bench_function("fib 20", |b| b.iter(|| fibonacci(20)));
}

criterion_group!(benches, fibonacci_benchmark);
criterion_main!(benches);
```

## File Pattern Detection
- `Cargo.toml` - Project manifest
- `*.rs` - Rust source files
- `src/lib.rs`, `src/main.rs` - Entry points
- `tests/*.rs` - Integration tests
- `benches/*.rs` - Benchmarks

## Recommended Test Stack
1. **Unit**: Built-in `#[test]`
2. **Integration**: Built-in `tests/` directory
3. **Property**: `proptest` or `quickcheck`
4. **Mocking**: `mockall`
5. **Async**: `tokio::test`
6. **Snapshot**: `insta`
7. **Coverage**: `cargo-tarpaulin` or `cargo-llvm-cov`
8. **Benchmarks**: `criterion`

## CI Configuration (GitHub Actions)
```yaml
name: Rust CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo test --all-features
      - run: cargo clippy -- -D warnings
      - run: cargo fmt -- --check

  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - run: cargo install cargo-tarpaulin
      - run: cargo tarpaulin --out Xml
      - uses: codecov/codecov-action@v3
```

## Rust-Specific Considerations

### Ownership in Tests
- Use `.clone()` when needed for test isolation
- Consider `Arc<Mutex<T>>` for shared test state
- Use `#[derive(Clone, Debug)]` for test types

### Compile-Time Testing
```rust
// Ensure code doesn't compile
// Use trybuild crate for compile-fail tests
```

### Unsafe Code Testing
```rust
#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_unsafe_function() {
        unsafe {
            // Test unsafe code paths
        }
    }
}
```
