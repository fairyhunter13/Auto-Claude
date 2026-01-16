# Scripting-Family Testing Strategy

> **Tier 2 Fallback** - Applied when specific language not recognized but scripting patterns detected.

## Family Characteristics

Scripting languages share these traits that affect testing:
- **Dynamic typing** - Runtime type flexibility
- **Interpreted execution** - No compile step (usually)
- **Rapid iteration** - Quick feedback loops
- **Text processing focus** - String manipulation, regex
- **Glue code role** - Integration between systems
- **Duck typing** - Interface by behavior

## Known Members

| Language | Test Framework(s) | Test Pattern |
|----------|-------------------|--------------|
| Python | pytest, unittest, nose2 | `test_*.py`, `*_test.py` |
| Ruby | RSpec, Minitest, Test::Unit | `*_spec.rb`, `*_test.rb` |
| Perl | Test::More, Test2, Test::Simple | `t/*.t` |
| Lua | busted, luaunit | `*_spec.lua`, `test_*.lua` |
| PHP | PHPUnit, Pest, Codeception | `*Test.php`, `test_*.php` |
| Tcl | tcltest | `*.test` |
| Bash | bats, shunit2 | `*.bats`, `test_*.sh` |
| PowerShell | Pester | `*.Tests.ps1` |
| JavaScript | Jest, Mocha, Vitest | `*.test.js`, `*.spec.js` |

## Universal Testing Patterns

### 1. Dynamic Typing Compensation

Extra tests needed for type-related bugs:

```python
# Conceptual - test type handling explicitly

def test_function_handles_various_types():
    # Test with expected type
    assert process(42) == expected_int_result
    
    # Test with string (might be valid)
    assert process("42") == expected_string_result
    
    # Test with None/null
    with raises(ValueError):
        process(None)
    
    # Test with wrong type
    with raises(TypeError):
        process([1, 2, 3])
```

### 2. Test Structure Pattern

Scripting tests use **describe-it** BDD style or simple assertions:

```ruby
# BDD style (RSpec-like)
describe UserService do
  describe '#create_user' do
    context 'with valid email' do
      it 'creates the user' do
        result = UserService.create_user(email: 'test@example.com')
        expect(result).to be_success
        expect(result.user.email).to eq('test@example.com')
      end
    end
    
    context 'with invalid email' do
      it 'returns an error' do
        result = UserService.create_user(email: 'invalid')
        expect(result).to be_failure
        expect(result.errors).to include(:invalid_email)
      end
    end
  end
end
```

### 3. Fixture and Factory Patterns

Scripting languages often use fixtures/factories:

```python
# Fixtures (pytest style)
@pytest.fixture
def test_user():
    return User(id=1, email="test@example.com", name="Test User")

@pytest.fixture
def authenticated_client(test_user):
    client = TestClient(app)
    client.login(test_user)
    return client

def test_user_profile(authenticated_client, test_user):
    response = authenticated_client.get('/profile')
    assert response.json()['email'] == test_user.email
```

```ruby
# Factories (FactoryBot style)
FactoryBot.define do
  factory :user do
    email { Faker::Internet.email }
    name { Faker::Name.name }
    
    trait :admin do
      role { 'admin' }
    end
  end
end

# Usage in test
let(:admin_user) { create(:user, :admin) }
```

### 4. Mocking and Stubbing

Dynamic nature makes mocking easy:

```python
# Python mock
from unittest.mock import Mock, patch

def test_sends_notification():
    with patch('myapp.notifications.send_email') as mock_send:
        mock_send.return_value = True
        
        result = notify_user(user_id=1, message="Hello")
        
        assert result == True
        mock_send.assert_called_once_with(
            to="user@example.com",
            body="Hello"
        )
```

```ruby
# Ruby mock (RSpec)
it 'sends notification' do
  allow(NotificationService).to receive(:send).and_return(true)
  
  result = notify_user(user_id: 1, message: "Hello")
  
  expect(result).to be true
  expect(NotificationService).to have_received(:send).with(
    to: "user@example.com",
    body: "Hello"
  )
end
```

### 5. Integration Testing

Scripting excels at integration tests:

```python
# Database integration
def test_user_persistence(db_session):
    user = User(email="test@example.com")
    db_session.add(user)
    db_session.commit()
    
    loaded = db_session.query(User).filter_by(email="test@example.com").first()
    assert loaded is not None
    assert loaded.id == user.id
```

```bash
# Shell script integration (bats)
@test "cli creates config file" {
    run myapp init --config /tmp/test.cfg
    [ "$status" -eq 0 ]
    [ -f /tmp/test.cfg ]
}
```

### 6. Snapshot Testing

Popular in scripting for output comparison:

```python
# Snapshot test
def test_report_generation(snapshot):
    report = generate_monthly_report(year=2024, month=1)
    snapshot.assert_match(report, 'monthly_report.txt')
```

```javascript
// Jest snapshot
test('renders correctly', () => {
  const tree = renderer.create(<Component />).toJSON();
  expect(tree).toMatchSnapshot();
});
```

## Framework Detection Heuristics

When language is unknown but scripting-family, look for:

### Shebang Lines
| Shebang | Language |
|---------|----------|
| `#!/usr/bin/env python`, `#!/usr/bin/python` | Python |
| `#!/usr/bin/env ruby`, `#!/usr/bin/ruby` | Ruby |
| `#!/usr/bin/perl` | Perl |
| `#!/usr/bin/env lua`, `#!/usr/bin/lua` | Lua |
| `#!/bin/bash`, `#!/bin/sh` | Bash |
| `#!/usr/bin/env php`, `#!/usr/bin/php` | PHP |

### Project Files
| File | Likely Language |
|------|-----------------|
| `pyproject.toml`, `setup.py`, `requirements.txt` | Python |
| `Gemfile`, `*.gemspec` | Ruby |
| `Makefile.PL`, `cpanfile` | Perl |
| `*.rockspec` | Lua |
| `composer.json` | PHP |
| `package.json` | JavaScript/Node |

### Test Dependencies
| Pattern | Framework |
|---------|-----------|
| `pytest`, `unittest` | Python |
| `rspec`, `minitest` | Ruby |
| `Test::More`, `Test2` | Perl |
| `phpunit`, `pest` | PHP |
| `jest`, `mocha`, `vitest` | JavaScript |
| `busted` | Lua |

## Recommended Test Strategy

### For Unknown Scripting-Family Language

1. **Test type handling** - Dynamic typing needs explicit tests
2. **Use fixtures/factories** - Manage test data consistently
3. **Mock external services** - Easy in scripting languages
4. **Add integration tests** - Scripting often does I/O
5. **Consider snapshot tests** - Good for output-heavy code

### Test Distribution Guidance

| Test Type | Percentage | Rationale |
|-----------|------------|-----------|
| Unit tests | 40-50% | Core logic |
| Integration | 25-35% | I/O boundaries |
| Type/edge cases | 10-15% | Dynamic typing |
| Snapshot | 5-10% | Output verification |
| E2E | 5-10% | User workflows |

### Coverage Guidance

- **Line coverage**: 80%+ target
- **Branch coverage**: 75%+ (dynamic branching)
- **Type variations**: Test null, wrong types
- **Error paths**: Exception handling tests

## Fallback Commands

When framework unknown, try these:

```bash
# Python
pytest
python -m pytest
python -m unittest discover

# Ruby
bundle exec rspec
rake test
ruby -Itest test/*_test.rb

# Perl
prove -l t/
perl Makefile.PL && make test

# PHP
./vendor/bin/phpunit
./vendor/bin/pest

# Lua
busted
lua test/run_tests.lua

# Bash
bats test/
./test.sh

# PowerShell
Invoke-Pester

# Node.js/JavaScript
npm test
npx jest
npx vitest
```

## Integration with TEA Workflows

When scripting-family inference is used:

1. **Emphasize type testing** - Dynamic typing gaps
2. **Check for fixtures** - May already exist
3. **Look for mocking patterns** - Usually in place
4. **Suggest integration tests** - Natural for scripting
5. **Consider snapshot testing** - Good for text output

## Common Pitfalls

### 1. Implicit Type Coercion
```python
# This might "work" but be wrong
def add(a, b):
    return a + b

# Need explicit type tests
def test_add_rejects_strings():
    with raises(TypeError):
        add("1", "2")  # Or does it concatenate?
```

### 2. Global State Pollution
```python
# Tests can affect each other
global_config = {}

def test_one():
    global_config['key'] = 'value'

def test_two():
    # May fail or pass depending on test order!
    assert 'key' not in global_config
```

### 3. External Dependency Flakiness
```ruby
# Don't hit real APIs in tests
it 'fetches user data' do
  # BAD: hits real API
  result = ExternalApi.fetch_user(1)
  
  # GOOD: mock it
  allow(ExternalApi).to receive(:fetch_user).and_return(mock_user)
  result = ExternalApi.fetch_user(1)
end
```

### 4. Path/Environment Assumptions
```bash
# Tests may fail in different environments
@test "finds config" {
    # BAD: assumes specific path
    [ -f ~/.myapp/config ]
    
    # GOOD: use test fixtures
    [ -f "$BATS_TEST_DIRNAME/fixtures/config" ]
}
```

### 5. Async/Callback Testing
```javascript
// Async needs proper handling
test('async operation', async () => {
    // BAD: doesn't wait
    fetchData().then(data => expect(data).toBe(expected));
    
    // GOOD: await or return promise
    const data = await fetchData();
    expect(data).toBe(expected);
});
```
