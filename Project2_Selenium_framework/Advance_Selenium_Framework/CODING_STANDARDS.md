# Coding Standards & Guidelines

## Naming Conventions

### Classes
- Use PascalCase
- Descriptive names
- Examples: `LoginPage`, `HomePageTest`, `DriverFactory`

### Methods
- Use camelCase
- Action-oriented verbs at start
- Examples: `clickLoginButton()`, `verifyErrorMessage()`, `login()`

### Variables
- Use camelCase
- Descriptive names
- Examples: `usernameField`, `loginButton`, `waitTime`

### Constants
- Use UPPER_SNAKE_CASE
- Examples: `IMPLICIT_WAIT_TIME`, `DEFAULT_TIMEOUT`, `BASE_URL`

### Locators
- Use descriptive names with _By suffix or type indicator
- Examples: `usernameField`, `loginButton`, `errorMessage`

## Code Style

### Indentation
- Use 4 spaces (not tabs)
- Consistent indentation throughout

### Line Length
- Keep lines under 120 characters
- Break long lines at logical points

### Spacing
- One blank line between methods
- No blank lines at start/end of class
- Space after keywords

### Comments
- Use JavaDoc for public methods and classes
- Inline comments for complex logic
- Keep comments concise and meaningful

## JavaDoc Standards

### Class Level
```java
/**
 * LoginPage - Page Object Model for Login Page
 * Contains elements and methods for login functionality
 * 
 * @author QA Team
 * @version 1.0
 */
public class LoginPage extends BasePage {
```

### Method Level
```java
/**
 * Login with provided credentials
 * @param username - User email/username
 * @param password - User password
 * @return HomePage instance after successful login
 * @throws RuntimeException if login fails
 */
public HomePage login(String username, String password) {
```

## Code Organization

### Import Statements
- Group by package
- Remove unused imports
- Alphabetical order within groups

### Method Organization
1. Constructor
2. Public methods
3. Private methods
4. Utility methods

### Page Object Organization
1. Locators (private static final)
2. Constructor
3. Page-specific methods
4. Assertion methods
5. Navigation methods

## Conditional Statements

### Avoid Deep Nesting
```java
// ❌ Bad
if (condition1) {
    if (condition2) {
        if (condition3) {
            // code
        }
    }
}

// ✅ Good
if (!condition1) return;
if (!condition2) return;
if (!condition3) return;
// code
```

## Collections & Data Structures

### Use Generic Types
```java
// ❌ Bad
List list = new ArrayList();

// ✅ Good
List<String> names = new ArrayList<>();
```

### Prefer Interfaces
```java
// ❌ Bad
ArrayList<String> names = new ArrayList<>();

// ✅ Good
List<String> names = new ArrayList<>();
```

## Error Handling

### Specific Exception Handling
```java
// ❌ Bad
try {
    // code
} catch (Exception e) {
    // handle
}

// ✅ Good
try {
    // code
} catch (TimeoutException e) {
    Logger.error("Element not found within timeout");
} catch (NoSuchElementException e) {
    Logger.error("Element locator is incorrect");
}
```

### Logging Errors
```java
// ❌ Bad
e.printStackTrace();

// ✅ Good
Logger.error("Operation failed: " + e.getMessage());
Logger.error("Stack trace:", e);
```

## Magic Numbers

### Avoid Hard-Coded Values
```java
// ❌ Bad
Thread.sleep(5000);
WebDriverWait wait = new WebDriverWait(driver, 10);

// ✅ Good
CommonUtils.waitForSeconds(5);
WebDriverWait wait = new WebDriverWait(driver, 
    Duration.ofSeconds(ConfigReader.getExplicitWait()));
```

## DRY Principle

### Don't Repeat Yourself
```java
// ❌ Bad
click(submitButton);
Thread.sleep(1000);
click(submitButton);
Thread.sleep(1000);

// ✅ Good
click(submitButton);
CommonUtils.waitForSeconds(1);
click(submitButton);
CommonUtils.waitForSeconds(1);

// Even Better - Create method
private void clickSubmitButtonWithWait() {
    click(submitButton);
    CommonUtils.waitForSeconds(1);
}
```

## Single Responsibility Principle

### One Method = One Responsibility
```java
// ❌ Bad
public void performLogin() {
    WebElement userField = driver.findElement(By.id("username"));
    userField.sendKeys("user@example.com");
    WebElement passField = driver.findElement(By.id("password"));
    passField.sendKeys("password");
    // ... many more lines
}

// ✅ Good
public void enterUsername(String username) {
    type(usernameField, username);
}

public void enterPassword(String password) {
    type(passwordField, password);
}

public void login(String username, String password) {
    enterUsername(username);
    enterPassword(password);
    clickLoginButton();
}
```

## Fluent API Pattern

### Method Chaining
```java
// ✅ Good
public HomePage login(String username, String password) {
    enterUsername(username);
    enterPassword(password);
    clickLoginButton();
    return new HomePage(driver);
}

// Usage
HomePage homePage = new LoginPage(driver)
    .login("user@example.com", "password");
```

## Dependencies & Imports

### Minimize Dependencies
- Keep frameworks loosely coupled
- Use interfaces for abstraction
- Dependency injection where applicable

### Avoid Circular Dependencies
- A should not depend on B if B depends on A
- Organize code in layers

---

**Last Updated:** 2026
