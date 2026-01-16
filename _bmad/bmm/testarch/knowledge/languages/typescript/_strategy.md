# TypeScript/JavaScript Testing Strategy

**Language:** TypeScript / JavaScript  
**Strategy Version:** 1.0.0  
**Last Updated:** 2026-01-16

---

## Detection Confirmed

When this strategy is loaded, the following indicators were detected:

| Indicator | Type | Found |
|-----------|------|-------|
| `tsconfig.json` | Required (any) | ✓ |
| `package.json` with "typescript" | Required (any) | ✓ |
| `**/*.ts`, `**/*.tsx` files | Optional | ✓ |

---

## Framework Selection Logic

### Decision Tree

```
TypeScript Project Detected
│
├── Has playwright.config.ts?
│   └── YES → Use Playwright (existing config)
│
├── Has cypress.config.ts?
│   └── YES → Use Cypress (existing config)
│
├── Has vitest.config.ts or vite.config.ts?
│   └── YES → Use Vitest (existing config)
│
├── Has jest.config.ts?
│   └── YES → Use Jest (existing config)
│
├── Is this a UI application?
│   ├── YES → Recommend Playwright
│   │   ├── E2E testing needs → Playwright
│   │   └── Component testing → Vitest + Testing Library
│   │
│   └── NO → Is this a library/package?
│       ├── YES → Recommend Vitest
│       └── NO → Recommend Playwright (default)
│
└── DEFAULT → Playwright (best all-around choice)
```

### Framework Recommendations

| Project Type | Primary | Unit Tests | E2E Tests |
|--------------|---------|------------|-----------|
| Web App (React/Vue/Angular) | Playwright | Vitest | Playwright |
| Next.js / Nuxt | Playwright | Vitest | Playwright |
| Node.js API | Vitest | Vitest | Playwright (API mode) |
| Library/Package | Vitest | Vitest | N/A |
| Electron App | Playwright | Vitest | Playwright |
| React Native | Jest | Jest | Detox (separate) |

---

## Knowledge Fragments to Load

### Always Load (Universal)

```
1. universal/test-levels-framework.md
2. universal/test-priorities-matrix.md
3. universal/test-design-principles.md
```

### TypeScript Core (Always)

```
4. knowledge/fixture-architecture.md
5. knowledge/data-factories.md
6. knowledge/test-quality.md
```

### Framework-Specific (Based on Selection)

**If Playwright:**
```
7. knowledge/playwright-config.md
8. knowledge/network-first.md
9. knowledge/fixtures-composition.md
10. knowledge/visual-debugging.md
11. knowledge/auth-session.md
12. knowledge/api-request.md (if API testing)
```

**If Jest:**
```
7. languages/typescript/jest-patterns.md
8. knowledge/component-tdd.md
```

**If Vitest:**
```
7. languages/typescript/vitest-patterns.md
8. knowledge/component-tdd.md
```

**If Cypress:**
```
7. languages/typescript/cypress-patterns.md
8. knowledge/network-first.md
```

---

## Directory Structure

### Recommended Structure (Playwright)

```
{project-root}/
├── src/                          # Application source
├── tests/                        # Test root directory
│   ├── e2e/                      # End-to-end tests
│   │   ├── auth/                 # Feature-based organization
│   │   │   └── login.spec.ts
│   │   └── dashboard/
│   │       └── dashboard.spec.ts
│   ├── api/                      # API tests (optional)
│   │   └── users.api.spec.ts
│   └── support/                  # Test infrastructure
│       ├── fixtures/             # Custom fixtures
│       │   ├── index.ts          # Merged fixtures export
│       │   └── factories/        # Data factories
│       ├── helpers/              # Utility functions
│       └── page-objects/         # Page object models (optional)
├── playwright.config.ts          # Playwright configuration
└── package.json
```

### Alternative Structure (Vitest - Collocated)

```
{project-root}/
├── src/
│   ├── components/
│   │   ├── Button.tsx
│   │   └── Button.test.tsx       # Collocated tests
│   └── utils/
│       ├── format.ts
│       └── format.test.ts        # Collocated tests
├── tests/                        # Integration tests
│   └── integration/
├── vitest.config.ts
└── package.json
```

---

## Configuration Templates

### Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  
  // Timeouts
  timeout: 60_000,          // Test timeout: 60s
  expect: {
    timeout: 15_000,        // Assertion timeout: 15s
  },
  
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  
  reporter: [
    ['html', { outputFolder: 'test-results/html' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
    ['list'],
  ],
  
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
```

### Vitest Configuration

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: ['node_modules/', 'tests/'],
    },
  },
});
```

### Jest Configuration

```typescript
// jest.config.ts
import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 70,
      lines: 70,
      statements: 70,
    },
  },
};

export default config;
```

---

## Common Commands

| Action | Playwright | Vitest | Jest |
|--------|------------|--------|------|
| Run all tests | `npx playwright test` | `npm test` | `npm test` |
| Run single file | `npx playwright test auth.spec.ts` | `npm test auth.test.ts` | `npm test -- auth.test.ts` |
| Run with UI | `npx playwright test --ui` | `npm test -- --ui` | N/A |
| Watch mode | N/A | `npm test -- --watch` | `npm test -- --watch` |
| Coverage | `npx playwright test --coverage` | `npm test -- --coverage` | `npm test -- --coverage` |
| Debug | `npx playwright test --debug` | `npm test -- --inspect` | `npm test -- --inspect` |
| Headed | `npx playwright test --headed` | N/A | N/A |
| Update snapshots | `npx playwright test --update-snapshots` | `npm test -- -u` | `npm test -- -u` |

---

## Package.json Scripts

```json
{
  "scripts": {
    "test": "vitest",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:headed": "playwright test --headed",
    "test:coverage": "vitest --coverage",
    "test:ci": "vitest --run && playwright test"
  }
}
```

---

## Fixture Patterns (Playwright)

### Base Fixture Extension

```typescript
// tests/support/fixtures/index.ts
import { test as base } from '@playwright/test';
import { UserFactory } from './factories/user-factory';
import { ApiClient } from '../helpers/api-client';

type TestFixtures = {
  userFactory: UserFactory;
  apiClient: ApiClient;
};

export const test = base.extend<TestFixtures>({
  userFactory: async ({ request }, use) => {
    const factory = new UserFactory(request);
    await use(factory);
    await factory.cleanup();
  },
  
  apiClient: async ({ request }, use) => {
    const client = new ApiClient(request);
    await use(client);
  },
});

export { expect } from '@playwright/test';
```

### Data Factory Pattern

```typescript
// tests/support/fixtures/factories/user-factory.ts
import { faker } from '@faker-js/faker';
import type { APIRequestContext } from '@playwright/test';

export class UserFactory {
  private createdIds: string[] = [];
  
  constructor(private request: APIRequestContext) {}
  
  async create(overrides: Partial<User> = {}): Promise<User> {
    const user = {
      email: faker.internet.email(),
      name: faker.person.fullName(),
      password: faker.internet.password({ length: 12 }),
      ...overrides,
    };
    
    const response = await this.request.post('/api/users', { data: user });
    const created = await response.json();
    this.createdIds.push(created.id);
    return created;
  }
  
  async cleanup(): Promise<void> {
    for (const id of this.createdIds) {
      await this.request.delete(`/api/users/${id}`);
    }
    this.createdIds = [];
  }
}
```

---

## Test Example

```typescript
// tests/e2e/auth/login.spec.ts
import { test, expect } from '../../support/fixtures';

test.describe('User Login', () => {
  test('should login with valid credentials', async ({ page, userFactory }) => {
    // ARRANGE: Create test user via API
    const user = await userFactory.create({ password: 'TestPass123!' });
    
    // ACT: Perform login via UI
    await page.goto('/login');
    await page.fill('[data-testid="email"]', user.email);
    await page.fill('[data-testid="password"]', 'TestPass123!');
    await page.click('[data-testid="login-button"]');
    
    // ASSERT: Verify successful login
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="user-menu"]')).toContainText(user.name);
  });
  
  test('should show error for invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email"]', 'invalid@example.com');
    await page.fill('[data-testid="password"]', 'wrongpassword');
    await page.click('[data-testid="login-button"]');
    
    await expect(page.locator('[data-testid="error-message"]'))
      .toContainText('Invalid credentials');
    await expect(page).toHaveURL('/login');
  });
});
```

---

## CI Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]

jobs:
  unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm test -- --coverage
      
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: test-results/
```

---

## Related Knowledge Fragments

### From Parent Knowledge Base
- `fixture-architecture.md` - Detailed fixture patterns
- `network-first.md` - Network interception patterns
- `data-factories.md` - Factory implementation details
- `playwright-config.md` - Advanced configuration
- `visual-debugging.md` - Trace viewer usage
- `auth-session.md` - Authentication patterns

### Universal Concepts
- `universal/test-design-principles.md` - Core testing principles
- `universal/test-levels-framework.md` - When to use each test level
- `universal/test-priorities-matrix.md` - P0-P3 prioritization
