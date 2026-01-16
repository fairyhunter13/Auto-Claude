# Zig Testing Strategy

## Language Characteristics

- **Paradigm**: Systems programming, low-level control
- **Type System**: Strong static typing, comptime
- **Memory**: Manual memory management, no hidden allocations
- **Concurrency**: Async/await, no runtime

## Testing Pyramid

```
        /    Fuzz Tests     \      <- zig test with fuzzing
       /   Integration       \     <- Multi-module tests
      /     Unit Tests        \    <- Built-in test blocks
     /__________________________\
```

## Primary Framework: Built-in Testing

### Project Structure

```
project/
├── src/
│   ├── main.zig
│   ├── lib.zig
│   └── utils.zig
├── tests/
│   ├── integration_test.zig
│   └── fuzz_test.zig
├── build.zig
└── build.zig.zon
```

### Basic Test Patterns

```zig
// src/lib.zig
const std = @import("std");
const testing = std.testing;

pub fn add(a: i32, b: i32) i32 {
    return a + b;
}

pub fn divide(a: i32, b: i32) !i32 {
    if (b == 0) return error.DivisionByZero;
    return @divTrunc(a, b);
}

// Tests are defined inline
test "add positive numbers" {
    try testing.expectEqual(@as(i32, 5), add(2, 3));
}

test "add negative numbers" {
    try testing.expectEqual(@as(i32, -3), add(-1, -2));
}

test "add with zero" {
    try testing.expectEqual(@as(i32, 5), add(5, 0));
    try testing.expectEqual(@as(i32, 5), add(0, 5));
}

test "divide successfully" {
    const result = try divide(10, 2);
    try testing.expectEqual(@as(i32, 5), result);
}

test "divide by zero returns error" {
    const result = divide(10, 0);
    try testing.expectError(error.DivisionByZero, result);
}
```

## Testing with Allocators

```zig
const std = @import("std");
const testing = std.testing;

pub fn ArrayList(comptime T: type) type {
    return struct {
        const Self = @This();
        items: []T,
        allocator: std.mem.Allocator,
        
        pub fn init(allocator: std.mem.Allocator) Self {
            return .{
                .items = &[_]T{},
                .allocator = allocator,
            };
        }
        
        pub fn deinit(self: *Self) void {
            self.allocator.free(self.items);
        }
        
        pub fn append(self: *Self, item: T) !void {
            const new_items = try self.allocator.realloc(
                self.items,
                self.items.len + 1
            );
            new_items[new_items.len - 1] = item;
            self.items = new_items;
        }
    };
}

test "ArrayList with testing allocator" {
    // testing.allocator detects memory leaks
    var list = ArrayList(i32).init(testing.allocator);
    defer list.deinit();
    
    try list.append(1);
    try list.append(2);
    try list.append(3);
    
    try testing.expectEqual(@as(usize, 3), list.items.len);
    try testing.expectEqual(@as(i32, 2), list.items[1]);
}

test "ArrayList with failing allocator" {
    // Test allocation failure handling
    var failing = testing.failing_allocator;
    var list = ArrayList(i32).init(failing.allocator());
    defer list.deinit();
    
    const result = list.append(1);
    try testing.expectError(error.OutOfMemory, result);
}
```

## Testing Async Code

```zig
const std = @import("std");
const testing = std.testing;

fn asyncFetch(url: []const u8) ![]const u8 {
    // Simulated async operation
    var frame = async fetchImpl(url);
    return await frame;
}

fn fetchImpl(url: []const u8) ![]const u8 {
    _ = url;
    return "response data";
}

test "async operation" {
    const result = try asyncFetch("http://example.com");
    try testing.expectEqualStrings("response data", result);
}

// Testing with event loop
test "async with timeout" {
    const S = struct {
        fn asyncOp() !void {
            std.time.sleep(100 * std.time.ns_per_ms);
        }
    };
    
    var frame = async S.asyncOp();
    
    // Set up timeout
    const start = std.time.milliTimestamp();
    const result = await frame;
    const elapsed = std.time.milliTimestamp() - start;
    
    try testing.expect(elapsed >= 100);
    try testing.expect(result == {});
}
```

## Comptime Testing

```zig
const std = @import("std");
const testing = std.testing;

fn comptimeMax(comptime a: anytype, comptime b: anytype) @TypeOf(a) {
    return if (a > b) a else b;
}

fn StaticArray(comptime T: type, comptime size: usize) type {
    return struct {
        data: [size]T = undefined,
        len: usize = 0,
        
        const Self = @This();
        const capacity = size;
        
        pub fn append(self: *Self, item: T) !void {
            if (self.len >= size) return error.Overflow;
            self.data[self.len] = item;
            self.len += 1;
        }
    };
}

test "comptime function" {
    comptime {
        try testing.expectEqual(@as(i32, 10), comptimeMax(5, 10));
        try testing.expectEqual(@as(i32, 5), comptimeMax(5, 3));
    }
}

test "comptime type generation" {
    var arr = StaticArray(i32, 5){};
    try arr.append(1);
    try arr.append(2);
    
    try testing.expectEqual(@as(usize, 2), arr.len);
    try testing.expectEqual(@as(usize, 5), StaticArray(i32, 5).capacity);
}
```

## Fuzz Testing

```zig
const std = @import("std");
const testing = std.testing;

fn parseNumber(input: []const u8) !i32 {
    return std.fmt.parseInt(i32, input, 10);
}

fn safeParse(input: []const u8) ?i32 {
    return parseNumber(input) catch null;
}

test "fuzz parseNumber" {
    // Zig's built-in fuzzer
    const input = std.testing.fuzz.sliceOfSlices(u8, 0, 100);
    
    for (input) |slice| {
        _ = safeParse(slice);
        // If we get here without crashing, the input was handled safely
    }
}

// Property-based style testing
test "parse-format roundtrip" {
    var prng = std.rand.DefaultPrng.init(0);
    const random = prng.random();
    
    for (0..1000) |_| {
        const value = random.int(i32);
        var buf: [20]u8 = undefined;
        const formatted = std.fmt.bufPrint(&buf, "{d}", .{value}) catch unreachable;
        const parsed = try parseNumber(formatted);
        try testing.expectEqual(value, parsed);
    }
}
```

## Testing Error Handling

```zig
const std = @import("std");
const testing = std.testing;

const FileError = error{
    NotFound,
    PermissionDenied,
    IoError,
};

fn readFile(path: []const u8) FileError![]const u8 {
    if (std.mem.eql(u8, path, "missing.txt")) {
        return error.NotFound;
    }
    if (std.mem.eql(u8, path, "protected.txt")) {
        return error.PermissionDenied;
    }
    return "file contents";
}

test "file not found error" {
    const result = readFile("missing.txt");
    try testing.expectError(error.NotFound, result);
}

test "permission denied error" {
    const result = readFile("protected.txt");
    try testing.expectError(error.PermissionDenied, result);
}

test "successful read" {
    const contents = try readFile("exists.txt");
    try testing.expectEqualStrings("file contents", contents);
}

// Test error union
test "error union handling" {
    const MaybeInt = error{Overflow}!i32;
    
    const success: MaybeInt = 42;
    try testing.expectEqual(@as(i32, 42), try success);
    
    const failure: MaybeInt = error.Overflow;
    try testing.expectError(error.Overflow, failure);
}
```

## Integration Tests

```zig
// tests/integration_test.zig
const std = @import("std");
const testing = std.testing;
const lib = @import("lib");  // Import main library

test "full workflow" {
    // Initialize system
    var system = try lib.System.init(testing.allocator);
    defer system.deinit();
    
    // Perform operations
    try system.connect("localhost:8080");
    try system.authenticate("user", "pass");
    
    const data = try system.fetchData();
    try testing.expect(data.len > 0);
    
    try system.processData(data);
    
    const result = try system.getResult();
    try testing.expectEqual(@as(u32, 42), result.code);
}

test "concurrent access" {
    var system = try lib.System.init(testing.allocator);
    defer system.deinit();
    
    // Spawn multiple threads
    var threads: [4]std.Thread = undefined;
    for (&threads, 0..) |*thread, i| {
        thread.* = try std.Thread.spawn(.{}, worker, .{system, i});
    }
    
    // Wait for completion
    for (threads) |thread| {
        thread.join();
    }
    
    try testing.expectEqual(@as(u32, 4), system.completedCount());
}

fn worker(system: *lib.System, id: usize) void {
    system.doWork(id) catch {};
}
```

## Build Configuration

```zig
// build.zig
const std = @import("std");

pub fn build(b: *std.Build) void {
    const target = b.standardTargetOptions(.{});
    const optimize = b.standardOptimizeOption(.{});
    
    // Library
    const lib = b.addStaticLibrary(.{
        .name = "mylib",
        .root_source_file = .{ .path = "src/lib.zig" },
        .target = target,
        .optimize = optimize,
    });
    
    // Unit tests
    const lib_unit_tests = b.addTest(.{
        .root_source_file = .{ .path = "src/lib.zig" },
        .target = target,
        .optimize = optimize,
    });
    
    const run_lib_unit_tests = b.addRunArtifact(lib_unit_tests);
    
    // Integration tests
    const integration_tests = b.addTest(.{
        .root_source_file = .{ .path = "tests/integration_test.zig" },
        .target = target,
        .optimize = optimize,
    });
    integration_tests.addModule("lib", lib.module);
    
    const run_integration_tests = b.addRunArtifact(integration_tests);
    
    // Test step
    const test_step = b.step("test", "Run all tests");
    test_step.dependOn(&run_lib_unit_tests.step);
    test_step.dependOn(&run_integration_tests.step);
}
```

## Commands

```bash
# Run all tests in file
zig test src/lib.zig

# Run specific test
zig test src/lib.zig --test-filter "add positive"

# Run with build system
zig build test

# Run with verbose output
zig test src/lib.zig --summary all

# Run release tests
zig test src/lib.zig -OReleaseFast

# Generate test coverage (with kcov)
kcov coverage zig test src/lib.zig

# Run fuzz tests
zig test src/lib.zig --fuzz
```

## Best Practices

1. **Use testing.allocator** - Detects memory leaks automatically
2. **Test comptime code** - Validate compile-time computations
3. **Use error unions** - Explicit error handling in tests
4. **Test with failing allocator** - Verify OOM handling
5. **Keep tests inline** - Tests next to code they test
6. **Use build.zig for integration** - Separate unit and integration tests
