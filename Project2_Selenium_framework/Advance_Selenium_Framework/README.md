# CRM Automation Framework

## Overview
This is an **enterprise-level automation framework** built with Selenium, Java, Maven, and TestNG for testing CRM applications (Salesforce and similar platforms). The framework follows industry best practices and design patterns for maintainability, scalability, and reliability.

## Framework Features

### ✨ Core Features
- **Page Object Model (POM)** - Maintainable and scalable test structure
- **Base Test Class** - Common setup/teardown operations
- **Cross-Browser Support** - Chrome, Firefox, Edge
- **Parallel Execution** - Run tests in parallel for faster execution
- **Configuration Management** - Environment-specific configurations (QA, Prod)
- **Comprehensive Logging** - Log4j2 integration for detailed logging
- **Screenshot on Failure** - Automatic screenshot capture on test failures
- **Report Generation** - Extent Reports integration
- **API Testing** - REST Assured for API testing
- **Database Testing** - MySQL integration for data validation
- **Thread-Local Driver Management** - Safe parallel execution
- **Test Listeners** - Custom test event listeners for advanced reporting

### 🏗️ Architecture
```
CRM Automation Framework
├── src/main/java/com/crm/automation/
│   ├── config/          → Configuration readers and properties
│   ├── core/            → Core framework classes (DriverFactory, BasePage, BaseTest)
│   ├── pages/           → Page Object Models
│   ├── utilities/       → Helper utilities (Logger, Screenshot, API, DB)
│   └── listeners/       → TestNG listeners for test execution events
├── src/main/resources/  → Configuration files and log4j2 config
├── src/test/java/       → Test cases
├── src/test/resources/  → TestNG XML, test data
└── pom.xml              → Maven configuration with dependencies
```

## Prerequisites

1. **Java 11+** - Install Java Development Kit
2. **Maven 3.6+** - Install Maven
3. **Git** - For version control
4. **IDE** - IntelliJ IDEA, Eclipse, or VS Code

## Installation & Setup

### 1. Clone or Extract the Project
```bash
cd Project2_Selenium_framework/Advance_Selenium_Framework
```

### 2. Install Dependencies
```bash
mvn clean install
```

### 3. Configure Properties
Edit `src/main/resources/config.properties` with your application details:
```properties
base.url=https://your-crm-url.com/login
browser=chrome
sf.username=your_email@example.com
sf.password=your_password
```

### 4. Verify Setup
```bash
mvn test -Denv=qa
```

## Running Tests

### Run All Tests
```bash
mvn test
```

### Run Specific Environment
```bash
mvn test -Denv=qa
mvn test -Denv=prod
```

### Run Specific Test Class
```bash
mvn test -Dtest=LoginTests
```

### Run Specific Test Method
```bash
mvn test -Dtest=LoginTests#testValidLogin
```

### Headless Mode
```bash
mvn test -Dheadless=true
```

### Run with Specific Browser
```bash
mvn test -Dbrowser=firefox
```

## Project Structure Details

### 1. Configuration Layer (`config/`)
- **ConfigReader.java** - Centralized configuration management
- **config.properties** - Base configuration
- **config_qa.properties** - QA environment config
- **config_prod.properties** - Production environment config

### 2. Core Framework (`core/`)
- **DriverFactory.java** - WebDriver initialization and lifecycle
- **BasePage.java** - Base class for all page objects with common methods
- **BaseTest.java** - Base class for all test cases with setup/teardown

### 3. Page Objects (`pages/`)
- **LoginPage.java** - Login page elements and methods
- **HomePage.java** - Home page elements and methods
- *Add more page objects as needed*

### 4. Utilities (`utilities/`)
- **Logger.java** - Logging operations
- **ScreenshotUtil.java** - Screenshot capture on failures
- **CommonUtils.java** - Common helper methods
- **DatabaseUtil.java** - Database operations
- **ApiUtil.java** - REST API testing
- **JsonUtil.java** - JSON operations

### 5. Listeners (`listeners/`)
- **TestListener.java** - Captures test events (start, success, failure)

### 6. Test Cases (`tests/`)
- **LoginTests.java** - Login functionality tests
- *Add more test classes as needed*

## Key Classes & Methods

### BasePage Methods
```java
waitForElementToBeVisible(By locator)
waitForElementToBeClickable(By locator)
click(By locator)
type(By locator, String text)
getText(By locator)
isElementDisplayed(By locator)
waitForURLToContain(String urlPart)
switchToFrame(By locator)
getPageTitle()
getCurrentURL()
```

### ConfigReader Methods
```java
ConfigReader.getProperty(String key)
ConfigReader.getBrowser()
ConfigReader.getBaseURL()
ConfigReader.getImplicitWait()
ConfigReader.getSalesforceUsername()
ConfigReader.isHeadlessMode()
```

### Logger Methods
```java
Logger.info(String message)
Logger.debug(String message)
Logger.error(String message)
Logger.warn(String message)
ScreenshotUtil.takeScreenshot(WebDriver driver, String testName)
```

## Writing Test Cases

### Example Test Case
```java
public class YourTest extends BaseTest {
    
    @Test(description = "Test description")
    public void testYourFeature() {
        Logger.info("Starting test");
        
        // Create page objects
        LoginPage loginPage = new LoginPage(driver);
        
        // Perform actions
        loginPage.login("user@example.com", "password");
        
        // Verify results
        HomePage homePage = new HomePage(driver);
        Assert.assertTrue(homePage.isHomePageDisplayed());
    }
}
```

### Creating Page Objects
```java
public class MyPage extends BasePage {
    
    // Define locators
    private By element = By.id("myElement");
    
    public MyPage(WebDriver driver) {
        super(driver);
    }
    
    // Define page methods
    public void clickElement() {
        click(element);
    }
}
```

## Data-Driven Testing

### Using TestNG Data Provider
```java
@DataProvider(name = "loginData")
public Object[][] getLoginData() {
    return new Object[][] {
        {"user1@example.com", "password1"},
        {"user2@example.com", "password2"}
    };
}

@Test(dataProvider = "loginData")
public void testLogin(String email, String password) {
    // Test implementation
}
```

## Reporting

### Test Reports Location
- HTML Reports: `test-output/`
- Logs: `logs/`
- Screenshots: `test-output/screenshots/`

### View TestNG Report
```bash
# After running tests, open:
test-output/index.html
```

## Salesforce-Specific Features

### Login with Salesforce
```java
String username = ConfigReader.getSalesforceUsername();
String password = ConfigReader.getSalesforcePassword();
String securityToken = ConfigReader.getSalesforceSecurityToken();

// Use in your login methods
```

### Add CRM-Specific Pages
Create pages for common Salesforce objects:
- `AccountPage.java` - Account management
- `LeadPage.java` - Lead management
- `OpportunityPage.java` - Opportunity management
- `ContactPage.java` - Contact management

## Best Practices

1. **Use Page Object Model** - Keep page elements separate from test logic
2. **Implement Waits** - Use explicit waits instead of hard waits
3. **Use Descriptive Names** - Method and variable names should be clear
4. **Log Everything** - Use Logger for debugging and troubleshooting
5. **Handle Exceptions** - Implement proper exception handling
6. **Use Data Providers** - For data-driven testing
7. **Keep Tests Independent** - Tests should not depend on each other
8. **Clean Up Resources** - Properly close drivers and connections
9. **Use Configuration Files** - Don't hardcode values
10. **Version Control** - Commit code regularly

## Troubleshooting

### WebDriver Issues
```bash
# Ensure chromedriver/geckodriver is in PATH
# Or use WebDriverManager (already integrated)
```

### Configuration Not Loading
- Check file path in ConfigReader
- Verify properties file exists
- Check for syntax errors in properties file

### Element Not Found
- Verify locators are correct
- Check if element is in a frame (use switchToFrame)
- Increase wait times in configuration
- Check for dynamic elements

### Test Failures
- Check logs in `logs/` folder
- View screenshots in `test-output/screenshots/`
- Verify configuration for current environment

## Contributing

1. Follow existing code structure
2. Add JavaDoc comments
3. Use meaningful variable/method names
4. Write reusable utilities
5. Keep page objects clean and focused

## Support

For issues or improvements:
1. Check documentation
2. Review existing test cases
3. Check logs for errors
4. Consult team members

## Version History

- **v1.0.0** - Initial framework setup with core features

## License

This framework is for internal use only.

---

**Author:** QA Team  
**Version:** 1.0.0  
**Last Updated:** 2026
