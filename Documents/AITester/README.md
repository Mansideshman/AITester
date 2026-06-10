# AITester Workspace

This repository contains multiple test automation projects and frameworks used for API and UI testing.

Projects included:

- `Project1_TC_Generator` — Test case generation prompts and templates.
- `Project2_Selenium_framework` — Advanced Selenium Java framework (TestNG, PageObjects).
- `Project3_RestAssuredAPIFramework` — REST Assured + TestNG API automation framework. See [Project3_RestAssuredAPIFramework/README.md](Project3_RestAssuredAPIFramework/README.md).
- `Project4_PlaywrightAPIAutomationFramework` — Playwright API testing scaffold (TypeScript). See [Project4_PlaywrightAPIAutomationFramework/README.md](Project4_PlaywrightAPIAutomationFramework/README.md).

How to run Project3 (Java / Maven):

```bash
cd Project3_RestAssuredAPIFramework
mvn test
```

How to run Project4 (Playwright / Node.js):

```bash
cd Project4_PlaywrightAPIAutomationFramework
npm install
npx playwright install
npm run test:api
```

Contributions

- Add new projects under the workspace root and update this README.
- Follow existing project READMEs for setup and usage.
