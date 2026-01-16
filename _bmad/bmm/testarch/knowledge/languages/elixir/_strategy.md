# Elixir Testing Strategy

## Language Profile
- **Family**: ML-Family / Functional
- **Paradigms**: Functional, concurrent, metaprogramming
- **Type System**: Dynamic, strongly typed
- **Testing Culture**: Built-in ExUnit, property-based with StreamData

## Primary Test Framework: ExUnit

### Basic Test Structure
```elixir
# test/calculator_test.exs
defmodule CalculatorTest do
  use ExUnit.Case
  doctest Calculator

  describe "add/2" do
    test "adds two positive numbers" do
      assert Calculator.add(2, 3) == 5
    end

    test "adds negative numbers" do
      assert Calculator.add(-1, -2) == -3
    end
  end

  describe "divide/2" do
    test "divides two numbers" do
      assert Calculator.divide(6, 2) == 3.0
    end

    test "raises error for division by zero" do
      assert_raise ArithmeticError, fn ->
        Calculator.divide(1, 0)
      end
    end
  end
end
```

### ExUnit Assertions
```elixir
# Equality
assert actual == expected
refute actual == unexpected

# Pattern matching
assert {:ok, value} = result
assert %{name: "John"} = user

# Truthiness
assert value
refute value

# Comparison
assert length(list) > 0
assert String.length(str) <= 10

# Exceptions
assert_raise RuntimeError, fn -> raise "error" end
assert_raise RuntimeError, "error message", fn -> raise "error message" end

# Receive (message passing)
send(self(), :hello)
assert_receive :hello
assert_receive {:msg, _value}, 1000  # with timeout

# Approximate equality
assert_in_delta 3.14, 3.141592, 0.01
```

### Setup and Callbacks
```elixir
defmodule MyTest do
  use ExUnit.Case

  # Run once before all tests
  setup_all do
    {:ok, conn: Database.connect()}
  end

  # Run before each test
  setup context do
    user = create_user()
    {:ok, user: user}
  end

  test "uses context", %{user: user} do
    assert user.name == "test"
  end
end
```

### Tags and Filtering
```elixir
defmodule MyTest do
  use ExUnit.Case

  @tag :slow
  test "slow test" do
    # ...
  end

  @tag :external
  @tag timeout: 60_000
  test "external service" do
    # ...
  end
end

# Run only slow tests: mix test --only slow
# Exclude slow tests: mix test --exclude slow
```

## Property-Based Testing (StreamData)
```elixir
# test/calculator_property_test.exs
defmodule CalculatorPropertyTest do
  use ExUnit.Case
  use ExUnitProperties

  property "addition is commutative" do
    check all a <- integer(),
              b <- integer() do
      assert Calculator.add(a, b) == Calculator.add(b, a)
    end
  end

  property "addition is associative" do
    check all a <- integer(),
              b <- integer(),
              c <- integer() do
      assert Calculator.add(Calculator.add(a, b), c) ==
             Calculator.add(a, Calculator.add(b, c))
    end
  end

  property "string reversal" do
    check all str <- string(:alphanumeric) do
      assert String.reverse(String.reverse(str)) == str
    end
  end
end
```

## Mocking with Mox
```elixir
# Define behaviour
defmodule HttpClient do
  @callback get(String.t()) :: {:ok, map()} | {:error, term()}
end

# test/support/mocks.ex
Mox.defmock(MockHttpClient, for: HttpClient)

# test/service_test.exs
defmodule ServiceTest do
  use ExUnit.Case
  import Mox

  setup :verify_on_exit!

  test "fetches data from API" do
    expect(MockHttpClient, :get, fn url ->
      assert url == "https://api.example.com/data"
      {:ok, %{data: "value"}}
    end)

    assert {:ok, result} = Service.fetch_data()
    assert result.data == "value"
  end

  test "handles API errors" do
    stub(MockHttpClient, :get, fn _url ->
      {:error, :timeout}
    end)

    assert {:error, :timeout} = Service.fetch_data()
  end
end
```

## Phoenix Testing (If Phoenix Project)
```elixir
# Controller test
defmodule MyAppWeb.UserControllerTest do
  use MyAppWeb.ConnCase

  describe "index" do
    test "lists all users", %{conn: conn} do
      conn = get(conn, ~p"/api/users")
      assert json_response(conn, 200)["data"] == []
    end
  end

  describe "create" do
    test "creates user with valid data", %{conn: conn} do
      conn = post(conn, ~p"/api/users", user: %{name: "John"})
      assert %{"id" => id} = json_response(conn, 201)["data"]
    end
  end
end

# LiveView test
defmodule MyAppWeb.UserLiveTest do
  use MyAppWeb.ConnCase
  import Phoenix.LiveViewTest

  test "renders user list", %{conn: conn} do
    {:ok, view, html} = live(conn, ~p"/users")
    assert html =~ "Users"
    
    assert view
           |> element("button", "Add User")
           |> render_click() =~ "New User Form"
  end
end
```

## Ecto Testing (Database)
```elixir
defmodule MyApp.AccountsTest do
  use MyApp.DataCase

  alias MyApp.Accounts

  describe "users" do
    test "list_users/0 returns all users" do
      user = insert(:user)
      assert Accounts.list_users() == [user]
    end

    test "create_user/1 with valid data" do
      assert {:ok, %User{} = user} = Accounts.create_user(%{name: "John"})
      assert user.name == "John"
    end

    test "create_user/1 with invalid data" do
      assert {:error, %Ecto.Changeset{}} = Accounts.create_user(%{name: nil})
    end
  end
end
```

## Test Factories (ExMachina)
```elixir
# test/support/factory.ex
defmodule MyApp.Factory do
  use ExMachina.Ecto, repo: MyApp.Repo

  def user_factory do
    %MyApp.User{
      name: sequence(:name, &"User #{&1}"),
      email: sequence(:email, &"user#{&1}@example.com")
    }
  end

  def post_factory do
    %MyApp.Post{
      title: "Test Post",
      user: build(:user)
    }
  end
end

# Usage in tests
user = insert(:user)
user = insert(:user, name: "Custom Name")
users = insert_list(3, :user)
```

## Test Organization
```
lib/
  my_app/
    calculator.ex
test/
  my_app/
    calculator_test.exs
  support/
    conn_case.ex
    data_case.ex
    factory.ex
    mocks.ex
  test_helper.exs
mix.exs
```

## Configuration (mix.exs)
```elixir
def project do
  [
    app: :my_app,
    version: "0.1.0",
    elixir: "~> 1.15",
    elixirc_paths: elixirc_paths(Mix.env()),
    deps: deps(),
    test_coverage: [tool: ExCoveralls],
    preferred_cli_env: [
      coveralls: :test,
      "coveralls.html": :test
    ]
  ]
end

defp elixirc_paths(:test), do: ["lib", "test/support"]
defp elixirc_paths(_), do: ["lib"]

defp deps do
  [
    {:stream_data, "~> 0.6", only: :test},
    {:mox, "~> 1.0", only: :test},
    {:ex_machina, "~> 2.7", only: :test},
    {:excoveralls, "~> 0.18", only: :test}
  ]
end
```

## Coverage Tools

### ExCoveralls
```bash
# Run with coverage
mix coveralls

# HTML report
mix coveralls.html
```

## File Pattern Detection
- `mix.exs` - Mix project file
- `*.ex` - Elixir source files
- `*.exs` - Elixir script files
- `lib/` - Library code
- `test/` - Test files
- `*_test.exs` - Test files

## Recommended Test Stack
1. **Unit**: ExUnit (built-in)
2. **Property**: StreamData
3. **Mocking**: Mox
4. **Factories**: ExMachina
5. **Coverage**: ExCoveralls
6. **Web**: Phoenix testing tools

## CI Configuration (GitHub Actions)
```yaml
name: Elixir CI

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
      
      - name: Set up Elixir
        uses: erlef/setup-beam@v1
        with:
          elixir-version: '1.15'
          otp-version: '26'
          
      - name: Install dependencies
        run: mix deps.get
        
      - name: Compile
        run: mix compile --warnings-as-errors
        
      - name: Run tests
        run: mix test
        env:
          MIX_ENV: test
          
      - name: Run coverage
        run: mix coveralls.github
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

## Elixir-Specific Considerations

### Testing GenServers
```elixir
defmodule CounterTest do
  use ExUnit.Case

  test "starts with initial count" do
    {:ok, pid} = Counter.start_link(10)
    assert Counter.get(pid) == 10
  end

  test "increments count" do
    {:ok, pid} = Counter.start_link(0)
    Counter.increment(pid)
    assert Counter.get(pid) == 1
  end
end
```

### Testing Supervisors
```elixir
test "restarts child on crash" do
  {:ok, sup} = MyApp.Supervisor.start_link([])
  
  [{_, pid, _, _}] = Supervisor.which_children(sup)
  Process.exit(pid, :kill)
  
  # Wait for restart
  :timer.sleep(100)
  
  [{_, new_pid, _, _}] = Supervisor.which_children(sup)
  assert new_pid != pid
end
```

### Testing Concurrent Code
```elixir
test "handles concurrent requests" do
  tasks = for i <- 1..100 do
    Task.async(fn -> Service.process(i) end)
  end
  
  results = Task.await_many(tasks, 5000)
  
  assert length(results) == 100
  assert Enum.all?(results, &(&1 == :ok))
end
```

### DocTests
```elixir
defmodule Calculator do
  @doc """
  Adds two numbers.

  ## Examples

      iex> Calculator.add(2, 3)
      5

      iex> Calculator.add(-1, 1)
      0
  """
  def add(a, b), do: a + b
end

# In test file
defmodule CalculatorTest do
  use ExUnit.Case
  doctest Calculator  # Runs examples as tests
end
```
