# Ruby Testing Strategy

## Language Profile
- **Family**: Scripting (Object-Oriented)
- **Paradigms**: Object-oriented, functional, metaprogramming
- **Type System**: Dynamic, strongly typed
- **Testing Culture**: BDD-focused with RSpec as de facto standard

## Primary Test Framework: RSpec

### Basic Test Structure
```ruby
# spec/calculator_spec.rb
require 'spec_helper'
require 'calculator'

RSpec.describe Calculator do
  subject(:calculator) { described_class.new }

  describe '#add' do
    it 'returns the sum of two numbers' do
      expect(calculator.add(2, 3)).to eq(5)
    end

    context 'with negative numbers' do
      it 'handles negative numbers correctly' do
        expect(calculator.add(-1, -2)).to eq(-3)
      end
    end
  end

  describe '#divide' do
    it 'raises an error when dividing by zero' do
      expect { calculator.divide(1, 0) }.to raise_error(ZeroDivisionError)
    end
  end
end
```

### RSpec Matchers
```ruby
# Equality
expect(actual).to eq(expected)
expect(actual).to eql(expected)  # Same value and type
expect(actual).to be(expected)   # Same object

# Comparisons
expect(actual).to be > 5
expect(actual).to be_between(1, 10)
expect(actual).to be_within(0.1).of(3.14)

# Collections
expect(array).to include(1, 2)
expect(array).to contain_exactly(1, 2, 3)
expect(array).to have_key(:name)
expect(array).to be_empty

# Types
expect(object).to be_a(String)
expect(object).to be_an_instance_of(User)
expect(object).to respond_to(:name)

# Truthiness
expect(value).to be_truthy
expect(value).to be_falsey
expect(value).to be_nil

# Errors
expect { code }.to raise_error(ErrorClass)
expect { code }.to raise_error("message")
expect { code }.not_to raise_error
```

### Test Lifecycle
```ruby
RSpec.describe MyClass do
  before(:all) { } # Once before all examples
  before(:each) { } # Before each example (default)
  after(:each) { }  # After each example
  after(:all) { }   # Once after all examples

  let(:user) { User.new(name: 'John') }      # Lazy-loaded
  let!(:eager_user) { User.new(name: 'Jane') } # Eager-loaded

  subject { described_class.new }
end
```

## Minitest (Built-in Alternative)
```ruby
require 'minitest/autorun'

class CalculatorTest < Minitest::Test
  def setup
    @calculator = Calculator.new
  end

  def test_addition
    assert_equal 5, @calculator.add(2, 3)
  end

  def test_division_by_zero
    assert_raises(ZeroDivisionError) do
      @calculator.divide(1, 0)
    end
  end
end
```

### Minitest Spec DSL
```ruby
require 'minitest/autorun'
require 'minitest/spec'

describe Calculator do
  before do
    @calculator = Calculator.new
  end

  it 'adds two numbers' do
    _(@calculator.add(2, 3)).must_equal 5
  end

  it 'raises error for division by zero' do
    _ { @calculator.divide(1, 0) }.must_raise ZeroDivisionError
  end
end
```

## Mocking with RSpec Mocks
```ruby
RSpec.describe Service do
  let(:repository) { instance_double(Repository) }
  let(:service) { described_class.new(repository) }

  describe '#process' do
    it 'calls repository with correct arguments' do
      allow(repository).to receive(:find).with(1).and_return(entity)
      
      result = service.process(1)

      expect(repository).to have_received(:find).with(1)
      expect(result).not_to be_nil
    end
  end
end

# Stubbing
allow(object).to receive(:method).and_return(value)
allow(object).to receive(:method).with(args).and_return(value)
allow(object).to receive(:method) { |arg| arg * 2 }

# Expectations
expect(object).to receive(:method).once
expect(object).to receive(:method).exactly(3).times
expect(object).not_to receive(:method)
```

## Factory Bot (Test Data)
```ruby
# spec/factories/users.rb
FactoryBot.define do
  factory :user do
    name { 'John Doe' }
    email { Faker::Internet.email }
    
    trait :admin do
      role { 'admin' }
    end
  end
end

# Usage in specs
let(:user) { create(:user) }
let(:admin) { create(:user, :admin) }
let(:users) { create_list(:user, 3) }
```

## Rails Testing (If Rails Project)
```ruby
# spec/models/user_spec.rb
require 'rails_helper'

RSpec.describe User, type: :model do
  it { is_expected.to validate_presence_of(:email) }
  it { is_expected.to have_many(:posts) }
end

# spec/requests/api_spec.rb
RSpec.describe 'API', type: :request do
  describe 'GET /api/items' do
    it 'returns items' do
      get '/api/items'
      
      expect(response).to have_http_status(:ok)
      expect(JSON.parse(response.body)).to be_an(Array)
    end
  end

  describe 'POST /api/items' do
    it 'creates an item' do
      post '/api/items', params: { item: { name: 'Test' } }

      expect(response).to have_http_status(:created)
      expect(Item.count).to eq(1)
    end
  end
end

# spec/system/login_spec.rb (Capybara)
RSpec.describe 'Login', type: :system do
  it 'allows users to sign in' do
    visit new_session_path
    fill_in 'Email', with: 'user@example.com'
    fill_in 'Password', with: 'password'
    click_button 'Sign In'

    expect(page).to have_content('Welcome')
  end
end
```

## Test Organization
```
project/
  lib/
    calculator.rb
  spec/
    spec_helper.rb
    rails_helper.rb  # For Rails
    support/
      factory_bot.rb
    factories/
      users.rb
    models/
      user_spec.rb
    requests/
      api_spec.rb
    system/
      login_spec.rb
  Gemfile
```

## Configuration (spec/spec_helper.rb)
```ruby
RSpec.configure do |config|
  config.expect_with :rspec do |expectations|
    expectations.include_chain_clauses_in_custom_matcher_descriptions = true
  end

  config.mock_with :rspec do |mocks|
    mocks.verify_partial_doubles = true
  end

  config.shared_context_metadata_behavior = :apply_to_host_groups
  config.filter_run_when_matching :focus
  config.disable_monkey_patching!
  config.order = :random
end
```

## Gemfile Dependencies
```ruby
group :test do
  gem 'rspec', '~> 3.12'
  gem 'rspec-rails', '~> 6.0' # For Rails
  gem 'factory_bot_rails', '~> 6.2'
  gem 'faker', '~> 3.2'
  gem 'shoulda-matchers', '~> 5.3'
  gem 'capybara', '~> 3.39'
  gem 'selenium-webdriver', '~> 4.0'
  gem 'simplecov', '~> 0.22', require: false
end
```

## Coverage Tools

### SimpleCov
```ruby
# spec/spec_helper.rb (at the very top)
require 'simplecov'
SimpleCov.start do
  add_filter '/spec/'
  add_group 'Models', 'app/models'
  add_group 'Controllers', 'app/controllers'
end
```

```bash
bundle exec rspec
open coverage/index.html
```

## File Pattern Detection
- `Gemfile` - Dependency manifest
- `*.rb` - Ruby source files
- `spec/` or `test/` - Test directories
- `*_spec.rb` - RSpec test files
- `*_test.rb` - Minitest test files
- `.rspec` - RSpec configuration

## Recommended Test Stack
1. **Unit/Integration**: RSpec
2. **Data Factories**: Factory Bot
3. **Fake Data**: Faker
4. **Rails Matchers**: Shoulda Matchers
5. **E2E/System**: Capybara + Selenium
6. **Coverage**: SimpleCov
7. **API Testing**: RSpec Request Specs

## CI Configuration (GitHub Actions)
```yaml
name: Ruby CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Ruby
        uses: ruby/setup-ruby@v1
        with:
          ruby-version: '3.2'
          bundler-cache: true
          
      - name: Setup database
        env:
          RAILS_ENV: test
          DATABASE_URL: postgres://postgres:postgres@localhost:5432/test
        run: |
          bundle exec rails db:create
          bundle exec rails db:schema:load
          
      - name: Run tests
        run: bundle exec rspec --format documentation
        
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: coverage/coverage.xml
```

## Ruby-Specific Considerations

### Testing Private Methods
```ruby
# Option 1: Test through public interface (preferred)
# Option 2: Use send (when necessary)
expect(object.send(:private_method)).to eq(expected)
```

### Testing Blocks
```ruby
it 'yields control to the block' do
  expect { |b| method_with_block(&b) }.to yield_control
end

it 'yields with arguments' do
  expect { |b| method_with_block(&b) }.to yield_with_args(1, 2)
end
```

### Testing Time-Dependent Code
```ruby
# Using Timecop
Timecop.freeze(Time.local(2024, 1, 1)) do
  expect(time_sensitive_method).to eq(expected)
end

# Using Rails travel_to
travel_to Time.zone.local(2024, 1, 1) do
  expect(time_sensitive_method).to eq(expected)
end
```

### Shared Examples
```ruby
RSpec.shared_examples 'a searchable model' do
  it { is_expected.to respond_to(:search) }
  
  describe '.search' do
    it 'returns matching records' do
      expect(described_class.search('term')).not_to be_empty
    end
  end
end

RSpec.describe User do
  it_behaves_like 'a searchable model'
end
```
