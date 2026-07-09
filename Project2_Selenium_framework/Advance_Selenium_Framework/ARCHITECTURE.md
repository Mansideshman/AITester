# Framework Architecture & Design Patterns

## Page Object Model (POM)

The framework implements the Page Object Model design pattern to enhance maintainability and reduce code duplication.

### Benefits of POM
1. **Maintainability** - Changes to UI are isolated to page objects
2. **Reusability** - Page objects can be reused across multiple tests
3. **Readability** - Tests are more readable and easier to understand
4. **Scalability** - Easy to add new pages and tests

### POM Structure
```
Pages/
├── LoginPage.java
├── HomePage.java
├── AccountPage.java
└── ...
```

### Example POM Implementation
```java
public class LoginPage extends BasePage {
    
    // Locators (private)
    private By usernameField = By.id("username");
    private By passwordField = By.id("password");
    private By loginButton = By.xpath("//button[@type='submit']");
    
    // Constructor
    public LoginPage(WebDriver driver) {
        super(driver);
    }
    
    // Page Methods (public)
    public void enterUsername(String username) {
        type(usernameField, username);
    }
    
    public void enterPassword(String password) {
        type(passwordField, password);
    }
    
    public HomePage clickLogin() {
        click(loginButton);
        return new HomePage(driver);
    }
    
    // Fluent API pattern
    public HomePage login(String username, String password) {
        enterUsername(username);
        enterPassword(password);
        return clickLogin();
    }
}
```

## Base Classes

### BasePage
- Contains common methods for all page objects
- Handles element interactions and waits
- Provides synchronization mechanisms

### BaseTest
- Setup/teardown operations
- Driver initialization
- Test-level configuration

## Configuration Management

### Multi-Environment Support
```
resources/
├── config.properties          (Base config)
├── config_qa.properties       (QA specific)
└── config_prod.properties     (Production specific)
```

### Load Priority
1. Load base config.properties
2. Override with environment-specific config
3. System properties override all

### Usage
```java
String url = ConfigReader.getBaseURL();
String browser = ConfigReader.getBrowser();
int timeout = ConfigReader.getImplicitWait();
```

## Threading Model

### Thread-Local WebDriver
The framework uses ThreadLocal to manage WebDriver instances safely for parallel execution:

```java
private static final ThreadLocal<WebDriver> driverThreadLocal = new ThreadLocal<>();
```

### Benefits
- Safe parallel test execution
- No WebDriver interference between tests
- Clean resource management

### Usage
```java
DriverFactory.initializeDriver();  // Stores in ThreadLocal
WebDriver driver = DriverFactory.getDriver();  // Retrieves from ThreadLocal
DriverFactory.quitDriver();  // Cleans up ThreadLocal
```

## Listener Pattern

### TestListener Implementation
Captures test execution events for:
- Logging test start/end
- Screenshot on failure
- Report generation
- Custom metrics

### Registered Events
- onTestStart
- onTestSuccess
- onTestFailure
- onTestSkipped

## Exception Handling Strategy

### Hierarchical Exception Handling
```
RuntimeException
├── WebDriver Timeouts
├── Element Not Found
├── Assertion Failures
└── Framework Errors
```

### Best Practices
1. Catch specific exceptions
2. Log meaningful messages
3. Take screenshots on critical failures
4. Provide recovery options when possible

---

**Last Updated:** 2026
