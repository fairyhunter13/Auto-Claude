# Kotlin Testing Strategy

## Language Profile
- **Family**: C-Family (JVM-based)
- **Paradigms**: Object-oriented, functional
- **Type System**: Static, nullable types, type inference
- **Testing Culture**: Leverages JVM ecosystem with Kotlin-specific DSLs

## Primary Test Frameworks

### JUnit 5 with Kotlin
```kotlin
import org.junit.jupiter.api.*
import org.junit.jupiter.api.Assertions.*

class CalculatorTest {
    
    private lateinit var calculator: Calculator
    
    @BeforeEach
    fun setUp() {
        calculator = Calculator()
    }
    
    @Test
    @DisplayName("Addition of two positive numbers")
    fun `should add two positive numbers`() {
        val result = calculator.add(2, 3)
        assertEquals(5, result)
    }
    
    @Test
    fun `should throw exception when dividing by zero`() {
        assertThrows<ArithmeticException> {
            calculator.divide(1, 0)
        }
    }
    
    @Nested
    inner class `When subtracting` {
        @Test
        fun `should return negative for larger subtrahend`() {
            assertEquals(-2, calculator.subtract(3, 5))
        }
    }
}
```

### Kotest (Kotlin-Native Testing)
```kotlin
import io.kotest.core.spec.style.StringSpec
import io.kotest.matchers.shouldBe
import io.kotest.matchers.collections.shouldContain
import io.kotest.assertions.throwables.shouldThrow

class CalculatorSpec : StringSpec({
    
    val calculator = Calculator()
    
    "should add two numbers" {
        calculator.add(2, 3) shouldBe 5
    }
    
    "should throw exception for division by zero" {
        shouldThrow<ArithmeticException> {
            calculator.divide(1, 0)
        }
    }
})

// BehaviorSpec style
class CalculatorBehaviorSpec : BehaviorSpec({
    given("a calculator") {
        val calculator = Calculator()
        
        `when`("adding two numbers") {
            val result = calculator.add(2, 3)
            
            then("it should return the sum") {
                result shouldBe 5
            }
        }
    }
})

// FunSpec style
class CalculatorFunSpec : FunSpec({
    test("addition") {
        Calculator().add(2, 3) shouldBe 5
    }
})
```

### Kotest Matchers
```kotlin
import io.kotest.matchers.*
import io.kotest.matchers.string.*
import io.kotest.matchers.collections.*
import io.kotest.matchers.maps.*

// Basic
result shouldBe expected
result shouldNotBe unexpected

// Strings
string shouldContain "text"
string shouldStartWith "prefix"
string shouldMatch "regex.*"
string.shouldBeEmpty()

// Collections
list shouldContain element
list shouldContainAll listOf(1, 2, 3)
list shouldHaveSize 3
list.shouldBeEmpty()
list.shouldBeSorted()

// Maps
map shouldContainKey "key"
map shouldContainValue "value"
map shouldContain ("key" to "value")

// Nullability
value.shouldBeNull()
value.shouldNotBeNull()

// Types
obj shouldBeInstanceOf<MyClass>()
```

## Mocking with MockK
```kotlin
import io.mockk.*

class ServiceTest {
    
    private val repository = mockk<Repository>()
    private val service = Service(repository)
    
    @BeforeEach
    fun setUp() {
        clearAllMocks()
    }
    
    @Test
    fun `should process entity`() {
        // Arrange
        val entity = Entity(id = 1, name = "Test")
        every { repository.findById(1) } returns entity
        
        // Act
        val result = service.process(1)
        
        // Assert
        result shouldNotBe null
        verify { repository.findById(1) }
        verify(exactly = 0) { repository.delete(any()) }
    }
    
    @Test
    fun `should handle suspend functions`() = runTest {
        coEvery { repository.findByIdAsync(1) } returns entity
        
        val result = service.processAsync(1)
        
        coVerify { repository.findByIdAsync(1) }
    }
}

// Relaxed mocks (return defaults)
val relaxedMock = mockk<Repository>(relaxed = true)

// Spy on real objects
val spy = spyk(RealService())
every { spy.expensiveOperation() } returns "cached"

// Capturing arguments
val slot = slot<Int>()
every { repository.findById(capture(slot)) } returns entity
// slot.captured contains the captured value
```

## Coroutine Testing
```kotlin
import kotlinx.coroutines.test.*
import org.junit.jupiter.api.Test

class CoroutineTest {
    
    @Test
    fun `should test suspend function`() = runTest {
        val result = suspendFunction()
        result shouldBe expected
    }
    
    @Test
    fun `should test with delay`() = runTest {
        val result = functionWithDelay()
        advanceTimeBy(1000)
        result.isCompleted shouldBe true
    }
    
    @Test
    fun `should test flow`() = runTest {
        val flow = dataFlow()
        
        flow.test {
            awaitItem() shouldBe firstItem
            awaitItem() shouldBe secondItem
            awaitComplete()
        }
    }
}
```

## Android Testing (If Android Project)
```kotlin
// Unit Test
@RunWith(RobolectricTestRunner::class)
class ViewModelTest {
    
    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()
    
    @get:Rule
    val mainDispatcherRule = MainDispatcherRule()
    
    @Test
    fun `should update state on action`() = runTest {
        val viewModel = MyViewModel(repository)
        
        viewModel.performAction()
        
        viewModel.state.value shouldBe ExpectedState
    }
}

// Instrumented Test
@RunWith(AndroidJUnit4::class)
class MainActivityTest {
    
    @get:Rule
    val composeTestRule = createComposeRule()
    
    @Test
    fun testButtonClick() {
        composeTestRule.setContent {
            MyComposable()
        }
        
        composeTestRule.onNodeWithText("Click Me").performClick()
        composeTestRule.onNodeWithText("Clicked!").assertIsDisplayed()
    }
}
```

## Spring Boot Testing (If Spring Project)
```kotlin
@SpringBootTest
@AutoConfigureMockMvc
class ApiIntegrationTest {
    
    @Autowired
    private lateinit var mockMvc: MockMvc
    
    @Test
    fun `should return items`() {
        mockMvc.get("/api/items") {
            accept = MediaType.APPLICATION_JSON
        }.andExpect {
            status { isOk() }
            jsonPath("$[0].name") { value("Item 1") }
        }
    }
}
```

## Test Organization
```
src/
  main/kotlin/
    com/example/
      Calculator.kt
  test/kotlin/
    com/example/
      CalculatorTest.kt
      CalculatorSpec.kt  # Kotest
build.gradle.kts
```

## Build Configuration (build.gradle.kts)
```kotlin
plugins {
    kotlin("jvm") version "1.9.0"
}

dependencies {
    // JUnit 5
    testImplementation("org.junit.jupiter:junit-jupiter:5.10.0")
    
    // Kotest
    testImplementation("io.kotest:kotest-runner-junit5:5.7.0")
    testImplementation("io.kotest:kotest-assertions-core:5.7.0")
    testImplementation("io.kotest:kotest-property:5.7.0")
    
    // MockK
    testImplementation("io.mockk:mockk:1.13.0")
    
    // Coroutines testing
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.0")
}

tasks.test {
    useJUnitPlatform()
}
```

## Coverage Tools

### Kover (JetBrains)
```kotlin
plugins {
    id("org.jetbrains.kotlinx.kover") version "0.7.0"
}

// Generate report
// ./gradlew koverHtmlReport
```

### JaCoCo
```kotlin
plugins {
    jacoco
}

tasks.jacocoTestReport {
    reports {
        xml.required.set(true)
        html.required.set(true)
    }
}
```

## File Pattern Detection
- `build.gradle.kts` or `build.gradle` - Gradle config
- `*.kt` - Kotlin source files
- `src/main/kotlin/` - Main sources
- `src/test/kotlin/` - Test sources
- `*Test.kt`, `*Spec.kt` - Test files

## Recommended Test Stack
1. **Unit**: Kotest or JUnit 5
2. **Assertions**: Kotest matchers
3. **Mocking**: MockK
4. **Coroutines**: kotlinx-coroutines-test
5. **Property Testing**: Kotest property testing
6. **Coverage**: Kover or JaCoCo
7. **Android**: Compose testing, Robolectric

## CI Configuration (GitHub Actions)
```yaml
name: Kotlin CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up JDK 17
        uses: actions/setup-java@v3
        with:
          java-version: '17'
          distribution: 'temurin'
          
      - name: Grant execute permission for gradlew
        run: chmod +x gradlew
        
      - name: Run tests
        run: ./gradlew test
        
      - name: Generate coverage report
        run: ./gradlew koverHtmlReport
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: build/reports/kover/xml/report.xml
```

## Kotlin-Specific Considerations

### Testing Extension Functions
```kotlin
// Extension function
fun String.isPalindrome(): Boolean = this == this.reversed()

// Test
@Test
fun `should check palindrome`() {
    "radar".isPalindrome() shouldBe true
    "hello".isPalindrome() shouldBe false
}
```

### Testing Data Classes
```kotlin
data class User(val name: String, val age: Int)

@Test
fun `should compare data classes by value`() {
    val user1 = User("John", 30)
    val user2 = User("John", 30)
    
    user1 shouldBe user2
    user1.copy(age = 31) shouldNotBe user2
}
```

### Testing Sealed Classes
```kotlin
sealed class Result<out T> {
    data class Success<T>(val data: T) : Result<T>()
    data class Error(val message: String) : Result<Nothing>()
}

@Test
fun `should handle sealed class`() {
    val result: Result<String> = Result.Success("data")
    
    when (result) {
        is Result.Success -> result.data shouldBe "data"
        is Result.Error -> fail("Expected success")
    }
}
```

### Testing Inline Functions
```kotlin
// Inline functions are expanded at compile time
// Test the behavior, not the inlining
inline fun <reified T> parseJson(json: String): T = ...

@Test
fun `should parse json`() {
    val result = parseJson<User>("""{"name": "John"}""")
    result.name shouldBe "John"
}
```
