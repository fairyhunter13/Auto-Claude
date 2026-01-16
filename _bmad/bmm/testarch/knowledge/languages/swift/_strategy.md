# Swift Testing Strategy

## Language Profile
- **Family**: C-Family (Modern Systems)
- **Paradigms**: Object-oriented, protocol-oriented, functional
- **Type System**: Static, strongly typed, optionals
- **Testing Culture**: XCTest as built-in standard, Swift Testing (new)

## Primary Test Framework: XCTest

### Basic Test Structure
```swift
import XCTest
@testable import MyApp

final class CalculatorTests: XCTestCase {
    
    var calculator: Calculator!
    
    override func setUpWithError() throws {
        calculator = Calculator()
    }
    
    override func tearDownWithError() throws {
        calculator = nil
    }
    
    func testAddition() throws {
        let result = calculator.add(2, 3)
        XCTAssertEqual(result, 5)
    }
    
    func testDivisionByZero() throws {
        XCTAssertThrowsError(try calculator.divide(1, 0)) { error in
            XCTAssertEqual(error as? CalculatorError, .divisionByZero)
        }
    }
    
    func testPerformance() throws {
        measure {
            _ = calculator.expensiveOperation()
        }
    }
}
```

### XCTest Assertions
```swift
// Equality
XCTAssertEqual(actual, expected)
XCTAssertNotEqual(actual, unexpected)
XCTAssertIdentical(obj1, obj2)  // Same instance

// Boolean
XCTAssertTrue(condition)
XCTAssertFalse(condition)

// Nil checks
XCTAssertNil(optional)
XCTAssertNotNil(optional)

// Errors
XCTAssertThrowsError(try throwingFunction())
XCTAssertNoThrow(try nonThrowingFunction())

// Comparisons
XCTAssertGreaterThan(a, b)
XCTAssertLessThanOrEqual(a, b)

// Unwrapping
let value = try XCTUnwrap(optional)

// Failing
XCTFail("Test failed with reason")
```

## Swift Testing (Swift 6+)
```swift
import Testing

@Test("Addition of two positive numbers")
func addTwoNumbers() {
    let calculator = Calculator()
    let result = calculator.add(2, 3)
    #expect(result == 5)
}

@Test
func divisionByZero() throws {
    let calculator = Calculator()
    #expect(throws: CalculatorError.divisionByZero) {
        try calculator.divide(1, 0)
    }
}

@Test(arguments: [
    (1, 2, 3),
    (2, 3, 5),
    (-1, 1, 0)
])
func additionWithArguments(a: Int, b: Int, expected: Int) {
    let calculator = Calculator()
    #expect(calculator.add(a, b) == expected)
}

@Suite("Calculator Tests")
struct CalculatorSuite {
    let calculator = Calculator()
    
    @Test func addition() {
        #expect(calculator.add(2, 3) == 5)
    }
    
    @Test func subtraction() {
        #expect(calculator.subtract(5, 3) == 2)
    }
}
```

### Swift Testing Expectations
```swift
#expect(condition)
#expect(a == b)
#expect(a != b)
#expect(throws: ErrorType.self) { try throwing() }
#expect(throws: Never.self) { nonThrowing() }

// With custom message
#expect(result == expected, "Result should match expected value")
```

## Async Testing

### XCTest Async
```swift
func testAsyncOperation() async throws {
    let result = try await service.fetchData()
    XCTAssertNotNil(result)
}

// With expectations (older pattern)
func testAsyncWithExpectation() {
    let expectation = expectation(description: "Data fetched")
    
    service.fetchData { result in
        XCTAssertNotNil(result)
        expectation.fulfill()
    }
    
    wait(for: [expectation], timeout: 5.0)
}
```

### Swift Testing Async
```swift
@Test
func asyncOperation() async throws {
    let result = try await service.fetchData()
    #expect(result != nil)
}
```

## Mocking in Swift

### Protocol-Based Mocking
```swift
protocol Repository {
    func find(id: Int) -> Entity?
    func save(_ entity: Entity)
}

class MockRepository: Repository {
    var findCallCount = 0
    var findResult: Entity?
    
    func find(id: Int) -> Entity? {
        findCallCount += 1
        return findResult
    }
    
    var savedEntities: [Entity] = []
    
    func save(_ entity: Entity) {
        savedEntities.append(entity)
    }
}

class ServiceTests: XCTestCase {
    func testService() {
        let mockRepo = MockRepository()
        mockRepo.findResult = Entity(id: 1, name: "Test")
        
        let service = Service(repository: mockRepo)
        let result = service.process(1)
        
        XCTAssertEqual(mockRepo.findCallCount, 1)
        XCTAssertNotNil(result)
    }
}
```

### Using Cuckoo (Mocking Framework)
```swift
import Cuckoo

class ServiceTests: XCTestCase {
    func testWithCuckoo() {
        let mock = MockRepository()
        stub(mock) { stub in
            when(stub.find(id: 1)).thenReturn(Entity(id: 1))
        }
        
        let service = Service(repository: mock)
        _ = service.process(1)
        
        verify(mock).find(id: 1)
    }
}
```

## UI Testing (XCUITest)
```swift
import XCTest

final class MyAppUITests: XCTestCase {
    
    var app: XCUIApplication!
    
    override func setUpWithError() throws {
        continueAfterFailure = false
        app = XCUIApplication()
        app.launch()
    }
    
    func testLogin() throws {
        let emailField = app.textFields["email"]
        let passwordField = app.secureTextFields["password"]
        let loginButton = app.buttons["Login"]
        
        emailField.tap()
        emailField.typeText("user@example.com")
        
        passwordField.tap()
        passwordField.typeText("password123")
        
        loginButton.tap()
        
        XCTAssertTrue(app.staticTexts["Welcome"].exists)
    }
    
    func testPerformanceExample() throws {
        measure(metrics: [XCTClockMetric()]) {
            app.launch()
        }
    }
}
```

## Snapshot Testing (with Point-Free)
```swift
import SnapshotTesting
import XCTest

final class ViewSnapshotTests: XCTestCase {
    func testViewSnapshot() {
        let view = MyView()
        assertSnapshot(matching: view, as: .image)
    }
    
    func testViewControllerSnapshot() {
        let vc = MyViewController()
        assertSnapshot(matching: vc, as: .image(on: .iPhone13))
    }
}
```

## Test Organization
```
MyApp/
  Sources/
    Calculator.swift
  Tests/
    MyAppTests/
      CalculatorTests.swift
    MyAppUITests/
      MyAppUITests.swift
Package.swift (or .xcodeproj)
```

## Package.swift Configuration
```swift
// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "MyApp",
    platforms: [.iOS(.v15), .macOS(.v12)],
    products: [
        .library(name: "MyApp", targets: ["MyApp"]),
    ],
    dependencies: [
        .package(url: "https://github.com/pointfreeco/swift-snapshot-testing", from: "1.12.0"),
    ],
    targets: [
        .target(name: "MyApp"),
        .testTarget(
            name: "MyAppTests",
            dependencies: [
                "MyApp",
                .product(name: "SnapshotTesting", package: "swift-snapshot-testing"),
            ]
        ),
    ]
)
```

## Coverage Tools

### Xcode Coverage
```bash
# Enable in Xcode: Product > Scheme > Edit Scheme > Test > Code Coverage
# Or via xcodebuild:
xcodebuild test \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 15' \
  -enableCodeCoverage YES
```

### Swift Package Manager
```bash
swift test --enable-code-coverage
xcrun llvm-cov report .build/debug/MyAppPackageTests.xctest/Contents/MacOS/MyAppPackageTests \
  -instr-profile .build/debug/codecov/default.profdata
```

## File Pattern Detection
- `Package.swift` - SPM manifest
- `*.xcodeproj`, `*.xcworkspace` - Xcode project
- `*.swift` - Swift source files
- `Tests/` - Test directory
- `*Tests.swift` - Test files
- `*UITests.swift` - UI test files

## Recommended Test Stack
1. **Unit**: XCTest or Swift Testing (Swift 6+)
2. **Mocking**: Protocol-based or Cuckoo
3. **UI**: XCUITest
4. **Snapshot**: swift-snapshot-testing
5. **Coverage**: Xcode built-in
6. **BDD**: Quick/Nimble (optional)

## CI Configuration (GitHub Actions)
```yaml
name: Swift CI

on: [push, pull_request]

jobs:
  test-ios:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Select Xcode
        run: sudo xcode-select -s /Applications/Xcode_15.0.app
        
      - name: Build and Test
        run: |
          xcodebuild test \
            -scheme MyApp \
            -destination 'platform=iOS Simulator,name=iPhone 15' \
            -enableCodeCoverage YES \
            -resultBundlePath TestResults.xcresult
            
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          xcode: true
          xcode_archive_path: TestResults.xcresult

  test-spm:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v4
      - name: Build
        run: swift build
      - name: Test
        run: swift test --enable-code-coverage
```

## Swift-Specific Considerations

### Testing Optionals
```swift
func testOptionalUnwrapping() throws {
    let value: String? = fetchValue()
    
    // Safe unwrap in test
    let unwrapped = try XCTUnwrap(value)
    XCTAssertEqual(unwrapped, "expected")
}

// With Swift Testing
@Test
func optionalHandling() throws {
    let value: String? = fetchValue()
    let unwrapped = try #require(value)
    #expect(unwrapped == "expected")
}
```

### Testing Result Types
```swift
func testResultType() {
    let result: Result<String, Error> = service.fetchData()
    
    switch result {
    case .success(let data):
        XCTAssertEqual(data, "expected")
    case .failure(let error):
        XCTFail("Unexpected error: \(error)")
    }
}
```

### Testing Combine Publishers
```swift
import Combine

var cancellables = Set<AnyCancellable>()

func testPublisher() {
    let expectation = expectation(description: "Value received")
    
    publisher
        .sink(receiveCompletion: { _ in },
              receiveValue: { value in
            XCTAssertEqual(value, expected)
            expectation.fulfill()
        })
        .store(in: &cancellables)
    
    wait(for: [expectation], timeout: 1.0)
}
```

### Testing SwiftUI Views
```swift
import ViewInspector

struct ContentView: View {
    var body: some View {
        Text("Hello")
    }
}

extension ContentView: Inspectable { }

func testView() throws {
    let view = ContentView()
    let text = try view.inspect().text()
    XCTAssertEqual(try text.string(), "Hello")
}
```

### Testing with Actors (Swift Concurrency)
```swift
actor Counter {
    private var value = 0
    func increment() { value += 1 }
    func getValue() -> Int { value }
}

func testActor() async {
    let counter = Counter()
    await counter.increment()
    let value = await counter.getValue()
    XCTAssertEqual(value, 1)
}
```
