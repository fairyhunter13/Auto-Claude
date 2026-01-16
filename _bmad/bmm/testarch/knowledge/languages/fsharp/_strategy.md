# F# Testing Strategy

## Language Characteristics

- **Paradigm**: Functional-first, multi-paradigm
- **Type System**: Strong static typing with type inference
- **Runtime**: .NET CLR
- **Interop**: Full C#/.NET interoperability

## Testing Pyramid

```
        /  Property-Based  \      <- FsCheck
       /   Integration      \     <- Expecto, xUnit
      /     Unit Tests       \    <- Expecto, xUnit, NUnit
     /________________________\
```

## Primary Framework: Expecto

### Installation

```xml
<!-- In .fsproj -->
<ItemGroup>
  <PackageReference Include="Expecto" Version="10.*" />
  <PackageReference Include="Expecto.FsCheck" Version="10.*" />
  <PackageReference Include="FsCheck" Version="2.*" />
  <PackageReference Include="Unquote" Version="6.*" />
</ItemGroup>
```

### Project Structure

```
project/
├── src/
│   └── MyLib/
│       ├── MyLib.fsproj
│       └── Library.fs
├── tests/
│   └── MyLib.Tests/
│       ├── MyLib.Tests.fsproj
│       ├── Program.fs
│       └── LibraryTests.fs
└── MyProject.sln
```

### Basic Test Patterns

```fsharp
// tests/MyLib.Tests/LibraryTests.fs
module LibraryTests

open Expecto
open MyLib

[<Tests>]
let reverseTests =
    testList "List.rev" [
        test "reverses empty list" {
            Expect.equal (List.rev []) [] "empty list should stay empty"
        }
        
        test "reverses single element" {
            Expect.equal (List.rev [1]) [1] "single element unchanged"
        }
        
        test "reverses multiple elements" {
            Expect.equal (List.rev [1; 2; 3]) [3; 2; 1] "should reverse"
        }
        
        test "reverse twice is identity" {
            let xs = [1; 2; 3; 4; 5]
            Expect.equal (List.rev (List.rev xs)) xs "double reverse"
        }
    ]

[<Tests>]
let mathTests =
    testList "Math operations" [
        testCase "addition" <| fun _ ->
            Expect.equal (2 + 2) 4 "2 + 2 = 4"
        
        testCase "multiplication" <| fun _ ->
            Expect.equal (3 * 4) 12 "3 * 4 = 12"
        
        testTheory "addition is commutative" [(1, 2); (3, 4); (5, 6)] <| fun (a, b) ->
            Expect.equal (a + b) (b + a) "commutative"
    ]

// Program.fs
[<EntryPoint>]
let main args =
    runTestsWithCLIArgs [] args LibraryTests.reverseTests
```

## Property-Based Testing with FsCheck

```fsharp
open Expecto
open FsCheck

[<Tests>]
let propertyTests =
    testList "Properties" [
        testProperty "reverse twice is identity" <| fun (xs: int list) ->
            List.rev (List.rev xs) = xs
        
        testProperty "reverse preserves length" <| fun (xs: int list) ->
            List.length (List.rev xs) = List.length xs
        
        testProperty "sort is idempotent" <| fun (xs: int list) ->
            List.sort xs = List.sort (List.sort xs)
        
        testProperty "head of sorted is min" <| fun (xs: int list) ->
            not (List.isEmpty xs) ==>
                lazy (List.head (List.sort xs) = List.min xs)
    ]

// Custom generators
type PositiveInt = PositiveInt of int

type Generators =
    static member PositiveInt() =
        Arb.Default.Int32()
        |> Arb.mapFilter abs (fun x -> x > 0)
        |> Arb.convert PositiveInt (fun (PositiveInt x) -> x)

[<Tests>]
let customGeneratorTests =
    testList "Custom generators" [
        testPropertyWithConfig 
            { FsCheckConfig.defaultConfig with arbitrary = [typeof<Generators>] }
            "positive ints are positive"
            <| fun (PositiveInt x) -> x > 0
    ]

// Shrinking example
let shrinkTests =
    testProperty "demonstrates shrinking" <| fun (xs: int list) ->
        List.length xs < 100  // Will shrink to minimal failing case
```

## Testing with Unquote

```fsharp
open Swensen.Unquote

[<Tests>]
let unquoteTests =
    testList "Unquote assertions" [
        test "simple equality" {
            test <@ 1 + 1 = 2 @>
        }
        
        test "list operations" {
            test <@ List.rev [1; 2; 3] = [3; 2; 1] @>
        }
        
        test "pattern matching" {
            let result = 
                match Some 42 with
                | Some x -> x
                | None -> 0
            test <@ result = 42 @>
        }
        
        test "function composition" {
            let f = (fun x -> x + 1) >> (fun x -> x * 2)
            test <@ f 3 = 8 @>
        }
    ]
```

## Async Testing

```fsharp
open System.Threading.Tasks

[<Tests>]
let asyncTests =
    testList "Async" [
        testAsync "async computation" {
            let! result = async {
                do! Async.Sleep 10
                return 42
            }
            Expect.equal result 42 "should be 42"
        }
        
        testTask "task computation" {
            let! result = task {
                do! Task.Delay 10
                return "hello"
            }
            Expect.equal result "hello" "should be hello"
        }
        
        testAsync "parallel async" {
            let! results = 
                [1..10]
                |> List.map (fun i -> async { return i * 2 })
                |> Async.Parallel
            Expect.equal (Array.sum results) 110 "sum of doubled"
        }
    ]
```

## Testing with Mocks (Foq/NSubstitute)

```fsharp
open Foq

type IUserRepository =
    abstract GetUser: int -> User option
    abstract SaveUser: User -> unit

[<Tests>]
let mockTests =
    testList "Mocking" [
        test "mock repository" {
            let mockRepo =
                Mock<IUserRepository>()
                    .Setup(fun r -> <@ r.GetUser(1) @>)
                    .Returns(Some { Id = 1; Name = "Test" })
                    .Create()
            
            let result = mockRepo.GetUser(1)
            Expect.isSome result "should return user"
            Expect.equal result.Value.Name "Test" "correct name"
        }
        
        test "verify calls" {
            let mockRepo = Mock<IUserRepository>.With(fun r ->
                <@ r.SaveUser(any()) --> () @>
            )
            
            let service = UserService(mockRepo)
            service.CreateUser("New User")
            
            Mock.Verify(<@ mockRepo.SaveUser(any()) @>, Times.once)
        }
    ]
```

## Testing Computation Expressions

```fsharp
// Result computation expression
type Result<'T, 'E> = Ok of 'T | Error of 'E

type ResultBuilder() =
    member _.Bind(x, f) = 
        match x with
        | Ok v -> f v
        | Error e -> Error e
    member _.Return(x) = Ok x

let result = ResultBuilder()

[<Tests>]
let resultTests =
    testList "Result CE" [
        test "successful computation" {
            let computation = result {
                let! x = Ok 1
                let! y = Ok 2
                return x + y
            }
            Expect.equal computation (Ok 3) "should sum"
        }
        
        test "short-circuit on error" {
            let computation = result {
                let! x = Ok 1
                let! y = Error "failed"
                return x + y
            }
            Expect.equal computation (Error "failed") "should error"
        }
    ]
```

## Performance Testing

```fsharp
open Expecto

[<Tests>]
let perfTests =
    testList "Performance" [
        testCase "list operations under threshold" <| fun _ ->
            let result = 
                Expect.isFasterThan
                    (fun () -> List.map ((+) 1) [1..1000] |> ignore)
                    (fun () -> [for i in 1..1000 -> i + 1] |> ignore)
                    "map should be faster"
            ()
        
        test "benchmark sort" {
            let config = 
                { Expecto.BenchmarkDotNet.defaultConfig with
                    warmupCount = 3
                    targetCount = 10 }
            
            Expecto.BenchmarkDotNet.benchmark config [
                "List.sort", fun () -> List.sort [1..1000] |> ignore
                "Array.sort", fun () -> Array.sort [|1..1000|] |> ignore
            ]
        }
    ]
```

## Alternative: xUnit with FsUnit

```fsharp
open Xunit
open FsUnit.Xunit

[<Fact>]
let ``reverse empty list`` () =
    List.rev [] |> should equal []

[<Fact>]
let ``reverse preserves elements`` () =
    List.rev [1; 2; 3] |> should equal [3; 2; 1]

[<Theory>]
[<InlineData(1, 2, 3)>]
[<InlineData(0, 0, 0)>]
[<InlineData(-1, 1, 0)>]
let ``addition works`` (a: int) (b: int) (expected: int) =
    a + b |> should equal expected

[<Fact>]
let ``should throw on invalid input`` () =
    (fun () -> failwith "error" |> ignore)
    |> should throw typeof<System.Exception>
```

## Commands

```bash
# Run all tests
dotnet test

# Run with filter
dotnet test --filter "FullyQualifiedName~LibraryTests"

# Run Expecto directly
dotnet run --project tests/MyLib.Tests

# Run with specific Expecto args
dotnet run --project tests/MyLib.Tests -- --sequenced --debug

# Run with coverage
dotnet test /p:CollectCoverage=true /p:CoverletOutputFormat=lcov

# Run property tests with seed
dotnet run --project tests/MyLib.Tests -- --fscheck-seed 12345
```

## Best Practices

1. **Use Expecto** - Native F# testing experience
2. **Property-based by default** - Use FsCheck liberally
3. **Use Unquote** - Better assertion messages
4. **Test computation expressions** - Verify monadic laws
5. **Avoid mocks when possible** - Prefer pure functions
6. **Use testList for organization** - Nested test groups
