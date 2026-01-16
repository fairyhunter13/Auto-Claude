# Systems-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but systems-level patterns detected.

## Family Characteristics

Systems languages share these traits that affect testing:
- **Manual memory management** - Or compiler-enforced ownership
- **Low-level control** - Pointers, references, unsafe blocks
- **Performance critical** - Benchmarking is essential
- **Hardware interaction** - May need hardware mocks
- **Undefined behavior risks** - Sanitizers recommended
- **Compile-time guarantees** - Strong static typing

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| C | Unity, CUnit, Check, CMocka | `test_*.c`, `*_test.c` |
| C++ | Google Test, Catch2, doctest, Boost.Test | `*_test.cpp`, `test_*.cpp` |
| Rust | cargo test (built-in), proptest | `*_test.rs`, `tests/*.rs` |
| Zig | zig test (built-in) | `test` blocks inline |
| Odin | odin test | `*_test.odin` |
| Nim | unittest (built-in) | `t*.nim`, `*_test.nim` |
| D | unittest (built-in) | `unittest` blocks inline |
| Ada | AUnit | `test_*.adb` |

## Universal Testing Patterns

### 1. Memory Safety Testing

Critical for systems languages:

```
// Conceptual - use sanitizers

// Address Sanitizer (ASan) - detects:
// - Buffer overflows
// - Use after free
// - Memory leaks

// Memory Sanitizer (MSan) - detects:
// - Uninitialized memory reads

// Thread Sanitizer (TSan) - detects:
// - Data races
// - Deadlocks

// Compile with sanitizers for test builds
// gcc -fsanitize=address,undefined -g test.c
// clang -fsanitize=memory -g test.c
```

### 2. Fuzz Testing

Essential for finding edge cases:

```
// Conceptual fuzz test structure
fuzz_test "parser handles arbitrary input" {
    input: random_bytes(0..1000)
    
    // Should not crash, leak, or UB
    result = parse(input)
    
    // If it succeeds, output should be valid
    if result.is_ok() {
        assert(is_valid(result.value))
    }
}
```

**Fuzzing Tools by Language**:
| Language | Fuzzer |
|----------|--------|
| C/C++ | AFL++, libFuzzer, honggfuzz |
| Rust | cargo-fuzz, afl.rs |
| Zig | zig-fuzz |
| Go | go-fuzz, native (go test -fuzz) |

### 3. Test Structure Pattern

Systems tests use **Setup-Exercise-Verify-Teardown**:

```
test "allocator handles multiple allocations" {
    // Setup
    allocator = create_test_allocator()
    
    // Exercise
    ptr1 = allocator.alloc(100)
    ptr2 = allocator.alloc(200)
    allocator.free(ptr1)
    ptr3 = allocator.alloc(50)
    
    // Verify
    assert(ptr3 != null)
    assert(allocator.total_allocated() == 250)
    
    // Teardown
    allocator.free(ptr2)
    allocator.free(ptr3)
    assert(allocator.total_allocated() == 0)
    destroy_allocator(allocator)
}
```

### 4. Benchmark Testing

Performance testing is first-class:

```
benchmark "vector_push performance" {
    iterations: 1000
    warmup: 100
    
    setup {
        vec = create_vector()
    }
    
    measure {
        for i in 0..10000 {
            vec.push(i)
        }
    }
    
    teardown {
        destroy_vector(vec)
    }
    
    assert(result.mean < 1ms)
    assert(result.stddev < 0.1ms)
}
```

### 5. Unsafe Code Testing

Extra scrutiny for unsafe blocks:

```
// Rust-style conceptual example
#[test]
fn test_unsafe_operation() {
    // Test with valid inputs
    unsafe {
        let ptr = allocate_buffer(100);
        assert!(!ptr.is_null());
        
        write_to_buffer(ptr, b"test data");
        let data = read_from_buffer(ptr, 9);
        assert_eq!(data, b"test data");
        
        free_buffer(ptr);
    }
}

#[test]
#[should_panic]  // Or expect specific error
fn test_unsafe_with_invalid_input() {
    unsafe {
        // Should handle null gracefully
        let result = read_from_buffer(null_ptr(), 10);
        // Verify error handling
    }
}
```

### 6. Integration with Hardware

For hardware interaction, use mocks/stubs:

```
// Abstract hardware interface
trait HardwarePort {
    fn read(&self) -> u8;
    fn write(&mut self, value: u8);
}

// Mock for testing
struct MockPort {
    read_values: Vec<u8>,
    written_values: Vec<u8>,
}

impl HardwarePort for MockPort {
    fn read(&self) -> u8 { self.read_values.pop() }
    fn write(&mut self, v: u8) { self.written_values.push(v) }
}

#[test]
fn test_hardware_communication() {
    let mut mock = MockPort::new();
    mock.read_values = vec![0x42];
    
    let driver = Driver::new(mock);
    driver.initialize();
    
    assert_eq!(driver.mock.written_values, vec![0x01, 0x02]);
}
```

## Framework Detection Heuristics

When language is unknown but systems-family, look for:

### Build System Files
| File | Likely Language |
|------|-----------------|
| `Makefile`, `CMakeLists.txt`, `meson.build` | C/C++ |
| `Cargo.toml` | Rust |
| `build.zig` | Zig |
| `*.odin` + `ols.json` | Odin |
| `*.nimble` | Nim |
| `dub.json`, `dub.sdl` | D |
| `*.gpr` | Ada |

### Test Dependencies/Patterns
| Pattern | Likely Framework |
|---------|------------------|
| `#include <gtest/gtest.h>` | Google Test (C++) |
| `#include <catch2/catch.hpp>` | Catch2 (C++) |
| `#[test]`, `#[cfg(test)]` | Rust built-in |
| `test "..."` block | Zig built-in |
| `unittest` block | D built-in |

## Recommended Test Strategy

### For Unknown Systems-Family Language

1. **Enable sanitizers** - ASan, MSan, UBSan
2. **Add fuzz testing** - Essential for parsing, allocation
3. **Benchmark critical paths** - Performance is usually important
4. **Test memory lifecycle** - Alloc → Use → Free paths
5. **Isolate unsafe code** - Extra test coverage there

### Test Distribution Guidance

| Test Type | Percentage | Rationale |
|-----------|------------|-----------|
| Unit tests | 40-50% | Core logic |
| Fuzz tests | 10-20% | Edge cases, crashes |
| Benchmarks | 10-15% | Performance regression |
| Integration | 15-20% | Component interaction |
| Memory tests | 10-15% | Leak/corruption detection |

### Safety Checklist

| Category | Tests Needed |
|----------|--------------|
| Null pointers | Handle gracefully |
| Buffer bounds | No overflows |
| Integer overflow | Checked arithmetic |
| Memory leaks | Zero leaks in tests |
| Data races | Thread-safe code |
| Resource cleanup | All resources freed |

## Fallback Commands

When framework unknown, try these:

```bash
# Build and test with sanitizers
make test SANITIZE=address,undefined

# C/C++ runners
ctest                        # CMake
meson test                   # Meson
make check                   # Autotools

# Rust
cargo test
cargo test --release         # Also test optimized
cargo +nightly fuzz run      # Fuzzing

# Zig
zig build test

# Nim
nimble test
nim c -r tests/test_all.nim

# D
dub test
```

## Integration with TEA Workflows

When systems-family inference is used:

1. **Mandate sanitizers** - Non-negotiable for safety
2. **Recommend fuzzing** - High-value for systems code
3. **Include benchmarks** - Performance matters
4. **Check for unsafe blocks** - Flag for extra testing
5. **Verify memory management** - Test alloc/free patterns

## Critical Safety Patterns

### 1. Resource Acquisition Is Initialization (RAII)
Test that resources are always cleaned up:
```
test "file handle cleaned up on error" {
    // Even if operation fails, file should be closed
    result = risky_file_operation("test.txt")
    assert(!file_handle_leaked())
}
```

### 2. Error Propagation
Systems code must handle errors at every level:
```
test "errors propagate correctly" {
    // Inject failure at low level
    mock_syscall_to_fail(ENOMEM)
    
    // High-level operation should return error
    result = high_level_operation()
    assert(result.is_error())
    assert(result.error == OutOfMemory)
}
```

### 3. Concurrency Safety
Multi-threaded code needs stress testing:
```
test "concurrent access is safe" {
    shared_data = create_shared_structure()
    
    // Spawn many threads hitting same data
    threads = spawn_threads(100, || {
        for _ in 0..1000 {
            shared_data.increment()
        }
    })
    
    join_all(threads)
    assert(shared_data.value == 100_000)
}
```

### 4. Alignment and Padding
Test memory layout assumptions:
```
test "struct has expected layout" {
    assert(sizeof(MyStruct) == 16)
    assert(alignof(MyStruct) == 8)
    assert(offsetof(MyStruct, field_a) == 0)
    assert(offsetof(MyStruct, field_b) == 8)
}
```
