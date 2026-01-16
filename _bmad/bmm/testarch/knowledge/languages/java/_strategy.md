# Java Testing Strategy

## Language Profile
- **Family**: C-Family (Object-Oriented)
- **Paradigms**: Object-oriented, imperative, some functional (Java 8+)
- **Type System**: Static, strongly typed
- **Testing Culture**: Mature ecosystem with extensive tooling

## Primary Test Framework: JUnit 5

### Basic Test Structure
```java
import org.junit.jupiter.api.*;
import static org.junit.jupiter.api.Assertions.*;

class CalculatorTest {
    
    private Calculator calculator;
    
    @BeforeEach
    void setUp() {
        calculator = new Calculator();
    }
    
    @Test
    @DisplayName("Addition of two positive numbers")
    void testAddition() {
        assertEquals(4, calculator.add(2, 2));
    }
    
    @Test
    void testDivisionByZero() {
        assertThrows(ArithmeticException.class, () -> {
            calculator.divide(1, 0);
        });
    }
    
    @Nested
    class WhenSubtracting {
        @Test
        void shouldReturnNegativeForLargerSubtrahend() {
            assertEquals(-2, calculator.subtract(3, 5));
        }
    }
}
```

### Assertions (JUnit 5)
- `assertEquals(expected, actual)`
- `assertNotEquals(unexpected, actual)`
- `assertTrue(condition)` / `assertFalse(condition)`
- `assertNull(object)` / `assertNotNull(object)`
- `assertThrows(ExceptionClass.class, executable)`
- `assertTimeout(duration, executable)`
- `assertAll(executables...)` - Grouped assertions

### Test Lifecycle
```java
@BeforeAll
static void initAll() { }

@BeforeEach
void init() { }

@AfterEach
void tearDown() { }

@AfterAll
static void tearDownAll() { }
```

## AssertJ (Fluent Assertions)
```java
import static org.assertj.core.api.Assertions.*;

@Test
void testWithAssertJ() {
    assertThat(list)
        .hasSize(3)
        .contains("item1", "item2")
        .doesNotContain("item4");
    
    assertThat(person)
        .extracting(Person::getName, Person::getAge)
        .containsExactly("John", 30);
}
```

## Mocking with Mockito
```java
import org.mockito.Mock;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ServiceTest {
    
    @Mock
    private Repository repository;
    
    @InjectMocks
    private Service service;
    
    @Test
    void testServiceMethod() {
        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        
        Result result = service.process(1L);
        
        assertThat(result).isNotNull();
        verify(repository).findById(1L);
        verify(repository, never()).delete(any());
    }
}
```

## Parameterized Tests
```java
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.*;

@ParameterizedTest
@ValueSource(strings = {"hello", "world"})
void testWithStrings(String value) {
    assertThat(value).isNotEmpty();
}

@ParameterizedTest
@CsvSource({
    "1, 1, 2",
    "2, 3, 5",
    "10, 20, 30"
})
void testAddition(int a, int b, int expected) {
    assertEquals(expected, calculator.add(a, b));
}

@ParameterizedTest
@MethodSource("provideTestCases")
void testWithMethodSource(String input, int expected) {
    assertEquals(expected, processor.process(input));
}

static Stream<Arguments> provideTestCases() {
    return Stream.of(
        Arguments.of("hello", 5),
        Arguments.of("world", 5)
    );
}
```

## Integration Testing

### Spring Boot Test
```java
@SpringBootTest
@AutoConfigureMockMvc
class IntegrationTest {
    
    @Autowired
    private MockMvc mockMvc;
    
    @Test
    void testGetEndpoint() throws Exception {
        mockMvc.perform(get("/api/items"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$[0].name").value("Item 1"));
    }
}
```

### TestContainers
```java
@Testcontainers
class DatabaseTest {
    
    @Container
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:15");
    
    @DynamicPropertySource
    static void configureProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", postgres::getJdbcUrl);
    }
    
    @Test
    void testDatabaseOperation() {
        // Test with real database
    }
}
```

## Test Organization
```
src/
  main/java/
    com/example/
      Application.java
  test/java/
    com/example/
      ApplicationTest.java        # Unit tests
      integration/
        ApiIntegrationTest.java   # Integration tests
  test/resources/
    application-test.properties
```

## Build Tool Integration

### Maven (pom.xml)
```xml
<dependencies>
    <dependency>
        <groupId>org.junit.jupiter</groupId>
        <artifactId>junit-jupiter</artifactId>
        <version>5.10.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.mockito</groupId>
        <artifactId>mockito-junit-jupiter</artifactId>
        <version>5.5.0</version>
        <scope>test</scope>
    </dependency>
    <dependency>
        <groupId>org.assertj</groupId>
        <artifactId>assertj-core</artifactId>
        <version>3.24.2</version>
        <scope>test</scope>
    </dependency>
</dependencies>
```

### Gradle (build.gradle)
```groovy
dependencies {
    testImplementation 'org.junit.jupiter:junit-jupiter:5.10.0'
    testImplementation 'org.mockito:mockito-junit-jupiter:5.5.0'
    testImplementation 'org.assertj:assertj-core:3.24.2'
}

test {
    useJUnitPlatform()
}
```

## Coverage Tools

### JaCoCo
```xml
<plugin>
    <groupId>org.jacoco</groupId>
    <artifactId>jacoco-maven-plugin</artifactId>
    <version>0.8.10</version>
    <executions>
        <execution>
            <goals>
                <goal>prepare-agent</goal>
            </goals>
        </execution>
        <execution>
            <id>report</id>
            <phase>test</phase>
            <goals>
                <goal>report</goal>
            </goals>
        </execution>
    </executions>
</plugin>
```

## File Pattern Detection
- `pom.xml` or `build.gradle` - Build configuration
- `*.java` - Java source files
- `src/main/java/**` - Main sources
- `src/test/java/**` - Test sources
- `*Test.java`, `*Tests.java`, `*IT.java` - Test files

## Recommended Test Stack
1. **Unit**: JUnit 5
2. **Assertions**: AssertJ
3. **Mocking**: Mockito
4. **Integration**: Spring Boot Test / TestContainers
5. **Coverage**: JaCoCo
6. **BDD**: Cucumber (optional)
7. **Contract**: Spring Cloud Contract

## CI Configuration (GitHub Actions)
```yaml
name: Java CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Build with Maven
        run: mvn -B verify --file pom.xml
        
      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: target/site/jacoco/jacoco.xml
```

## Java-Specific Considerations

### Testing Private Methods
- Generally avoid; test through public API
- Use reflection if absolutely necessary
- Consider package-private visibility for testability

### Static Method Mocking
```java
try (MockedStatic<StaticClass> mocked = mockStatic(StaticClass.class)) {
    mocked.when(StaticClass::staticMethod).thenReturn("mocked");
    // Test code
}
```

### Testing Exceptions
```java
@Test
void testException() {
    Exception exception = assertThrows(
        IllegalArgumentException.class,
        () -> service.process(null)
    );
    
    assertThat(exception.getMessage()).contains("cannot be null");
}
```

### Testing Async Code
```java
@Test
void testAsync() throws Exception {
    CompletableFuture<String> future = service.asyncOperation();
    
    String result = future.get(5, TimeUnit.SECONDS);
    
    assertThat(result).isEqualTo("expected");
}
```
