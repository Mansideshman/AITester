# Playwright Automation TypeScript

A comprehensive test automation framework built with **Playwright** and **TypeScript**, featuring advanced reporting capabilities and multiple test execution strategies.

## 📋 Overview

This project provides a complete test automation solution for web applications using Playwright, with TypeScript for type safety and maintainability. It includes three advanced reporting systems: CustomTTA Reporter, Playwright HTML Reports, and Allure Reports.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or pnpm

### Installation

```bash
# Install dependencies
npm install

# or with pnpm
pnpm install
```

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx playwright test tests/02_firsttest/212_Browser_context_pages.ts

# Run tests matching a pattern
npx playwright test --grep "@smoke"

# Run tests in specific directory
npx playwright test tests/01_Basics/

# Debug mode
npx playwright test --debug
```

## 📊 Reports

This project generates three types of comprehensive test reports:

### 1. **CustomTTA Reports** (Real-time)
- Location: `utils/reports/tta/index.html`
- Features:
  - Real-time updates (5-second refresh)
  - Statistics dashboard
  - Step-by-step execution logs
  - Screenshots and videos
  - Console output capture
  - Test filtering

```bash
open utils/reports/tta/index.html
```

### 2. **Playwright HTML Reports** (Native)
- Location: `utils/reports/playwright/index.html`
- Features:
  - Visual timeline
  - Test details
  - Artifact links
  - Failure analysis
  - Execution timeline

```bash
open utils/reports/playwright/index.html
```

### 3. **Allure Reports** (Professional Analytics)
- Location: `utils/reports/allure/index.html`
- Features:
  - Professional analytics dashboard
  - Test trends and historical comparison
  - Detailed charts and metrics
  - Executive summary
  - Severity and status breakdowns

```bash
open utils/reports/allure/index.html
```

## 📁 Project Structure

```
.
├── tests/                              # Test files organized by feature
│   ├── 01_Basics/                      # Basic Playwright features
│   ├── 02_firsttest/                   # Initial test examples
│   ├── 03_locator_commands/            # Locator and command tests
│   ├── 06_multipleElements/            # Multiple element handling
│   ├── 07_WebTables/                   # Web table interactions
│   ├── 08_web_select_frames_iframe/    # Select, frames, iframes
│   ├── 10_Keyboard_hover_dragdrop/     # Keyboard and mouse events
│   ├── 11_Alerts/                      # Alert handling
│   ├── 12_SVG/                         # SVG element testing
│   └── Assigned_Task/                  # Project assignments
├── utils/                              # Utility functions and helpers
│   └── reports/                        # Report outputs
│       ├── tta/                        # CustomTTA reports
│       ├── playwright/                 # Playwright HTML reports
│       ├── allure/                     # Allure professional reports
│       └── allure-results/             # Allure raw data
├── auth/                               # Authentication utilities
├── playwright.config.ts                # Playwright configuration
├── customTTAReporter.ts                # CustomTTA reporter implementation
├── tsconfig.json                       # TypeScript configuration
├── package.json                        # Project dependencies
└── .gitignore                          # Git ignore rules
```

## ⚙️ Configuration

### Playwright Config (`playwright.config.ts`)

The project is configured with:
- **Browsers**: Chromium, Firefox, WebKit
- **Reporters**: HTML, Allure, CustomTTA
- **Screenshots**: On failure
- **Videos**: On failure
- **Retries**: 1 retry for failed tests
- **Timeout**: 30 seconds per test

### TypeScript Config (`tsconfig.json`)

- Target: ES2020
- Module: ESNext
- Strict mode enabled
- Path aliases for cleaner imports

## 🔑 Key Features

✅ **Type-Safe Testing** - Full TypeScript support with strict mode
✅ **Multiple Reporters** - CustomTTA, Playwright HTML, and Allure
✅ **Screenshots & Videos** - Automatic capture on failures
✅ **Organized Structure** - Tests grouped by feature/module
✅ **CI/CD Ready** - Easy integration with pipelines
✅ **Test Filtering** - Run specific tests by name or tags
✅ **Detailed Logs** - Comprehensive execution logs and traces
✅ **Historical Tracking** - Report history and trend analysis

## 📚 Test Categories

### Basic Features
- Browser context and page management
- Element locators and commands
- Form interactions

### Intermediate Features
- Multiple element handling
- Web tables and dynamic content
- Select dropdowns, frames, and iframes

### Advanced Features
- Keyboard shortcuts and navigation
- Hover and drag-drop interactions
- JavaScript alert handling
- SVG element testing

### Project Assignments
- User login verification
- E-commerce workflows
- Multi-step form handling
- Integration testing
- iframe and frame handling (proj7_iframe.spec.ts)
- Hover interactions and JavaScript alerts (proj7_hover_JS_alerts.spec.ts)
- SVG element testing and interactions (proj8_SVG.spec.ts)
- Shadow DOM element testing (proj9_shadowDOM.spec.ts)

## 🛠️ Development

### Installing New Dependencies

```bash
npm install --save-dev <package-name>
```

### Creating New Tests

1. Create test file in appropriate directory under `tests/`
2. Use descriptive names: `feature_description.spec.ts`
3. Follow existing test structure and conventions
4. Use proper TypeScript typing

Example:
```typescript
import { test, expect } from '@playwright/test';

test('verify feature works', async ({ page }) => {
  await page.goto('https://example.com');
  const element = page.locator('[data-testid="feature"]');
  await expect(element).toBeVisible();
});
```

## 📝 Documentation

- **SETUP_COMPLETE.md** - Detailed setup and configuration guide
- **REPORTS.md** - Quick reference for running and viewing reports
- **utils/reports/README.md** - Comprehensive report documentation

## 🔄 CI/CD Integration

Add to your CI/CD pipeline:

```yaml
# Example GitHub Actions
- name: Install dependencies
  run: npm install

- name: Run tests
  run: npm test

- name: Upload reports
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: test-reports
    path: utils/reports/
```

## 📋 Troubleshooting

### Tests Not Running
- Verify Node.js version: `node --version`
- Clear node_modules: `rm -rf node_modules && npm install`
- Check browser installation: `npx playwright install`

### Reports Not Generating
- Ensure tests actually run (check console output)
- Verify write permissions in `utils/reports/` directory
- Check browser support compatibility

### Permission Issues
```bash
chmod -R 755 utils/
chmod -R 755 tests/
```

## 🤝 Contributing

When contributing:
1. Follow existing code style
2. Add tests for new features
3. Generate reports and verify
4. Update documentation
5. Commit with clear messages

## 📄 License

ISC

## 👤 Author

Developed for automated testing excellence.

---

**Last Updated**: May 18, 2026  
**Status**: Production Ready ✅  
**Latest Commit**: proj8_SVG.spec.ts and proj9_shadowDOM.spec.ts test files added

## 📝 Recent Updates

- **Console Output Fix**: Updated playwright.config.ts with `list` reporter to display console.log output
- **proj7_iframe.spec.ts**: Fixed syntax errors and added iframe/frame element validation with proper console logging
- **proj7_hover_JS_alerts.spec.ts**: Added hover interactions and JavaScript alert handling test scenarios
- **proj8_SVG.spec.ts**: Added SVG element testing and interactions
- **proj9_shadowDOM.spec.ts**: Fixed strict mode violation in getByPlaceholder locator - changed to use element ID (#kils) for better locator specificity and reliability
