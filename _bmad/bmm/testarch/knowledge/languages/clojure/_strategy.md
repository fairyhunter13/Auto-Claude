# Clojure Testing Strategy

## Language Profile
- **Family**: Lisp Family
- **Paradigms**: Functional, concurrent, homoiconic
- **Type System**: Dynamic, strongly typed
- **Testing Culture**: REPL-driven development, generative testing

## Primary Test Framework: clojure.test

### Basic Test Structure
```clojure
;; test/calculator_test.clj
(ns calculator-test
  (:require [clojure.test :refer :all]
            [calculator :refer :all]))

(deftest addition-test
  (testing "Adding positive numbers"
    (is (= 5 (add 2 3))))
  
  (testing "Adding negative numbers"
    (is (= -3 (add -1 -2)))))

(deftest division-test
  (testing "Normal division"
    (is (= 2 (divide 6 3))))
  
  (testing "Division by zero throws"
    (is (thrown? ArithmeticException (divide 1 0)))))
```

### clojure.test Assertions
```clojure
;; Equality
(is (= expected actual))
(is (not= unexpected actual))

;; Truthiness
(is value)
(is (nil? value))
(is (some? value))

;; Type checking
(is (instance? String value))
(is (vector? value))
(is (map? value))

;; Exceptions
(is (thrown? ExceptionClass (code)))
(is (thrown-with-msg? ExceptionClass #"pattern" (code)))

;; Predicates
(is (pos? value))
(is (empty? coll))
(is (contains? map :key))

;; With message
(is (= expected actual) "Custom failure message")
```

### Test Fixtures
```clojure
(use-fixtures :once
  (fn [tests]
    (setup-database)
    (tests)
    (teardown-database)))

(use-fixtures :each
  (fn [tests]
    (reset! state {})
    (tests)))

;; Multiple fixtures
(use-fixtures :each
  setup-fixture
  logging-fixture
  cleanup-fixture)
```

## Property-Based Testing (test.check)
```clojure
(ns calculator-property-test
  (:require [clojure.test :refer :all]
            [clojure.test.check :as tc]
            [clojure.test.check.generators :as gen]
            [clojure.test.check.properties :as prop]
            [clojure.test.check.clojure-test :refer [defspec]]))

(defspec addition-commutative 100
  (prop/for-all [a gen/int
                 b gen/int]
    (= (add a b) (add b a))))

(defspec addition-associative 100
  (prop/for-all [a gen/int
                 b gen/int
                 c gen/int]
    (= (add (add a b) c)
       (add a (add b c)))))

(defspec string-reverse-identity 100
  (prop/for-all [s gen/string-alphanumeric]
    (= s (clojure.string/reverse 
          (clojure.string/reverse s)))))
```

### Custom Generators
```clojure
(def user-gen
  (gen/hash-map
    :name gen/string-alphanumeric
    :age (gen/choose 18 100)
    :email (gen/fmap 
             (fn [s] (str s "@example.com"))
             gen/string-alphanumeric)))

(defspec user-validation 50
  (prop/for-all [user user-gen]
    (valid-user? user)))
```

## Expectations (Alternative Framework)
```clojure
(ns calculator-expectations-test
  (:require [expectations.clojure.test :refer :all]
            [calculator :refer :all]))

(defexpect addition-expectations
  (expect 5 (add 2 3))
  (expect #"positive" (str (add 1 1)))
  (expect ArithmeticException (divide 1 0)))

;; More expectations
(expect {:a 1} (in {:a 1 :b 2}))  ; subset
(expect [1 2] (in [1 2 3]))       ; subsequence
```

## Midje (BDD-style)
```clojure
(ns calculator-midje-test
  (:require [midje.sweet :refer :all]
            [calculator :refer :all]))

(facts "about addition"
  (fact "adds positive numbers"
    (add 2 3) => 5)
  
  (fact "adds negative numbers"
    (add -1 -2) => -3))

(facts "about division"
  (fact "divides normally"
    (divide 6 3) => 2)
  
  (fact "throws on zero"
    (divide 1 0) => (throws ArithmeticException)))

;; Mocking with Midje
(fact "calls external service"
  (process-data "input") => "result"
  (provided
    (external-api "input") => "api-response"))
```

## Mocking/Stubbing

### with-redefs (Built-in)
```clojure
(deftest service-test
  (with-redefs [http/get (fn [_] {:status 200 :body "data"})]
    (is (= "data" (fetch-data)))))
```

### Mock Library
```clojure
(ns service-test
  (:require [clojure.test :refer :all]
            [mock-clj.core :refer [with-mock]]))

(deftest service-with-mock
  (with-mock [http/get {:status 200 :body "data"}]
    (is (= "data" (fetch-data)))
    (is (= 1 (call-count http/get)))))
```

## Spec Testing (clojure.spec)
```clojure
(ns user-spec
  (:require [clojure.spec.alpha :as s]
            [clojure.spec.test.alpha :as stest]))

;; Define specs
(s/def ::name (s/and string? #(> (count %) 0)))
(s/def ::age (s/and int? #(>= % 0)))
(s/def ::user (s/keys :req-un [::name ::age]))

;; Function spec
(s/fdef create-user
  :args (s/cat :name ::name :age ::age)
  :ret ::user)

;; Generative testing from specs
(stest/check `create-user)

;; In tests
(deftest user-spec-test
  (is (s/valid? ::user {:name "John" :age 30}))
  (is (not (s/valid? ::user {:name "" :age -1}))))
```

## Test Organization
```
src/
  calculator/
    core.clj
test/
  calculator/
    core_test.clj
    property_test.clj
deps.edn (or project.clj)
```

## Configuration

### deps.edn
```clojure
{:deps {org.clojure/clojure {:mvn/version "1.11.1"}}
 
 :aliases
 {:test
  {:extra-paths ["test"]
   :extra-deps {org.clojure/test.check {:mvn/version "1.1.1"}
                expectations/clojure-test {:mvn/version "2.0.0"}
                nubank/matcher-combinators {:mvn/version "3.8.5"}}
   :main-opts ["-m" "cognitect.test-runner"]
   :exec-fn cognitect.test-runner.api/test}
  
  :coverage
  {:extra-deps {cloverage/cloverage {:mvn/version "1.2.4"}}
   :main-opts ["-m" "cloverage.coverage"]}}}
```

### project.clj (Leiningen)
```clojure
(defproject my-app "0.1.0"
  :dependencies [[org.clojure/clojure "1.11.1"]]
  :profiles
  {:dev {:dependencies [[org.clojure/test.check "1.1.1"]
                        [expectations/clojure-test "2.0.0"]]}}
  :plugins [[lein-cloverage "1.2.4"]])
```

## Running Tests
```bash
# With deps.edn
clj -X:test

# With Leiningen
lein test
lein test :only namespace-test
lein test :only namespace-test/specific-test

# With coverage
clj -M:coverage
lein cloverage
```

## File Pattern Detection
- `deps.edn` or `project.clj` - Project file
- `*.clj` - Clojure source files
- `*.cljs` - ClojureScript files
- `*.cljc` - Cross-platform files
- `src/` - Source files
- `test/` - Test files
- `*_test.clj` - Test files

## Recommended Test Stack
1. **Unit**: clojure.test (built-in)
2. **Property**: test.check
3. **BDD**: Midje (optional)
4. **Expectations**: expectations library
5. **Coverage**: Cloverage
6. **Spec Testing**: clojure.spec

## CI Configuration (GitHub Actions)
```yaml
name: Clojure CI

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
          
      - name: Install Clojure CLI
        uses: DeLaGuardo/setup-clojure@12.1
        with:
          cli: 'latest'
          
      - name: Cache deps
        uses: actions/cache@v3
        with:
          path: ~/.m2/repository
          key: ${{ runner.os }}-clojure-${{ hashFiles('**/deps.edn') }}
          
      - name: Run tests
        run: clojure -X:test
        
      - name: Run coverage
        run: clojure -M:coverage --codecov
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Clojure-Specific Considerations

### Testing Atoms
```clojure
(deftest atom-test
  (let [counter (atom 0)]
    (swap! counter inc)
    (is (= 1 @counter))
    (reset! counter 10)
    (is (= 10 @counter))))
```

### Testing Refs (STM)
```clojure
(deftest ref-test
  (let [account (ref 100)]
    (dosync (alter account + 50))
    (is (= 150 @account))))
```

### Testing Agents
```clojure
(deftest agent-test
  (let [a (agent 0)]
    (send a inc)
    (await a)
    (is (= 1 @a))))
```

### Testing Lazy Sequences
```clojure
(deftest lazy-seq-test
  (is (= [1 2 3] (take 3 (iterate inc 1))))
  (is (= [2 4 6] (take 3 (filter even? (range))))))
```

### REPL-Driven Testing
```clojure
;; In REPL
(require '[clojure.test :refer [run-tests]])
(require 'my-namespace-test)
(run-tests 'my-namespace-test)

;; Run all tests
(require '[clojure.test :refer [run-all-tests]])
(run-all-tests #"my-app.*-test")
```

### Testing Macros
```clojure
(defmacro when-let* [bindings & body]
  ...)

(deftest macro-test
  (is (= 6 (when-let* [a 1 b 2 c 3] (+ a b c))))
  (is (nil? (when-let* [a 1 b nil c 3] (+ a b c)))))
```

### Testing Multimethods
```clojure
(defmulti process-data :type)
(defmethod process-data :string [m] (str (:data m)))
(defmethod process-data :number [m] (* 2 (:data m)))

(deftest multimethod-test
  (is (= "hello" (process-data {:type :string :data "hello"})))
  (is (= 10 (process-data {:type :number :data 5}))))
```
