# Scala Testing Strategy

## Language Profile
- **Family**: C-Family (JVM-based, Functional-OOP Hybrid)
- **Paradigms**: Functional, object-oriented, concurrent
- **Type System**: Static, strongly typed, type inference
- **Testing Culture**: Strong FP testing patterns, property-based testing

## Primary Test Frameworks

### ScalaTest
```scala
import org.scalatest.flatspec.AnyFlatSpec
import org.scalatest.matchers.should.Matchers

class CalculatorSpec extends AnyFlatSpec with Matchers {
  
  val calculator = new Calculator()
  
  "A Calculator" should "add two numbers" in {
    calculator.add(2, 3) shouldBe 5
  }
  
  it should "subtract two numbers" in {
    calculator.subtract(5, 3) shouldBe 2
  }
  
  it should "throw an exception for division by zero" in {
    an [ArithmeticException] should be thrownBy {
      calculator.divide(1, 0)
    }
  }
}
```

### ScalaTest Styles
```scala
// FunSpec style (BDD)
class CalculatorFunSpec extends AnyFunSpec with Matchers {
  describe("A Calculator") {
    describe("when adding") {
      it("should return the sum") {
        Calculator.add(2, 3) shouldBe 5
      }
    }
  }
}

// WordSpec style
class CalculatorWordSpec extends AnyWordSpec with Matchers {
  "A Calculator" when {
    "adding numbers" should {
      "return the sum" in {
        Calculator.add(2, 3) shouldBe 5
      }
    }
  }
}

// FreeSpec style
class CalculatorFreeSpec extends AnyFreeSpec with Matchers {
  "A Calculator" - {
    "can add numbers" in {
      Calculator.add(2, 3) shouldBe 5
    }
  }
}
```

### ScalaTest Matchers
```scala
// Equality
result shouldBe expected
result shouldEqual expected
result should === (expected)

// Comparisons
result should be > 5
result should be >= 5
result should be < 10

// Strings
string should startWith ("Hello")
string should endWith ("World")
string should include ("middle")
string should fullyMatch regex """[A-Z][a-z]+"""

// Collections
list should contain (element)
list should contain allOf (1, 2, 3)
list should have length 3
list shouldBe empty

// Types
obj shouldBe a [String]
obj shouldBe an [Int]

// Exceptions
a [IllegalArgumentException] should be thrownBy { code }
the [IllegalArgumentException] thrownBy { code } should have message "error"
```

## MUnit (Lightweigt Alternative)
```scala
import munit.FunSuite

class CalculatorSuite extends FunSuite {
  
  test("addition") {
    val result = Calculator.add(2, 3)
    assertEquals(result, 5)
  }
  
  test("division by zero") {
    intercept[ArithmeticException] {
      Calculator.divide(1, 0)
    }
  }
}

// Fixtures
class DatabaseSuite extends FunSuite {
  val db = FunFixture[Database](
    setup = _ => Database.connect(),
    teardown = db => db.close()
  )
  
  db.test("can query") { database =>
    assert(database.query("SELECT 1").nonEmpty)
  }
}
```

## Specs2
```scala
import org.specs2.mutable.Specification

class CalculatorSpec extends Specification {
  
  "A Calculator" should {
    "add two numbers" in {
      Calculator.add(2, 3) must beEqualTo(5)
    }
    
    "throw exception for division by zero" in {
      Calculator.divide(1, 0) must throwA[ArithmeticException]
    }
  }
}
```

## Property-Based Testing (ScalaCheck)
```scala
import org.scalacheck.Properties
import org.scalacheck.Prop.forAll

object CalculatorProperties extends Properties("Calculator") {
  
  property("addition is commutative") = forAll { (a: Int, b: Int) =>
    Calculator.add(a, b) == Calculator.add(b, a)
  }
  
  property("addition is associative") = forAll { (a: Int, b: Int, c: Int) =>
    Calculator.add(Calculator.add(a, b), c) == Calculator.add(a, Calculator.add(b, c))
  }
}

// With ScalaTest integration
class CalculatorPropertySpec extends AnyFlatSpec 
  with Matchers 
  with ScalaCheckPropertyChecks {
  
  "addition" should "be commutative" in {
    forAll { (a: Int, b: Int) =>
      Calculator.add(a, b) shouldBe Calculator.add(b, a)
    }
  }
}
```

## Mocking with ScalaMock
```scala
import org.scalamock.scalatest.MockFactory

class ServiceSpec extends AnyFlatSpec with Matchers with MockFactory {
  
  "Service" should "call repository" in {
    val mockRepo = mock[Repository]
    (mockRepo.find _).expects(1).returning(Some(Entity(1, "test")))
    
    val service = new Service(mockRepo)
    service.process(1) shouldBe defined
  }
}
```

## Async Testing

### ScalaTest Async
```scala
import org.scalatest.flatspec.AsyncFlatSpec

class AsyncServiceSpec extends AsyncFlatSpec with Matchers {
  
  "AsyncService" should "return future result" in {
    val future = service.fetchData()
    
    future.map { result =>
      result shouldBe "expected"
    }
  }
}
```

### Cats Effect Testing
```scala
import cats.effect.IO
import cats.effect.testing.scalatest.AsyncIOSpec

class IOServiceSpec extends AsyncIOSpec with Matchers {
  
  "IOService" should "return IO result" in {
    service.fetchData().asserting { result =>
      result shouldBe "expected"
    }
  }
}
```

### ZIO Testing
```scala
import zio.test._
import zio.test.Assertion._

object ZIOServiceSpec extends ZIOSpecDefault {
  def spec = suite("ZIOService")(
    test("returns expected result") {
      for {
        result <- service.fetchData
      } yield assert(result)(equalTo("expected"))
    }
  )
}
```

## Test Organization
```
src/
  main/scala/
    com/example/
      Calculator.scala
  test/scala/
    com/example/
      CalculatorSpec.scala
      CalculatorPropertySpec.scala
project/
  build.properties
build.sbt
```

## Build Configuration (build.sbt)
```scala
libraryDependencies ++= Seq(
  // ScalaTest
  "org.scalatest" %% "scalatest" % "3.2.17" % Test,
  
  // ScalaCheck
  "org.scalatestplus" %% "scalacheck-1-17" % "3.2.17.0" % Test,
  
  // ScalaMock
  "org.scalamock" %% "scalamock" % "5.2.0" % Test,
  
  // MUnit
  "org.scalameta" %% "munit" % "0.7.29" % Test,
  
  // Cats Effect Testing
  "org.typelevel" %% "cats-effect-testing-scalatest" % "1.5.0" % Test,
)

testFrameworks += new TestFramework("munit.Framework")
```

## Coverage Tools

### sbt-scoverage
```scala
// project/plugins.sbt
addSbtPlugin("org.scoverage" % "sbt-scoverage" % "2.0.9")

// Generate coverage
// sbt clean coverage test coverageReport
```

## File Pattern Detection
- `build.sbt` - SBT build file
- `*.scala` - Scala source files
- `src/main/scala/` - Main sources
- `src/test/scala/` - Test sources
- `*Spec.scala`, `*Test.scala`, `*Suite.scala` - Test files

## Recommended Test Stack
1. **Unit**: ScalaTest or MUnit
2. **Property**: ScalaCheck
3. **Mocking**: ScalaMock
4. **Async**: Cats Effect Testing or ZIO Test
5. **Coverage**: sbt-scoverage
6. **Integration**: TestContainers-Scala

## CI Configuration (GitHub Actions)
```yaml
name: Scala CI

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
          
      - name: Run tests
        run: sbt test
        
      - name: Generate coverage
        run: sbt clean coverage test coverageReport
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: target/scala-*/scoverage-report/scoverage.xml
```

## Scala-Specific Considerations

### Testing Case Classes
```scala
case class User(name: String, age: Int)

test("case class equality") {
  User("John", 30) shouldBe User("John", 30)
}
```

### Testing Sealed Traits/Enums
```scala
sealed trait Color
case object Red extends Color
case object Green extends Color

test("pattern matching") {
  def describe(c: Color): String = c match {
    case Red => "red"
    case Green => "green"
  }
  
  describe(Red) shouldBe "red"
}
```

### Testing Implicits
```scala
test("implicit conversion") {
  implicit val ordering: Ordering[User] = Ordering.by(_.age)
  
  List(User("B", 30), User("A", 20)).sorted.head shouldBe User("A", 20)
}
```

### Testing Higher-Order Functions
```scala
test("map function") {
  val f: Int => Int = _ * 2
  List(1, 2, 3).map(f) shouldBe List(2, 4, 6)
}
```
