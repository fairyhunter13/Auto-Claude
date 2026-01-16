# Python Testing Strategy

**Language:** Python  
**Strategy Version:** 1.0.0  
**Last Updated:** 2026-01-16

---

## Detection Confirmed

When this strategy is loaded, the following indicators were detected:

| Indicator | Type | Found |
|-----------|------|-------|
| `pyproject.toml` | Required (any) | ? |
| `setup.py` | Required (any) | ? |
| `requirements.txt` | Required (any) | ? |
| `**/*.py` files | Optional | ✓ |

---

## Framework Selection Logic

### Decision Tree

```
Python Project Detected
│
├── Has pytest.ini or pytest in pyproject.toml?
│   └── YES → Use pytest (existing config)
│
├── Is this a web application?
│   ├── Django → pytest-django
│   ├── Flask → pytest-flask  
│   ├── FastAPI → pytest + httpx
│   └── Has browser tests? → playwright-python
│
├── Is this a data/ML project?
│   └── YES → pytest with data fixtures
│
├── Is this a CLI tool?
│   └── YES → pytest + click.testing (if Click)
│
└── DEFAULT → pytest (industry standard)
```

### Framework Recommendations

| Project Type | Primary | Unit Tests | E2E Tests | API Tests |
|--------------|---------|------------|-----------|-----------|
| Django Web App | pytest-django | pytest | playwright-python | pytest + Django test client |
| Flask Web App | pytest-flask | pytest | playwright-python | pytest + Flask test client |
| FastAPI | pytest | pytest | playwright-python | pytest + httpx |
| Data/ML Pipeline | pytest | pytest | N/A | pytest |
| CLI Tool | pytest | pytest | N/A | pytest |
| Library/Package | pytest | pytest | N/A | N/A |

---

## Knowledge Fragments to Load

### Always Load (Universal)

```
1. universal/test-levels-framework.md
2. universal/test-priorities-matrix.md
3. universal/test-design-principles.md
```

### Python Core (Always)

```
4. languages/python/pytest-patterns.md
5. languages/python/pytest-fixtures.md
6. languages/python/mocking-python.md
```

### Framework-Specific (Based on Selection)

**If Django:**
```
7. languages/python/pytest-django.md
```

**If FastAPI:**
```
7. languages/python/fastapi-testing.md
```

**If Playwright-Python:**
```
7. languages/python/playwright-python.md
8. knowledge/network-first.md (concepts apply)
```

---

## Directory Structure

### Recommended Structure (pytest)

```
{project-root}/
├── src/                          # Application source
│   └── myapp/
│       ├── __init__.py
│       ├── models.py
│       └── services.py
├── tests/                        # Test root directory
│   ├── __init__.py
│   ├── conftest.py              # Shared fixtures
│   ├── unit/                    # Unit tests
│   │   ├── __init__.py
│   │   └── test_services.py
│   ├── integration/             # Integration tests
│   │   ├── __init__.py
│   │   └── test_api.py
│   └── e2e/                     # E2E tests (if applicable)
│       ├── __init__.py
│       └── test_user_flows.py
├── pyproject.toml               # Project config (includes pytest)
└── requirements-dev.txt         # Dev dependencies
```

### Alternative Structure (Collocated)

```
{project-root}/
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── models.py
│       ├── test_models.py       # Collocated tests
│       ├── services.py
│       └── test_services.py     # Collocated tests
├── tests/                       # Integration tests only
│   └── integration/
├── pyproject.toml
└── requirements-dev.txt
```

---

## Configuration Templates

### pyproject.toml (pytest config)

```toml
[project]
name = "myapp"
version = "1.0.0"
requires-python = ">=3.10"

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-cov>=4.0",
    "pytest-asyncio>=0.21",
    "pytest-xdist>=3.0",
    "httpx>=0.24",
    "faker>=18.0",
]

[tool.pytest.ini_options]
testpaths = ["tests"]
python_files = ["test_*.py"]
python_functions = ["test_*"]
asyncio_mode = "auto"
addopts = [
    "-v",
    "--strict-markers",
    "--tb=short",
    "-ra",
]
markers = [
    "unit: Unit tests",
    "integration: Integration tests",
    "e2e: End-to-end tests",
    "slow: Slow running tests",
]

[tool.coverage.run]
source = ["src"]
branch = true
omit = ["*/tests/*", "*/__pycache__/*"]

[tool.coverage.report]
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
fail_under = 70
```

### pytest.ini (alternative)

```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_functions = test_*
addopts = -v --strict-markers --tb=short -ra
markers =
    unit: Unit tests
    integration: Integration tests
    e2e: End-to-end tests
    slow: Slow running tests
asyncio_mode = auto
```

---

## Common Commands

| Action | Command |
|--------|---------|
| Run all tests | `pytest` |
| Run with coverage | `pytest --cov=src --cov-report=html` |
| Run specific file | `pytest tests/unit/test_services.py` |
| Run specific test | `pytest tests/unit/test_services.py::test_create_user` |
| Run by marker | `pytest -m unit` |
| Run parallel | `pytest -n auto` |
| Run verbose | `pytest -v` |
| Run last failed | `pytest --lf` |
| Watch mode | `pytest-watch` or `ptw` |
| Debug mode | `pytest --pdb` |

---

## Fixture Patterns

### conftest.py (Shared Fixtures)

```python
# tests/conftest.py
import pytest
from faker import Faker
from typing import Generator, Any
from httpx import AsyncClient
from myapp import create_app
from myapp.database import get_db, Base, engine

fake = Faker()

@pytest.fixture(scope="session")
def app():
    """Create application for testing."""
    app = create_app(testing=True)
    yield app

@pytest.fixture(scope="function")
def db_session() -> Generator:
    """Create a fresh database session for each test."""
    Base.metadata.create_all(bind=engine)
    yield get_db()
    Base.metadata.drop_all(bind=engine)

@pytest.fixture
async def client(app) -> AsyncClient:
    """Async HTTP client for API testing."""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def user_factory(db_session):
    """Factory for creating test users."""
    created_ids = []
    
    def _create_user(**overrides):
        user_data = {
            "email": fake.email(),
            "name": fake.name(),
            "password": fake.password(length=12),
            **overrides,
        }
        user = User(**user_data)
        db_session.add(user)
        db_session.commit()
        created_ids.append(user.id)
        return user
    
    yield _create_user
    
    # Cleanup
    for user_id in created_ids:
        db_session.query(User).filter(User.id == user_id).delete()
    db_session.commit()
```

### Data Factory Pattern

```python
# tests/factories.py
from faker import Faker
from dataclasses import dataclass, field
from typing import Optional
import uuid

fake = Faker()

@dataclass
class UserFactory:
    """Factory for creating test users with sensible defaults."""
    email: str = field(default_factory=fake.email)
    name: str = field(default_factory=fake.name)
    password: str = field(default_factory=lambda: fake.password(length=12))
    is_active: bool = True
    
    @classmethod
    def create(cls, **overrides) -> "UserFactory":
        """Create a user with optional overrides."""
        return cls(**{**cls.__dict__, **overrides})
    
    def to_dict(self) -> dict:
        """Convert to dictionary for API calls."""
        return {
            "email": self.email,
            "name": self.name,
            "password": self.password,
            "is_active": self.is_active,
        }
```

---

## Test Examples

### Unit Test

```python
# tests/unit/test_services.py
import pytest
from myapp.services import UserService
from myapp.exceptions import ValidationError

class TestUserService:
    """Tests for UserService."""
    
    def test_create_user_with_valid_data(self, db_session):
        """Should create user when data is valid."""
        # Arrange
        service = UserService(db_session)
        user_data = {
            "email": "test@example.com",
            "name": "Test User",
            "password": "SecurePass123!",
        }
        
        # Act
        user = service.create_user(**user_data)
        
        # Assert
        assert user.id is not None
        assert user.email == "test@example.com"
        assert user.name == "Test User"
    
    def test_create_user_with_duplicate_email_raises(self, db_session, user_factory):
        """Should raise ValidationError when email already exists."""
        # Arrange
        existing_user = user_factory(email="taken@example.com")
        service = UserService(db_session)
        
        # Act & Assert
        with pytest.raises(ValidationError, match="Email already registered"):
            service.create_user(
                email="taken@example.com",
                name="Another User",
                password="SecurePass123!",
            )
```

### Integration Test (API)

```python
# tests/integration/test_api.py
import pytest
from httpx import AsyncClient

class TestUserAPI:
    """Integration tests for User API endpoints."""
    
    @pytest.mark.asyncio
    async def test_create_user_endpoint(self, client: AsyncClient):
        """POST /api/users should create a new user."""
        # Arrange
        payload = {
            "email": "newuser@example.com",
            "name": "New User",
            "password": "SecurePass123!",
        }
        
        # Act
        response = await client.post("/api/users", json=payload)
        
        # Assert
        assert response.status_code == 201
        data = response.json()
        assert data["email"] == "newuser@example.com"
        assert "id" in data
        assert "password" not in data  # Should not expose password
    
    @pytest.mark.asyncio
    async def test_get_user_not_found(self, client: AsyncClient):
        """GET /api/users/{id} should return 404 for non-existent user."""
        response = await client.get("/api/users/nonexistent-id")
        
        assert response.status_code == 404
        assert response.json()["detail"] == "User not found"
```

### E2E Test (Playwright-Python)

```python
# tests/e2e/test_login.py
import pytest
from playwright.sync_api import Page, expect

class TestLogin:
    """E2E tests for login functionality."""
    
    def test_successful_login(self, page: Page, user_factory):
        """User should be able to login with valid credentials."""
        # Arrange
        user = user_factory(password="TestPass123!")
        
        # Act
        page.goto("/login")
        page.fill('[data-testid="email"]', user.email)
        page.fill('[data-testid="password"]', "TestPass123!")
        page.click('[data-testid="login-button"]')
        
        # Assert
        expect(page).to_have_url("/dashboard")
        expect(page.locator('[data-testid="user-menu"]')).to_contain_text(user.name)
    
    def test_login_with_invalid_credentials(self, page: Page):
        """Should show error for invalid credentials."""
        page.goto("/login")
        page.fill('[data-testid="email"]', "invalid@example.com")
        page.fill('[data-testid="password"]', "wrongpassword")
        page.click('[data-testid="login-button"]')
        
        expect(page.locator('[data-testid="error-message"]')).to_contain_text(
            "Invalid credentials"
        )
        expect(page).to_have_url("/login")
```

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        python-version: ['3.10', '3.11', '3.12']
    
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python ${{ matrix.python-version }}
        uses: actions/setup-python@v5
        with:
          python-version: ${{ matrix.python-version }}
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          python -m pip install --upgrade pip
          pip install -e ".[dev]"
      
      - name: Run tests with coverage
        run: pytest --cov=src --cov-report=xml
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage.xml
  
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'
      
      - name: Install dependencies
        run: |
          pip install -e ".[dev]"
          playwright install --with-deps
      
      - name: Run E2E tests
        run: pytest tests/e2e -v
```

---

## Related Knowledge Fragments

### Universal Concepts
- `universal/test-design-principles.md` - Core testing principles
- `universal/test-levels-framework.md` - When to use each test level
- `universal/test-priorities-matrix.md` - P0-P3 prioritization

### Python-Specific (To Be Created)
- `languages/python/pytest-fixtures.md` - Advanced fixture patterns
- `languages/python/mocking-python.md` - unittest.mock and pytest-mock
- `languages/python/playwright-python.md` - E2E with Playwright
