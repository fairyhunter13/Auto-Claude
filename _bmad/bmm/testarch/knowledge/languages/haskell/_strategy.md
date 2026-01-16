# Haskell Testing Strategy

## Language Characteristics

- **Paradigm**: Purely functional, lazy evaluation
- **Type System**: Strong static typing with type inference, algebraic data types
- **Memory**: Garbage collected with lazy evaluation
- **Concurrency**: Software transactional memory (STM), lightweight threads

## Testing Pyramid

```
        /  Property-Based  \      <- QuickCheck, Hedgehog
       /    Integration     \     <- hspec, tasty with IO
      /      Unit Tests      \    <- HUnit, hspec, tasty
     /________________________\
```

## Primary Framework: HSpec

### Installation

```bash
# In package.yaml or cabal file
dependencies:
  - hspec
  - hspec-discover
  - QuickCheck
  - hspec-expectations
```

### Project Structure

```
project/
├── src/
│   └── MyLib.hs
├── test/
│   ├── Spec.hs              # Test discovery entry point
│   ├── MyLibSpec.hs         # Unit tests for MyLib
│   └── PropertySpec.hs      # Property-based tests
├── package.yaml
└── stack.yaml
```

### Basic Test Patterns

```haskell
-- test/MyLibSpec.hs
module MyLibSpec (spec) where

import Test.Hspec
import Test.QuickCheck
import MyLib

spec :: Spec
spec = do
  describe "reverse" $ do
    it "reverses a list" $
      reverse [1, 2, 3] `shouldBe` [3, 2, 1]
    
    it "is its own inverse" $ property $
      \xs -> reverse (reverse xs) == (xs :: [Int])
    
    it "preserves length" $ property $
      \xs -> length (reverse xs) == length (xs :: [Int])
  
  describe "sort" $ do
    it "sorts empty list" $
      sort ([] :: [Int]) `shouldBe` []
    
    it "produces sorted output" $ property $
      \xs -> isSorted (sort (xs :: [Int]))

-- Helper function
isSorted :: Ord a => [a] -> Bool
isSorted [] = True
isSorted [_] = True
isSorted (x:y:xs) = x <= y && isSorted (y:xs)
```

## Alternative Framework: Tasty

```haskell
-- test/Main.hs
import Test.Tasty
import Test.Tasty.HUnit
import Test.Tasty.QuickCheck as QC

main :: IO ()
main = defaultMain tests

tests :: TestTree
tests = testGroup "Tests"
  [ testGroup "Unit tests"
      [ testCase "reverse works" $
          reverse [1,2,3] @?= [3,2,1]
      , testCase "empty list" $
          reverse [] @?= ([] :: [Int])
      ]
  , testGroup "Properties"
      [ QC.testProperty "reverse . reverse = id" $
          \xs -> reverse (reverse xs) == (xs :: [Int])
      , QC.testProperty "sort is idempotent" $
          \xs -> sort (sort xs) == sort (xs :: [Int])
      ]
  ]
```

## Property-Based Testing with QuickCheck

```haskell
import Test.QuickCheck

-- Custom generators
newtype PositiveInt = PositiveInt Int
  deriving (Show, Eq)

instance Arbitrary PositiveInt where
  arbitrary = PositiveInt . abs <$> arbitrary

-- Properties
prop_reversePreservesLength :: [Int] -> Bool
prop_reversePreservesLength xs = length (reverse xs) == length xs

prop_sortIdempotent :: [Int] -> Bool
prop_sortIdempotent xs = sort (sort xs) == sort xs

prop_sortPreservesElements :: [Int] -> Bool
prop_sortPreservesElements xs = sort xs `isPermutationOf` xs
  where
    isPermutationOf a b = sort a == sort b

-- Conditional properties
prop_headOfSorted :: NonEmptyList Int -> Bool
prop_headOfSorted (NonEmpty xs) = head (sort xs) == minimum xs

-- Properties with implication
prop_insertPreservesSorted :: Int -> [Int] -> Property
prop_insertPreservesSorted x xs =
  isSorted xs ==> isSorted (insert x xs)
```

## Testing with Monads

```haskell
-- Testing IO actions
spec :: Spec
spec = do
  describe "file operations" $ do
    it "reads and writes files" $ do
      let content = "test content"
      writeFile "test.txt" content
      result <- readFile "test.txt"
      result `shouldBe` content
    
    around withTempFile $ do
      it "works with temp files" $ \path -> do
        writeFile path "hello"
        content <- readFile path
        content `shouldBe` "hello"

-- Testing State monad
describe "State monad" $ do
  it "increments counter" $ do
    let action = do
          modify (+1)
          modify (+1)
          get
    evalState action 0 `shouldBe` 2

-- Testing Either/Maybe
describe "error handling" $ do
  it "handles errors" $ do
    safeDivide 10 2 `shouldBe` Right 5
    safeDivide 10 0 `shouldSatisfy` isLeft
```

## Testing Type Classes

```haskell
-- Testing Functor laws
prop_functorIdentity :: (Eq (f a), Functor f) => f a -> Bool
prop_functorIdentity x = fmap id x == x

prop_functorComposition :: (Eq (f c), Functor f) 
                        => (b -> c) -> (a -> b) -> f a -> Bool
prop_functorComposition f g x = fmap (f . g) x == (fmap f . fmap g) x

-- Testing Monad laws
prop_monadLeftIdentity :: (Eq (m b), Monad m) => a -> (a -> m b) -> Bool
prop_monadLeftIdentity a f = (return a >>= f) == f a

prop_monadRightIdentity :: (Eq (m a), Monad m) => m a -> Bool
prop_monadRightIdentity m = (m >>= return) == m

prop_monadAssociativity :: (Eq (m c), Monad m) 
                        => m a -> (a -> m b) -> (b -> m c) -> Bool
prop_monadAssociativity m f g = 
  ((m >>= f) >>= g) == (m >>= (\x -> f x >>= g))
```

## Mocking with TypeApplications

```haskell
{-# LANGUAGE TypeApplications #-}

-- Define a type class for effects
class Monad m => MonadDatabase m where
  getUser :: UserId -> m (Maybe User)
  saveUser :: User -> m ()

-- Production implementation
instance MonadDatabase IO where
  getUser = Database.getUser
  saveUser = Database.saveUser

-- Test implementation
newtype TestM a = TestM { runTestM :: State TestState a }
  deriving (Functor, Applicative, Monad, MonadState TestState)

data TestState = TestState
  { users :: Map UserId User
  }

instance MonadDatabase TestM where
  getUser uid = gets (Map.lookup uid . users)
  saveUser user = modify $ \s -> s { users = Map.insert (userId user) user (users s) }

-- Tests
spec :: Spec
spec = do
  describe "user service" $ do
    it "creates and retrieves user" $ do
      let action = do
            saveUser testUser
            getUser (userId testUser)
          result = evalState (runTestM action) (TestState Map.empty)
      result `shouldBe` Just testUser
```

## Performance Testing

```haskell
import Criterion.Main

main :: IO ()
main = defaultMain
  [ bgroup "sort"
      [ bench "small"  $ nf sort [1..100 :: Int]
      , bench "medium" $ nf sort [1..1000 :: Int]
      , bench "large"  $ nf sort [1..10000 :: Int]
      ]
  , bgroup "reverse"
      [ bench "small"  $ nf reverse [1..100 :: Int]
      , bench "medium" $ nf reverse [1..1000 :: Int]
      ]
  ]
```

## Commands

```bash
# Run all tests
stack test

# Run with coverage
stack test --coverage

# Run specific tests
stack test --test-arguments="--match reverse"

# Run with verbose output
stack test --test-arguments="--format=progress"

# Run property tests with more cases
stack test --test-arguments="--qc-max-success=1000"

# Run benchmarks
stack bench
```

## Best Practices

1. **Use property-based testing** - Let QuickCheck find edge cases
2. **Test algebraic laws** - Verify typeclass instances
3. **Separate pure and IO tests** - Keep pure code easy to test
4. **Use type-driven development** - Let types guide testing
5. **Test at type boundaries** - Focus on public API
6. **Use hspec-discover** - Automatic test discovery
