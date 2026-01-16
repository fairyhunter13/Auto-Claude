# PHP Testing Strategy

## Language Profile
- **Family**: C-Family (Scripting)
- **Paradigms**: Object-oriented, procedural, functional elements
- **Type System**: Dynamic (optional static typing with PHP 8+)
- **Testing Culture**: Strong ecosystem with PHPUnit as standard

## Primary Test Framework: PHPUnit

### Basic Test Structure
```php
<?php

declare(strict_types=1);

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;
use App\Calculator;

class CalculatorTest extends TestCase
{
    private Calculator $calculator;

    protected function setUp(): void
    {
        $this->calculator = new Calculator();
    }

    public function testAddition(): void
    {
        $result = $this->calculator->add(2, 3);
        $this->assertEquals(5, $result);
    }

    public function testDivisionByZeroThrowsException(): void
    {
        $this->expectException(\DivisionByZeroError::class);
        $this->calculator->divide(1, 0);
    }

    /**
     * @dataProvider additionProvider
     */
    public function testAdditionWithDataProvider(int $a, int $b, int $expected): void
    {
        $this->assertEquals($expected, $this->calculator->add($a, $b));
    }

    public static function additionProvider(): array
    {
        return [
            'positive numbers' => [1, 2, 3],
            'negative numbers' => [-1, -2, -3],
            'mixed numbers' => [-1, 2, 1],
        ];
    }
}
```

### Assertions (PHPUnit)
- `assertEquals($expected, $actual)`
- `assertSame($expected, $actual)` - Strict type comparison
- `assertTrue($condition)` / `assertFalse($condition)`
- `assertNull($variable)` / `assertNotNull($variable)`
- `assertCount($expected, $array)`
- `assertContains($needle, $haystack)`
- `assertInstanceOf($expected, $actual)`
- `assertArrayHasKey($key, $array)`

### Test Lifecycle
```php
public static function setUpBeforeClass(): void { }
protected function setUp(): void { }
protected function tearDown(): void { }
public static function tearDownAfterClass(): void { }
```

## Pest PHP (Modern Alternative)
```php
<?php

uses(Tests\TestCase::class);

test('can add numbers', function () {
    $calculator = new Calculator();
    expect($calculator->add(2, 3))->toBe(5);
});

it('throws exception for division by zero', function () {
    $calculator = new Calculator();
    $calculator->divide(1, 0);
})->throws(DivisionByZeroError::class);

test('addition with datasets', function (int $a, int $b, int $expected) {
    $calculator = new Calculator();
    expect($calculator->add($a, $b))->toBe($expected);
})->with([
    [1, 2, 3],
    [2, 3, 5],
    [-1, 1, 0],
]);
```

## Mocking with Mockery
```php
<?php

use Mockery;

class ServiceTest extends TestCase
{
    protected function tearDown(): void
    {
        Mockery::close();
    }

    public function testServiceWithMock(): void
    {
        $repository = Mockery::mock(RepositoryInterface::class);
        $repository->shouldReceive('find')
            ->with(1)
            ->once()
            ->andReturn(new Entity(['id' => 1]));

        $service = new Service($repository);
        $result = $service->process(1);

        $this->assertNotNull($result);
    }
}
```

## PHPUnit Mocking (Built-in)
```php
public function testWithPHPUnitMock(): void
{
    $mock = $this->createMock(RepositoryInterface::class);
    $mock->expects($this->once())
        ->method('find')
        ->with($this->equalTo(1))
        ->willReturn(new Entity(['id' => 1]));

    $service = new Service($mock);
    $result = $service->process(1);

    $this->assertNotNull($result);
}
```

## Laravel Testing (If Laravel Project)
```php
<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_can_list_items(): void
    {
        $response = $this->getJson('/api/items');

        $response->assertStatus(200)
            ->assertJsonStructure(['data' => [['id', 'name']]]);
    }

    public function test_can_create_item(): void
    {
        $response = $this->postJson('/api/items', [
            'name' => 'Test Item',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('items', ['name' => 'Test Item']);
    }
}
```

## Symfony Testing (If Symfony Project)
```php
<?php

namespace App\Tests\Controller;

use Symfony\Bundle\FrameworkBundle\Test\WebTestCase;

class ApiControllerTest extends WebTestCase
{
    public function testListItems(): void
    {
        $client = static::createClient();
        $client->request('GET', '/api/items');

        $this->assertResponseIsSuccessful();
        $this->assertResponseHeaderSame('content-type', 'application/json');
    }
}
```

## Test Organization
```
project/
  src/
    Calculator.php
  tests/
    Unit/
      CalculatorTest.php
    Feature/
      ApiTest.php
    TestCase.php
  phpunit.xml
  composer.json
```

## Configuration (phpunit.xml)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<phpunit xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:noNamespaceSchemaLocation="vendor/phpunit/phpunit/phpunit.xsd"
         bootstrap="vendor/autoload.php"
         colors="true">
    <testsuites>
        <testsuite name="Unit">
            <directory>tests/Unit</directory>
        </testsuite>
        <testsuite name="Feature">
            <directory>tests/Feature</directory>
        </testsuite>
    </testsuites>
    <coverage>
        <include>
            <directory suffix=".php">src</directory>
        </include>
    </coverage>
</phpunit>
```

## Composer Dependencies
```json
{
    "require-dev": {
        "phpunit/phpunit": "^10.0",
        "mockery/mockery": "^1.6",
        "pestphp/pest": "^2.0"
    }
}
```

## Coverage Tools

### PHPUnit Coverage
```bash
./vendor/bin/phpunit --coverage-html coverage
./vendor/bin/phpunit --coverage-clover coverage.xml
```

### Infection (Mutation Testing)
```bash
composer require --dev infection/infection
./vendor/bin/infection
```

## File Pattern Detection
- `composer.json` - Package manifest
- `*.php` - PHP source files
- `phpunit.xml` or `phpunit.xml.dist` - PHPUnit config
- `tests/` - Test directory
- `*Test.php` - Test files

## Recommended Test Stack
1. **Unit**: PHPUnit or Pest
2. **Mocking**: Mockery or PHPUnit mocks
3. **Integration**: PHPUnit + Framework testing tools
4. **E2E**: Laravel Dusk or Codeception
5. **Coverage**: PHPUnit coverage
6. **Mutation**: Infection
7. **Static Analysis**: PHPStan, Psalm

## CI Configuration (GitHub Actions)
```yaml
name: PHP CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup PHP
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          coverage: xdebug
          
      - name: Install dependencies
        run: composer install --prefer-dist --no-progress
        
      - name: Run tests
        run: ./vendor/bin/phpunit --coverage-clover coverage.xml
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage.xml

  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
      - run: composer install
      - run: ./vendor/bin/phpstan analyse
```

## PHP-Specific Considerations

### Testing with Attributes (PHP 8+)
```php
use PHPUnit\Framework\Attributes\Test;
use PHPUnit\Framework\Attributes\DataProvider;

class CalculatorTest extends TestCase
{
    #[Test]
    public function addsNumbers(): void
    {
        // ...
    }

    #[Test]
    #[DataProvider('additionProvider')]
    public function addsWithProvider(int $a, int $b, int $expected): void
    {
        // ...
    }
}
```

### Testing Enums (PHP 8.1+)
```php
enum Status: string {
    case Active = 'active';
    case Inactive = 'inactive';
}

public function testEnumValue(): void
{
    $this->assertSame('active', Status::Active->value);
}
```

### Testing Readonly Properties (PHP 8.1+)
```php
readonly class User {
    public function __construct(
        public string $name,
        public int $age,
    ) {}
}

public function testReadonlyClass(): void
{
    $user = new User('John', 30);
    $this->assertSame('John', $user->name);
}
```
