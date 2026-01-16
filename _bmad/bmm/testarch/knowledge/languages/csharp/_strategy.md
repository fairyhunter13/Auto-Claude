# C# Testing Strategy

## Language Profile
- **Family**: C-Family (Object-Oriented)
- **Paradigms**: Object-oriented, functional (LINQ, async/await)
- **Type System**: Static, strongly typed, nullable reference types (C# 8+)
- **Testing Culture**: Strong ecosystem with .NET integration

## Primary Test Frameworks

### xUnit (Recommended)
```csharp
using Xunit;

public class CalculatorTests
{
    private readonly Calculator _calculator;

    public CalculatorTests()
    {
        _calculator = new Calculator();
    }

    [Fact]
    public void Add_TwoPositiveNumbers_ReturnsSum()
    {
        // Arrange
        int a = 2, b = 3;

        // Act
        var result = _calculator.Add(a, b);

        // Assert
        Assert.Equal(5, result);
    }

    [Theory]
    [InlineData(1, 1, 2)]
    [InlineData(2, 3, 5)]
    [InlineData(-1, 1, 0)]
    public void Add_VariousInputs_ReturnsExpected(int a, int b, int expected)
    {
        var result = _calculator.Add(a, b);
        Assert.Equal(expected, result);
    }
}
```

### NUnit
```csharp
using NUnit.Framework;

[TestFixture]
public class CalculatorTests
{
    private Calculator _calculator;

    [SetUp]
    public void Setup()
    {
        _calculator = new Calculator();
    }

    [Test]
    public void Add_TwoNumbers_ReturnsSum()
    {
        Assert.That(_calculator.Add(2, 3), Is.EqualTo(5));
    }

    [TestCase(1, 1, 2)]
    [TestCase(2, 3, 5)]
    public void Add_TestCases(int a, int b, int expected)
    {
        Assert.That(_calculator.Add(a, b), Is.EqualTo(expected));
    }
}
```

### MSTest
```csharp
using Microsoft.VisualStudio.TestTools.UnitTesting;

[TestClass]
public class CalculatorTests
{
    [TestMethod]
    public void Add_TwoNumbers_ReturnsSum()
    {
        var calculator = new Calculator();
        Assert.AreEqual(5, calculator.Add(2, 3));
    }

    [DataTestMethod]
    [DataRow(1, 1, 2)]
    [DataRow(2, 3, 5)]
    public void Add_DataDriven(int a, int b, int expected)
    {
        var calculator = new Calculator();
        Assert.AreEqual(expected, calculator.Add(a, b));
    }
}
```

## FluentAssertions
```csharp
using FluentAssertions;

[Fact]
public void TestWithFluentAssertions()
{
    var person = new Person { Name = "John", Age = 30 };

    person.Name.Should().Be("John");
    person.Age.Should().BeGreaterThan(18);
    
    var list = new[] { 1, 2, 3 };
    list.Should().HaveCount(3)
        .And.Contain(2)
        .And.BeInAscendingOrder();

    Action act = () => service.DoSomething(null);
    act.Should().Throw<ArgumentNullException>()
        .WithMessage("*cannot be null*");
}
```

## Mocking with Moq
```csharp
using Moq;

public class ServiceTests
{
    private readonly Mock<IRepository> _repositoryMock;
    private readonly Service _service;

    public ServiceTests()
    {
        _repositoryMock = new Mock<IRepository>();
        _service = new Service(_repositoryMock.Object);
    }

    [Fact]
    public void Process_ValidId_ReturnsEntity()
    {
        // Arrange
        var entity = new Entity { Id = 1, Name = "Test" };
        _repositoryMock
            .Setup(r => r.GetById(1))
            .Returns(entity);

        // Act
        var result = _service.Process(1);

        // Assert
        result.Should().NotBeNull();
        result.Name.Should().Be("Test");
        _repositoryMock.Verify(r => r.GetById(1), Times.Once);
    }
}
```

## NSubstitute (Alternative to Moq)
```csharp
using NSubstitute;

[Fact]
public void TestWithNSubstitute()
{
    var repository = Substitute.For<IRepository>();
    repository.GetById(1).Returns(new Entity { Id = 1 });

    var service = new Service(repository);
    var result = service.Process(1);

    result.Should().NotBeNull();
    repository.Received(1).GetById(1);
}
```

## Integration Testing

### WebApplicationFactory (ASP.NET Core)
```csharp
using Microsoft.AspNetCore.Mvc.Testing;

public class ApiIntegrationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly HttpClient _client;

    public ApiIntegrationTests(WebApplicationFactory<Program> factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task GetItems_ReturnsSuccessStatusCode()
    {
        var response = await _client.GetAsync("/api/items");
        
        response.EnsureSuccessStatusCode();
        
        var content = await response.Content.ReadAsStringAsync();
        content.Should().Contain("item");
    }
}
```

### TestServer with Custom Configuration
```csharp
public class CustomWebApplicationFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.ConfigureServices(services =>
        {
            // Replace services with test doubles
            services.RemoveAll<IDbContext>();
            services.AddSingleton<IDbContext, TestDbContext>();
        });
    }
}
```

## Test Organization
```
src/
  MyProject/
    MyProject.csproj
    Services/
      MyService.cs
  MyProject.Tests/
    MyProject.Tests.csproj
    Services/
      MyServiceTests.cs
  MyProject.IntegrationTests/
    MyProject.IntegrationTests.csproj
    ApiTests.cs
```

## Project File Configuration
```xml
<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <TargetFramework>net8.0</TargetFramework>
    <IsPackable>false</IsPackable>
  </PropertyGroup>

  <ItemGroup>
    <PackageReference Include="xunit" Version="2.6.1" />
    <PackageReference Include="xunit.runner.visualstudio" Version="2.5.3" />
    <PackageReference Include="Microsoft.NET.Test.Sdk" Version="17.8.0" />
    <PackageReference Include="Moq" Version="4.20.69" />
    <PackageReference Include="FluentAssertions" Version="6.12.0" />
    <PackageReference Include="coverlet.collector" Version="6.0.0" />
  </ItemGroup>

  <ItemGroup>
    <ProjectReference Include="..\MyProject\MyProject.csproj" />
  </ItemGroup>
</Project>
```

## Coverage Tools

### Coverlet
```bash
dotnet test --collect:"XPlat Code Coverage"

# Generate HTML report
reportgenerator -reports:**/coverage.cobertura.xml -targetdir:coverage
```

### Configuration
```xml
<PropertyGroup>
  <CollectCoverage>true</CollectCoverage>
  <CoverletOutputFormat>cobertura</CoverletOutputFormat>
</PropertyGroup>
```

## File Pattern Detection
- `*.csproj` - Project files
- `*.sln` - Solution files
- `*.cs` - C# source files
- `*Tests.cs`, `*Test.cs` - Test files
- `*IntegrationTests.cs` - Integration tests

## Recommended Test Stack
1. **Unit**: xUnit (or NUnit)
2. **Assertions**: FluentAssertions
3. **Mocking**: Moq (or NSubstitute)
4. **Integration**: WebApplicationFactory
5. **Coverage**: Coverlet + ReportGenerator
6. **BDD**: SpecFlow (optional)
7. **Snapshot**: Verify

## CI Configuration (GitHub Actions)
```yaml
name: .NET CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup .NET
        uses: actions/setup-dotnet@v3
        with:
          dotnet-version: '8.0.x'
          
      - name: Restore dependencies
        run: dotnet restore
        
      - name: Build
        run: dotnet build --no-restore
        
      - name: Test with coverage
        run: dotnet test --no-build --collect:"XPlat Code Coverage"
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: '**/coverage.cobertura.xml'
```

## C#-Specific Considerations

### Testing Async Code
```csharp
[Fact]
public async Task AsyncMethod_ReturnsExpected()
{
    var result = await _service.ProcessAsync();
    
    result.Should().NotBeNull();
}

[Fact]
public async Task AsyncMethod_ThrowsException()
{
    Func<Task> act = () => _service.ProcessAsync(null);
    
    await act.Should().ThrowAsync<ArgumentNullException>();
}
```

### Testing with Records
```csharp
public record Person(string Name, int Age);

[Fact]
public void RecordEquality_WorksCorrectly()
{
    var person1 = new Person("John", 30);
    var person2 = new Person("John", 30);
    
    person1.Should().Be(person2);
}
```

### Testing Generic Types
```csharp
[Theory]
[MemberData(nameof(GetTestData))]
public void GenericTest<T>(T input, T expected)
{
    var result = _service.Process(input);
    result.Should().Be(expected);
}
```

### Testing with Dependency Injection
```csharp
public class ServiceTests : IClassFixture<ServiceFixture>
{
    private readonly IServiceProvider _serviceProvider;

    public ServiceTests(ServiceFixture fixture)
    {
        _serviceProvider = fixture.ServiceProvider;
    }

    [Fact]
    public void Service_ResolvesCorrectly()
    {
        var service = _serviceProvider.GetRequiredService<IMyService>();
        service.Should().NotBeNull();
    }
}
```

### Testing Nullable Reference Types
```csharp
[Fact]
public void Method_WithNullInput_ThrowsArgumentNullException()
{
    string? nullInput = null;
    
    Action act = () => _service.Process(nullInput!);
    
    act.Should().Throw<ArgumentNullException>();
}
```
