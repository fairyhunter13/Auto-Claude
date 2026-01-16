# Lisp-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but Lisp-family syntax detected.

## Family Characteristics

Lisp-family languages share these traits that affect testing:
- **Homoiconicity** - Code is data, data is code
- **S-expressions** - Parenthesized prefix notation
- **Powerful macro systems** - Code generation, DSLs
- **REPL-driven development** - Interactive exploration
- **Dynamic typing** (usually) - Runtime flexibility
- **Functional core** - First-class functions, closures

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| Clojure | clojure.test, Midje, Expectations | `*_test.clj`, `test/**/*.clj` |
| Common Lisp | FiveAM, Prove, Lisp-Unit | `test/*.lisp` |
| Scheme | SRFI-64, Guile test | `test/*.scm` |
| Racket | rackunit | `*-test.rkt`, `tests/*.rkt` |
| Emacs Lisp | ERT, Buttercup | `*-test.el`, `test/*.el` |
| Fennel | Faith, fennelunit | `test/*.fnl` |
| Janet | judge, testament | `test/*.janet` |
| Hy | pytest (via Python) | `test_*.hy` |

## Universal Testing Patterns

### 1. REPL-Driven Testing

Lisp development emphasizes interactive testing:

```
;; Conceptual - applies across Lisp languages

;; 1. Define function
(defn calculate-total [items discount]
  (* (reduce + (map :price items))
     (- 1 discount)))

;; 2. Test interactively in REPL
> (calculate-total [{:price 100} {:price 50}] 0.1)
135.0

;; 3. Formalize as test
(deftest test-calculate-total
  (is (= 135.0 
         (calculate-total [{:price 100} {:price 50}] 0.1))))
```

### 2. Test Structure Pattern

Lisp tests follow **assertion-centric** style:

```
;; Clojure-style (representative)
(deftest test-user-creation
  (testing "with valid email"
    (let [result (create-user {:email "test@example.com"})]
      (is (some? result))
      (is (= "test@example.com" (:email result)))))
  
  (testing "with invalid email"
    (is (thrown? ValidationError
                 (create-user {:email "invalid"})))))
```

### 3. Generative/Spec Testing

Lisp languages excel at generative testing:

```
;; Clojure spec example (conceptual)
(s/def ::email (s/and string? #(re-matches #".+@.+\..+" %)))
(s/def ::user (s/keys :req [::email ::name]))

;; Generate test data
(gen/sample (s/gen ::user))
;; => ({:email "a@b.c" :name "x"} ...)

;; Property test
(defspec user-roundtrip 100
  (prop/for-all [user (s/gen ::user)]
    (= user (-> user serialize deserialize))))
```

### 4. Macro Testing

Testing macros requires special attention:

```
;; Test macro expansion
(deftest test-my-macro
  (testing "expands correctly"
    (is (= '(if condition then-expr else-expr)
           (macroexpand-1 '(my-if condition then-expr else-expr)))))
  
  (testing "executes correctly"
    (is (= "yes" (my-if true "yes" "no")))
    (is (= "no" (my-if false "yes" "no")))))
```

### 5. State and Side Effect Testing

For stateful operations, use fixtures/setup:

```
;; Setup/teardown pattern
(use-fixtures :each
  (fn [test-fn]
    ;; Setup
    (reset! app-state initial-state)
    ;; Run test
    (test-fn)
    ;; Teardown
    (reset! app-state nil)))

(deftest test-stateful-operation
  (do-stateful-thing!)
  (is (= expected-state @app-state)))
```

### 6. Mock/Stub Patterns

Dynamic nature makes mocking straightforward:

```
;; Rebind function for testing
(deftest test-with-mock
  (with-redefs [external-api-call (fn [_] {:status 200})]
    (let [result (function-under-test)]
      (is (= :success (:result result))))))

;; Or use mock library
(deftest test-verifies-calls
  (with-mock [api-call]
    (function-under-test)
    (is (called? api-call))
    (is (called-with? api-call expected-args))))
```

## Framework Detection Heuristics

When language is unknown but Lisp-family, look for:

### Project Files
| File | Likely Language |
|------|-----------------|
| `project.clj`, `deps.edn`, `bb.edn` | Clojure |
| `*.asd`, `quicklisp/` | Common Lisp |
| `info.rkt`, `main.rkt` | Racket |
| `Cask`, `*-pkg.el` | Emacs Lisp |
| `project.janet` | Janet |
| `*.scm` + `guile` shebang | Guile Scheme |

### Test Dependencies
Look in project files for:
- `clojure.test`, `midje`, `expectations` - Clojure
- `fiveam`, `prove`, `lisp-unit` - Common Lisp
- `rackunit` - Racket
- `ert`, `buttercup` - Emacs Lisp

## Recommended Test Strategy

### For Unknown Lisp-Family Language

1. **Start with REPL exploration** - Interactive testing first
2. **Formalize into test suite** - Convert REPL sessions to tests
3. **Use generative testing** - Leverage data generation
4. **Test macros at expansion AND execution** - Both levels matter
5. **Isolate state carefully** - Use fixtures for stateful tests

### Test Distribution Guidance

| Test Type | Percentage | Rationale |
|-----------|------------|-----------|
| Unit (pure functions) | 50-60% | Functional core |
| Generative/Property | 20-30% | Data-driven |
| Macro tests | 5-10% | If macros exist |
| Integration | 10-15% | State boundaries |
| E2E | 5% | Critical paths |

### Coverage Guidance

- **Function coverage**: 85%+
- **Macro coverage**: Test all macro forms
- **Spec coverage**: All specs have generators
- **REPL coverage**: Key scenarios documented

## Fallback Commands

When framework unknown, try these:

```bash
# Common Lisp test runners
lein test                    # Clojure (Leiningen)
clojure -M:test              # Clojure (deps.edn)
bb test                      # Babashka

sbcl --load test/run.lisp    # Common Lisp (SBCL)
ros run -l test/run.lisp     # Common Lisp (Roswell)

raco test .                  # Racket
emacs -batch -l ert -l test/*.el -f ert-run-tests-batch  # Emacs Lisp
janet test/*.janet           # Janet
```

## Integration with TEA Workflows

When Lisp-family inference is used:

1. **Enable REPL-based testing** - Interactive is idiomatic
2. **Suggest spec/generative testing** - Powerful in Lisp
3. **Check for macro definitions** - They need special testing
4. **Look for existing specs** - May already have generators
5. **Note dynamic typing** - More runtime tests needed

## Unique Considerations

### 1. Code as Data
Tests can generate test cases programmatically:
```
;; Generate tests from data
(doseq [[input expected] test-cases]
  (testing (str "input: " input)
    (is (= expected (function-under-test input)))))
```

### 2. Hot Reloading
Tests can be re-run without restart - leverage this:
```
;; Run single test during development
(run-test test-specific-function)

;; Run all tests when ready
(run-all-tests)
```

### 3. REPL State Pollution
Watch out for REPL state affecting tests:
```
;; Always reset state before test suite
(defn reset-test-state []
  (reset! global-state nil)
  (clear-caches))
```

### 4. Lazy Evaluation
Some Lisps have lazy sequences - force evaluation in tests:
```
;; Force lazy sequences
(is (= [1 2 3] (vec (lazy-function))))
```
