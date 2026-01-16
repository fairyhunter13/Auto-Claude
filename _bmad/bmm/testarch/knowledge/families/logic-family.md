# Logic-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but logic programming patterns detected.

## Family Characteristics

Logic programming languages share these traits that affect testing:
- **Declarative paradigm** - Describe what, not how
- **Unification** - Pattern matching with variable binding
- **Backtracking** - Multiple solution search
- **Relation-based** - Facts and rules, not functions
- **Constraint solving** - Constraint propagation

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| Prolog | plunit, tap | `test_*.pl`, `*_test.pl` |
| Datalog | Built-in queries | Query assertions |
| Mercury | mtest | `test_*.m` |
| miniKanren | Host language tests | Via Scheme/Clojure |
| Alloy | Alloy Analyzer | Model checking |
| Answer Set Programming | Built-in | Ground atom assertions |

## Universal Testing Patterns

### 1. Relation Testing

Test that relations hold:

```prolog
% Conceptual Prolog-style

% Define relation
parent(tom, mary).
parent(tom, james).
parent(mary, ann).

ancestor(X, Y) :- parent(X, Y).
ancestor(X, Y) :- parent(X, Z), ancestor(Z, Y).

% Test relation
:- begin_tests(family).

test(direct_parent) :-
    parent(tom, mary).

test(ancestor_transitive) :-
    ancestor(tom, ann).

test(not_ancestor, [fail]) :-
    ancestor(ann, tom).

test(find_all_children, [set(X == [mary, james])]) :-
    findall(C, parent(tom, C), X).

:- end_tests(family).
```

### 2. Query Result Testing

Test that queries produce expected results:

```prolog
% Test all solutions
test(all_ancestors, [all(X == [tom, mary])]) :-
    ancestor(X, ann).

% Test at least one solution exists
test(has_ancestor, [nondet]) :-
    ancestor(_, ann).

% Test exact number of solutions
test(two_children, [true(length(Cs, 2))]) :-
    findall(C, parent(tom, C), Cs).
```

### 3. Constraint Testing

For constraint logic programming:

```prolog
% CLP(FD) example
:- use_module(library(clpfd)).

% Sudoku solver relation
sudoku(Rows) :-
    length(Rows, 9),
    maplist(same_length(Rows), Rows),
    append(Rows, Vs), Vs ins 1..9,
    maplist(all_distinct, Rows),
    transpose(Rows, Columns),
    maplist(all_distinct, Columns),
    Rows = [A,B,C,D,E,F,G,H,I],
    blocks(A, B, C), blocks(D, E, F), blocks(G, H, I).

% Test constraint solving
test(sudoku_solves, [nondet]) :-
    sudoku([[5,3,_,_,7,_,_,_,_],
            [6,_,_,1,9,5,_,_,_],
            % ... more rows
           ]),
    % Should find valid solution
    true.

test(invalid_sudoku_fails, [fail]) :-
    sudoku([[5,5,_,_,_,_,_,_,_],  % Invalid: duplicate 5
            % ...
           ]).
```

### 4. Determinism Testing

Test whether predicates are deterministic:

```prolog
% Test deterministic predicate
test(factorial_deterministic, [true(F == 120)]) :-
    factorial(5, F).

% Test non-deterministic predicate produces multiple solutions
test(member_nondeterministic, [all(X == [1,2,3])]) :-
    member(X, [1,2,3]).

% Test predicate that should be semi-deterministic
test(lookup_semidet, [true(V == value)]) :-
    lookup(key, [(key, value), (other, x)], V).
```

### 5. Negation Testing

Test negation-as-failure:

```prolog
% Test negation
test(not_member, [true]) :-
    \+ member(4, [1,2,3]).

test(closed_world, [fail]) :-
    % Unknown facts are false (closed world assumption)
    parent(unknown_person, mary).
```

### 6. Model Checking (Alloy-style)

For specification languages:

```alloy
// Alloy example
sig Person {
    parent: lone Person
}

fact NoSelfParent {
    no p: Person | p in p.^parent
}

// Test/assertion
assert NoOrphanCycles {
    all p: Person | p not in p.^parent
}
check NoOrphanCycles for 10 Person
```

## Framework Detection Heuristics

When language is unknown but logic-family, look for:

### File Extensions
| Extension | Likely Language |
|-----------|-----------------|
| `.pl`, `.pro` | Prolog |
| `.P` (uppercase) | XSB Prolog |
| `.m` (with Mercury markers) | Mercury |
| `.als` | Alloy |
| `.lp`, `.asp` | Answer Set Programming |
| `.dl`, `.datalog` | Datalog |

### Syntax Markers
| Pattern | Indicates |
|---------|-----------|
| `:-` | Rule operator (Prolog) |
| `?-` | Query (Prolog) |
| `sig`, `fact`, `pred` | Alloy |
| `#const`, `#show` | ASP |

## Recommended Test Strategy

### For Unknown Logic-Family Language

1. **Test relations exhaustively** - All expected facts hold
2. **Test query completeness** - All solutions found
3. **Test negative cases** - Non-facts correctly fail
4. **Test determinism** - Correct number of solutions
5. **Test termination** - No infinite loops

### Test Distribution Guidance

| Test Type | Percentage | Rationale |
|-----------|------------|-----------|
| Relation tests | 40-50% | Core logic |
| Query tests | 25-35% | Solution sets |
| Constraint tests | 10-20% | If CLP used |
| Termination tests | 5-10% | Avoid infinite loops |
| Property tests | 5-10% | Invariants |

### Coverage Concepts

- **Clause coverage**: All rules exercised
- **Mode coverage**: All calling patterns tested
- **Solution coverage**: All solutions verified
- **Failure coverage**: Expected failures tested

## Fallback Commands

When framework unknown, try these:

```bash
# SWI-Prolog
swipl -g run_tests -t halt test_file.pl

# GNU Prolog
gprolog --consult-file test_file.pl --query-goal "run_tests, halt"

# SICStus Prolog
sicstus -l test_file.pl --goal "run_tests, halt."

# Mercury
mtest test_module

# Alloy
java -jar alloy.jar model.als
```

## Integration with TEA Workflows

When logic-family inference is used:

1. **Focus on relations** - Test facts and rules
2. **Verify completeness** - All solutions found
3. **Test search behavior** - Backtracking works
4. **Check termination** - No infinite recursion
5. **Consider formal verification** - Model checking if applicable

## Unique Considerations

### 1. Open vs Closed World
```prolog
% Closed world: unknown = false
test(closed_world) :-
    \+ unknown_fact(x).  % Succeeds because not defined

% May need explicit handling if open world semantics desired
```

### 2. Cut and Side Effects
```prolog
% Test with and without cut
test(with_cut) :-
    first_solution(X), !,
    X == expected.

test(without_cut, [all(X == [a, b, c])]) :-
    all_solutions(X).
```

### 3. Tabling/Memoization
```prolog
% If using tabling, test cache behavior
:- table fibonacci/2.

test(fibonacci_tabled) :-
    fibonacci(40, F),
    F == 102334155,
    % Should be fast due to tabling
    true.
```

### 4. Mode Declarations
```prolog
% Test different calling modes
test(append_mode1, [true(R == [1,2,3])]) :-
    append([1], [2,3], R).

test(append_mode2, [true(X == [1])]) :-
    append(X, [2,3], [1,2,3]).

test(append_mode3, [all((X,Y) == [([],[1,2,3]), ([1],[2,3]), ...])]) :-
    append(X, Y, [1,2,3]).
```
