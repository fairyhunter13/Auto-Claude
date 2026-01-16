# Dart Testing Strategy

## Language Characteristics

- **Paradigm**: Object-oriented, functional features
- **Type System**: Sound null safety, static typing with inference
- **Runtime**: Dart VM, compiles to JavaScript/native
- **Primary Use**: Flutter mobile/web apps, server-side

## Testing Pyramid

```
        /   Widget Tests    \      <- Flutter widget testing
       /  Integration Tests  \     <- integration_test package
      /     Unit Tests        \    <- test package
     /__________________________\
```

## Primary Framework: test package

### Installation

```yaml
# pubspec.yaml
dev_dependencies:
  test: ^1.24.0
  mockito: ^5.4.0
  build_runner: ^2.4.0
  mocktail: ^1.0.0
  fake_async: ^1.3.0
```

### Project Structure

```
project/
├── lib/
│   ├── src/
│   │   └── calculator.dart
│   └── mylib.dart
├── test/
│   ├── calculator_test.dart
│   ├── integration/
│   │   └── api_test.dart
│   └── helpers/
│       └── test_helpers.dart
├── pubspec.yaml
└── analysis_options.yaml
```

### Basic Test Patterns

```dart
// test/calculator_test.dart
import 'package:test/test.dart';
import 'package:mylib/src/calculator.dart';

void main() {
  group('Calculator', () {
    late Calculator calculator;
    
    setUp(() {
      calculator = Calculator();
    });
    
    tearDown(() {
      // Cleanup if needed
    });
    
    test('adds two numbers', () {
      expect(calculator.add(2, 3), equals(5));
    });
    
    test('subtracts two numbers', () {
      expect(calculator.subtract(5, 3), equals(2));
    });
    
    test('throws on division by zero', () {
      expect(
        () => calculator.divide(10, 0),
        throwsA(isA<ArgumentError>()),
      );
    });
    
    test('handles negative numbers', () {
      expect(calculator.add(-1, -2), equals(-3));
      expect(calculator.multiply(-2, 3), equals(-6));
    });
  });
  
  group('Advanced matchers', () {
    test('collection matchers', () {
      expect([1, 2, 3], contains(2));
      expect([1, 2, 3], hasLength(3));
      expect([1, 2, 3], orderedEquals([1, 2, 3]));
      expect({'a': 1, 'b': 2}, containsPair('a', 1));
    });
    
    test('string matchers', () {
      expect('hello world', startsWith('hello'));
      expect('hello world', endsWith('world'));
      expect('hello world', contains('lo wo'));
      expect('HELLO', equalsIgnoringCase('hello'));
    });
    
    test('numeric matchers', () {
      expect(3.14159, closeTo(3.14, 0.01));
      expect(10, greaterThan(5));
      expect(5, inInclusiveRange(1, 10));
    });
  });
}
```

## Async Testing

```dart
import 'package:test/test.dart';

void main() {
  group('Async operations', () {
    test('async/await', () async {
      final result = await fetchData();
      expect(result, equals('data'));
    });
    
    test('expectLater with future', () {
      expect(fetchData(), completion(equals('data')));
    });
    
    test('expectLater with stream', () {
      final stream = Stream.fromIterable([1, 2, 3]);
      expect(stream, emitsInOrder([1, 2, 3]));
    });
    
    test('stream matchers', () {
      final stream = Stream.fromIterable([1, 2, 3, 4, 5]);
      expect(stream, emitsInOrder([
        emits(1),
        emits(2),
        emitsThrough(5),
        emitsDone,
      ]));
    });
    
    test('error streams', () {
      final stream = Stream.error(Exception('oops'));
      expect(stream, emitsError(isA<Exception>()));
    });
  });
}
```

## Mocking with Mockito

```dart
import 'package:mockito/mockito.dart';
import 'package:mockito/annotations.dart';
import 'package:test/test.dart';

// Generate mocks
@GenerateMocks([UserRepository, ApiClient])
import 'user_service_test.mocks.dart';

void main() {
  group('UserService', () {
    late MockUserRepository mockRepo;
    late MockApiClient mockApi;
    late UserService service;
    
    setUp(() {
      mockRepo = MockUserRepository();
      mockApi = MockApiClient();
      service = UserService(mockRepo, mockApi);
    });
    
    test('getUser returns user from repository', () async {
      final user = User(id: 1, name: 'John');
      when(mockRepo.getUser(1)).thenAnswer((_) async => user);
      
      final result = await service.getUser(1);
      
      expect(result, equals(user));
      verify(mockRepo.getUser(1)).called(1);
    });
    
    test('createUser saves to repository', () async {
      final user = User(id: 0, name: 'Jane');
      when(mockRepo.saveUser(any)).thenAnswer((_) async => User(id: 1, name: 'Jane'));
      
      final result = await service.createUser(user);
      
      expect(result.id, equals(1));
      verify(mockRepo.saveUser(user)).called(1);
    });
    
    test('handles repository errors', () async {
      when(mockRepo.getUser(any)).thenThrow(Exception('Database error'));
      
      expect(
        () => service.getUser(1),
        throwsA(isA<ServiceException>()),
      );
    });
  });
}
```

## Mocking with Mocktail (No Code Generation)

```dart
import 'package:mocktail/mocktail.dart';
import 'package:test/test.dart';

class MockUserRepository extends Mock implements UserRepository {}

void main() {
  group('UserService with Mocktail', () {
    late MockUserRepository mockRepo;
    late UserService service;
    
    setUpAll(() {
      registerFallbackValue(User(id: 0, name: ''));
    });
    
    setUp(() {
      mockRepo = MockUserRepository();
      service = UserService(mockRepo);
    });
    
    test('fetches user', () async {
      when(() => mockRepo.getUser(any()))
          .thenAnswer((_) async => User(id: 1, name: 'Test'));
      
      final result = await service.getUser(1);
      
      expect(result.name, equals('Test'));
      verify(() => mockRepo.getUser(1)).called(1);
    });
  });
}
```

## Testing with Fake Async

```dart
import 'package:fake_async/fake_async.dart';
import 'package:test/test.dart';

void main() {
  group('Timer-based operations', () {
    test('debounce works correctly', () {
      fakeAsync((async) {
        final debouncer = Debouncer(duration: Duration(milliseconds: 500));
        var callCount = 0;
        
        debouncer.run(() => callCount++);
        debouncer.run(() => callCount++);
        debouncer.run(() => callCount++);
        
        expect(callCount, equals(0));
        
        async.elapse(Duration(milliseconds: 500));
        
        expect(callCount, equals(1));
      });
    });
    
    test('retry with exponential backoff', () {
      fakeAsync((async) {
        var attempts = 0;
        
        retryWithBackoff(
          () async {
            attempts++;
            if (attempts < 3) throw Exception('Retry');
            return 'success';
          },
          maxAttempts: 5,
        );
        
        async.elapse(Duration(seconds: 10));
        
        expect(attempts, equals(3));
      });
    });
  });
}
```

## Flutter Widget Testing

```dart
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  group('Counter Widget', () {
    testWidgets('displays initial value', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget(initialValue: 5)),
      );
      
      expect(find.text('5'), findsOneWidget);
    });
    
    testWidgets('increments on button press', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget()),
      );
      
      expect(find.text('0'), findsOneWidget);
      
      await tester.tap(find.byIcon(Icons.add));
      await tester.pump();
      
      expect(find.text('1'), findsOneWidget);
    });
    
    testWidgets('handles rapid taps', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: CounterWidget()),
      );
      
      for (var i = 0; i < 10; i++) {
        await tester.tap(find.byIcon(Icons.add));
      }
      await tester.pump();
      
      expect(find.text('10'), findsOneWidget);
    });
  });
  
  group('Golden tests', () {
    testWidgets('matches golden file', (tester) async {
      await tester.pumpWidget(
        const MaterialApp(home: MyComplexWidget()),
      );
      
      await expectLater(
        find.byType(MyComplexWidget),
        matchesGoldenFile('goldens/complex_widget.png'),
      );
    });
  });
}
```

## Integration Testing

```dart
// integration_test/app_test.dart
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:myapp/main.dart' as app;

void main() {
  IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  
  group('End-to-end tests', () {
    testWidgets('complete user flow', (tester) async {
      app.main();
      await tester.pumpAndSettle();
      
      // Login
      await tester.enterText(find.byKey(Key('email')), 'test@example.com');
      await tester.enterText(find.byKey(Key('password')), 'password123');
      await tester.tap(find.byKey(Key('login_button')));
      await tester.pumpAndSettle();
      
      // Verify home screen
      expect(find.text('Welcome'), findsOneWidget);
      
      // Navigate to profile
      await tester.tap(find.byIcon(Icons.person));
      await tester.pumpAndSettle();
      
      expect(find.text('test@example.com'), findsOneWidget);
    });
  });
}
```

## Commands

```bash
# Run all tests
dart test

# Run with coverage
dart test --coverage=coverage
dart pub global activate coverage
dart pub global run coverage:format_coverage --lcov -i coverage -o coverage/lcov.info

# Run specific test file
dart test test/calculator_test.dart

# Run tests matching pattern
dart test --name "adds two"

# Run Flutter tests
flutter test

# Run Flutter integration tests
flutter test integration_test/app_test.dart

# Update golden files
flutter test --update-goldens

# Run with reporter
dart test --reporter expanded
```

## Best Practices

1. **Use group() for organization** - Logical test grouping
2. **Use setUp/tearDown** - Proper test isolation
3. **Prefer Mocktail over Mockito** - No code generation needed
4. **Use fake_async for time** - Deterministic timer testing
5. **Write widget tests** - Test UI components in isolation
6. **Use golden tests** - Visual regression testing
