# Playwright API Automation Framework

This scaffold provides a Playwright-native API testing framework (TypeScript) using `APIRequestContext`, domain clients, fixtures, and example tests.

Quick start

1. Install dependencies:

```bash
cd Project4_PlaywrightAPIAutomationFramework
npm install
npx playwright install
```

2. Run API tests (default baseURL is `https://example.com/api`):

```bash
# run all tests
npm test

# run only api tests
npm run test:api
```

3. Configure the real API base URL:

```bash
export API_BASE_URL=https://api.mycompany.com
npm run test:api
```

Project layout

- `clients/` - domain API clients (BaseApiClient, UsersApiClient)
- `fixtures/` - Playwright fixtures that provide clients and auth tokens
- `models/` - TypeScript interfaces for request/response payloads
- `tests/api/` - example API tests
- `playwright.config.ts` - Playwright configuration

Extend by adding more clients, models, and tests per domain.
