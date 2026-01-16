# ML-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but ML-family syntax detected.

## Family Characteristics

ML-family languages share these traits that affect testing:
- **Strong static typing** - Type-driven development, compile-time guarantees
- **Pattern matching** - Exhaustive case handling
- **Immutability by default** - Pure functions, referential transparency
- **Expression-oriented** - Everything returns a value
- **Algebraic data types** - Sum types (variants), product types (records/tuples)

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| OCaml | OUnit, Alcotest, inline_tests | `*_test.ml`, `test_*.ml` |
| F# | Expecto, xUnit, NUnit | `*Tests.fs` |
| Haskell | HSpec, QuickCheck, tasty | `*Spec.hs`, `*Test.hs` |
| Elm | elm-test | `*Test.elm`, `tests/*.elm` |
| PureScript | purescript-spec | `*Spec.purs` |
| Gleam | gleeunit | `*_test.gleam` |
| Roc | roc test | inline `expect` |
| ReasonML | Jest (via BuckleScript) | `*_test.re` |
| Scala | ScalaTest, Specs2, MUnit | `*Spec.scala`, `*Test.scala` |

## Universal Testing Patterns

### 1. Property-Based Testing (PBT)

ML-family languages excel at property-based testing due to strong types:

```
// Conceptual - applies across ML languages
property "reverse reverse is identity" =
    forall list: List<a>.
        reverse(reverse(list)) == list

property "sort produces sorted output" =
    forall list: List<Int>.
        is_sorted(sort(list))

property "length preserved after map" =
    forall list: List<a>, f: a -> b.
        length(map(f, list)) == length(list)
```

**Key PBT Frameworks by Language**:
| Language | PBT Framework |
|----------|---------------|
| Haskell | QuickCheck |
| OCaml | QCheck |
| F# | FsCheck |
| Scala | ScalaCheck |
| Elm | elm-test (built-in fuzz) |
| Gleam | qcheck_gleam |

### 2. Test Structure Pattern

ML-family uses **Given-When-Then** or **specification style**:

```
describe "User module" [
    describe "create_user" [
        it "creates user with valid email" (
            let input = { email = "test@example.com", name = "Test" }
            let result = User.create(input)
            
            result |> should equal (Ok { id = _, email = "test@example.com", ... })
        ),
        
        it "rejects invalid email" (
            let input = { email = "invalid", name = "Test" }
            let result = User.create(input)
            
            result |> should be_error
        )
    ]
]
```

### 3. Type-Driven Testing

Leverage the type system for testing:

```
// Exhaustive pattern matching = fewer tests needed
type Result<T, E> = Ok(T) | Error(E)

// Type guarantees handle_result covers all cases
handle_result(result) = match result with
    | Ok(value) -> process(value)
    | Error(err) -> handle_error(err)

// Test focuses on business logic, not null checks
test "handles success case" =
    handle_result(Ok(42)) == expected_success_output

test "handles error case" =
    handle_result(Error("failed")) == expected_error_output
```

### 4. Pure Function Testing

ML-family functions are often pure (no side effects):

```
// Pure function - easy to test
let calculate_total items discount =
    let subtotal = List.sum (List.map (fun i -> i.price) items)
    subtotal * (1.0 - discount)

// Tests are simple input/output verification
test "calculates total with discount" =
    let items = [{ price = 100 }, { price = 50 }]
    calculate_total items 0.1 == 135.0
```

### 5. Snapshot/Golden Testing

Common in ML-family for compiler/parser testing:

```
test "parser produces correct AST" =
    let input = "let x = 1 + 2"
    let ast = parse(input)
    
    ast |> should match_snapshot "parser/let_expression.golden"
```

### 6. Effect Isolation Patterns

For testing effectful code:

```
// Define effects as types
type Effect<A> = 
    | Pure(A)
    | Log(String, () -> Effect<A>)
    | Http(Request, Response -> Effect<A>)

// Test by providing mock interpreters
test "logs on error" =
    let logged = ref []
    let mock_interpreter = {
        log = (msg) -> logged := msg :: !logged
    }
    
    run_with_interpreter(mock_interpreter, my_effectful_code)
    
    !logged |> should contain "Error occurred"
```

## Framework Detection Heuristics

When language is unknown but ML-family, look for:

### Build System Files
| File | Likely Language |
|------|-----------------|
| `dune`, `dune-project` | OCaml |
| `*.fsproj`, `*.fsx` | F# |
| `cabal.project`, `*.cabal`, `stack.yaml` | Haskell |
| `elm.json` | Elm |
| `spago.dhall`, `psc-package.json` | PureScript |
| `gleam.toml` | Gleam |
| `roc.app`, `roc.pkg` | Roc |
| `build.sbt` | Scala |
| `bsconfig.json` | ReasonML |

### Test Dependencies
Look in manifest files for:
- `ounit`, `alcotest`, `qcheck` - OCaml
- `hspec`, `quickcheck`, `tasty` - Haskell
- `expecto`, `fscheck` - F#
- `elm-test`, `elm-explorations/test` - Elm
- `scalatest`, `specs2`, `munit` - Scala

## Recommended Test Strategy

### For Unknown ML-Family Language

1. **Prioritize property-based testing** - ML types make PBT powerful
2. **Test algebraic data types exhaustively** - Pattern match all variants
3. **Focus on pure function unit tests** - High coverage, fast execution
4. **Isolate effects for testing** - Use interpreter pattern or mocks
5. **Use types as documentation** - Types reduce test surface area

### Test Distribution Guidance

| Test Type | Percentage | Rationale |
|-----------|------------|-----------|
| Property-based | 30-40% | Leverages type system |
| Unit (pure functions) | 40-50% | Fast, high confidence |
| Integration | 10-20% | Effect boundaries |
| E2E | 5-10% | Critical paths only |

### Coverage Guidance

- **Function coverage**: 90%+ (pure functions are easy)
- **Branch coverage**: 100% for pattern matches
- **Property coverage**: All invariants have properties
- **Effect boundaries**: Integration tests at IO edges

## Fallback Commands

When framework unknown, try these in order:

```bash
# Common ML test runners
dune runtest             # OCaml
dotnet test              # F#
cabal test               # Haskell (Cabal)
stack test               # Haskell (Stack)
elm-test                 # Elm
spago test               # PureScript
gleam test               # Gleam
roc test                 # Roc
sbt test                 # Scala
```

## Integration with TEA Workflows

When ML-family inference is used:

1. **Emphasize PBT** - Property-based testing is idiomatic
2. **Analyze type definitions** - ADTs suggest test cases
3. **Identify effect boundaries** - Focus integration tests there
4. **Check for existing properties** - ML projects often have them
5. **Suggest type-driven test generation** - Types can generate test cases

## Common Pitfalls

### 1. Over-testing Pure Functions
Pure functions with good types need fewer tests:
```
// Type signature tells us a lot
reverse : List a -> List a

// Don't need to test: null handling, wrong types, mutations
// DO test: empty list, single element, property (reverse . reverse = id)
```

### 2. Ignoring Property-Based Testing
ML's type system makes PBT incredibly powerful - don't skip it.

### 3. Testing Type System's Job
If the type system prevents a bug, you don't need a test for it:
```
// If this compiles, we know age is non-negative
type Age = Age(UInt)

// No need to test "rejects negative age" - compiler does it
```

### 4. Not Testing Effect Boundaries
While pure code is easy to test, IO boundaries need attention:
```
// This needs integration testing
read_config : FilePath -> IO Config
```
