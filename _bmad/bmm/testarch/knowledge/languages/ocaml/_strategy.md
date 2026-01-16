# OCaml Testing Strategy

## Language Characteristics

- **Paradigm**: Multi-paradigm (functional, imperative, object-oriented)
- **Type System**: Strong static typing with Hindley-Milner inference
- **Memory**: Garbage collected
- **Concurrency**: Multicore support via domains (OCaml 5+)

## Testing Pyramid

```
        /  Property-Based  \      <- QCheck, Crowbar
       /   Integration      \     <- Alcotest with modules
      /     Unit Tests       \    <- Alcotest, OUnit2
     /________________________\
```

## Primary Framework: Alcotest

### Installation

```bash
# Using opam
opam install alcotest alcotest-lwt qcheck qcheck-alcotest

# In dune file
(test
 (name test_main)
 (libraries alcotest mylib))
```

### Project Structure

```
project/
├── lib/
│   ├── dune
│   └── mylib.ml
├── test/
│   ├── dune
│   ├── test_main.ml
│   └── test_mylib.ml
├── dune-project
└── myproject.opam
```

### Basic Test Patterns

```ocaml
(* test/test_mylib.ml *)
open Alcotest

let test_reverse_empty () =
  check (list int) "empty list" [] (List.rev [])

let test_reverse_single () =
  check (list int) "single element" [1] (List.rev [1])

let test_reverse_multiple () =
  check (list int) "multiple elements" [3; 2; 1] (List.rev [1; 2; 3])

let test_reverse_twice () =
  let xs = [1; 2; 3; 4; 5] in
  check (list int) "reverse twice is identity" xs (List.rev (List.rev xs))

let suite =
  [ "reverse", [
      test_case "empty list" `Quick test_reverse_empty;
      test_case "single element" `Quick test_reverse_single;
      test_case "multiple elements" `Quick test_reverse_multiple;
      test_case "reverse twice" `Quick test_reverse_twice;
    ]
  ]

(* test/test_main.ml *)
let () =
  Alcotest.run "MyLib" (
    Test_mylib.suite @
    Test_other.suite
  )
```

## Alternative Framework: OUnit2

```ocaml
open OUnit2

let test_addition _ =
  assert_equal 4 (2 + 2);
  assert_equal 0 (0 + 0)

let test_string_length _ =
  assert_equal 5 (String.length "hello");
  assert_equal 0 (String.length "")

let test_list_operations _ =
  assert_equal [3; 2; 1] (List.rev [1; 2; 3]);
  assert_equal 3 (List.length [1; 2; 3])

let suite =
  "MyLib" >::: [
    "addition" >:: test_addition;
    "string_length" >:: test_string_length;
    "list_operations" >:: test_list_operations;
  ]

let () = run_test_tt_main suite
```

## Property-Based Testing with QCheck

```ocaml
open QCheck

(* Basic properties *)
let prop_reverse_twice =
  Test.make ~count:1000
    ~name:"reverse twice is identity"
    (list int)
    (fun xs -> List.rev (List.rev xs) = xs)

let prop_reverse_length =
  Test.make ~count:1000
    ~name:"reverse preserves length"
    (list int)
    (fun xs -> List.length (List.rev xs) = List.length xs)

let prop_sort_idempotent =
  Test.make ~count:1000
    ~name:"sort is idempotent"
    (list int)
    (fun xs -> List.sort compare (List.sort compare xs) = List.sort compare xs)

(* Custom generators *)
let positive_int = Gen.(map abs int)

let non_empty_list gen =
  Gen.(list_size (int_range 1 100) gen)

let prop_head_of_sorted =
  Test.make ~count:1000
    ~name:"head of sorted is minimum"
    (make (non_empty_list Gen.int))
    (fun xs ->
      let sorted = List.sort compare xs in
      List.hd sorted = List.fold_left min (List.hd xs) xs)

(* Conditional properties *)
let prop_insert_preserves_sorted =
  Test.make ~count:1000
    ~name:"insert preserves sorted"
    (pair int (list int))
    (fun (x, xs) ->
      let sorted = List.sort compare xs in
      let inserted = List.sort compare (x :: sorted) in
      inserted = List.sort compare inserted)

(* Integration with Alcotest *)
let qcheck_suite =
  List.map QCheck_alcotest.to_alcotest [
    prop_reverse_twice;
    prop_reverse_length;
    prop_sort_idempotent;
  ]
```

## Testing with Modules and Functors

```ocaml
(* Module signature for testable components *)
module type STACK = sig
  type 'a t
  val empty : 'a t
  val push : 'a -> 'a t -> 'a t
  val pop : 'a t -> ('a * 'a t) option
  val is_empty : 'a t -> bool
end

(* Test functor *)
module Test_Stack (S : STACK) = struct
  open Alcotest

  let test_empty_is_empty () =
    check bool "empty is empty" true (S.is_empty S.empty)

  let test_push_not_empty () =
    let stack = S.push 1 S.empty in
    check bool "pushed stack not empty" false (S.is_empty stack)

  let test_push_pop () =
    let stack = S.push 42 S.empty in
    match S.pop stack with
    | Some (x, _) -> check int "pop returns pushed value" 42 x
    | None -> fail "expected Some"

  let suite = [
    "empty is empty", [test_case "" `Quick test_empty_is_empty];
    "push not empty", [test_case "" `Quick test_push_not_empty];
    "push pop", [test_case "" `Quick test_push_pop];
  ]
end

(* Apply to implementation *)
module List_Stack_Tests = Test_Stack(List_Stack)
```

## Testing Async Code with Lwt

```ocaml
open Lwt.Infix
open Alcotest_lwt

let test_async_operation _ () =
  let open Lwt.Syntax in
  let* result = async_fetch "http://example.com" in
  Alcotest.(check string) "result" "expected" result;
  Lwt.return_unit

let test_concurrent_operations _ () =
  let operations = List.init 10 (fun i -> async_process i) in
  Lwt_list.map_p Fun.id operations >>= fun results ->
  Alcotest.(check int) "count" 10 (List.length results);
  Lwt.return_unit

let test_timeout _ () =
  Lwt.catch
    (fun () ->
      Lwt.pick [
        Lwt_unix.sleep 1.0 >>= fun () -> Lwt.return "timeout";
        slow_operation () >>= fun r -> Lwt.return r
      ])
    (fun _ -> Lwt.return "error")
  >>= fun result ->
  Alcotest.(check string) "result" "expected" result;
  Lwt.return_unit

let suite = [
  test_case "async operation" `Quick test_async_operation;
  test_case "concurrent ops" `Slow test_concurrent_operations;
  test_case "timeout handling" `Quick test_timeout;
]

let () =
  Lwt_main.run @@ Alcotest_lwt.run "Async tests" [
    "operations", suite;
  ]
```

## Mocking and Test Doubles

```ocaml
(* Using first-class modules for mocking *)
module type DATABASE = sig
  val get : string -> string option Lwt.t
  val set : string -> string -> unit Lwt.t
end

(* Mock implementation *)
module Mock_Database : sig
  include DATABASE
  val calls : (string * [`Get | `Set of string]) list ref
  val responses : (string * string) list ref
  val reset : unit -> unit
end = struct
  let calls = ref []
  let responses = ref []
  
  let reset () =
    calls := [];
    responses := []
  
  let get key =
    calls := (key, `Get) :: !calls;
    Lwt.return (List.assoc_opt key !responses)
  
  let set key value =
    calls := (key, `Set value) :: !calls;
    responses := (key, value) :: !responses;
    Lwt.return_unit
end

(* Test with mock *)
let test_cache_hit () =
  Mock_Database.reset ();
  Mock_Database.responses := [("key1", "value1")];
  
  let module Cache = Make_Cache(Mock_Database) in
  Cache.get "key1" >>= fun result ->
  Alcotest.(check (option string)) "cached value" (Some "value1") result;
  Lwt.return_unit
```

## Testing GADTs and Phantom Types

```ocaml
(* Type-safe expression testing *)
type _ expr =
  | Int : int -> int expr
  | Bool : bool -> bool expr
  | Add : int expr * int expr -> int expr
  | If : bool expr * 'a expr * 'a expr -> 'a expr

let rec eval : type a. a expr -> a = function
  | Int n -> n
  | Bool b -> b
  | Add (a, b) -> eval a + eval b
  | If (cond, t, f) -> if eval cond then eval t else eval f

let test_int_expr () =
  check int "int expr" 5 (eval (Int 5))

let test_add_expr () =
  check int "add expr" 7 (eval (Add (Int 3, Int 4)))

let test_if_expr () =
  check int "if true" 1 (eval (If (Bool true, Int 1, Int 2)));
  check int "if false" 2 (eval (If (Bool false, Int 1, Int 2)))
```

## Commands

```bash
# Run all tests
dune runtest

# Run with verbose output
dune runtest --force --verbose

# Run specific test
dune exec test/test_main.exe -- test reverse

# Run with coverage (requires bisect_ppx)
dune runtest --instrument-with bisect_ppx
bisect-ppx-report html

# Run property tests with more cases
QCHECK_SEED=12345 dune runtest

# Run in watch mode
dune runtest --watch
```

## Best Practices

1. **Use Alcotest for structure** - Clear test organization
2. **Add QCheck properties** - Find edge cases automatically
3. **Test module interfaces** - Use functors for reusable tests
4. **Mock with first-class modules** - Type-safe dependency injection
5. **Test GADTs carefully** - Ensure type safety in tests
6. **Use `expect` tests** - For output-focused testing
