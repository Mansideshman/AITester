# Getting Started Guide

## Quick Start (5 Minutes)

### Step 1: Prerequisites Check
```bash
java -version          # Should be Java 11+
mvn -version          # Should be Maven 3.6+
```

### Step 2: Install Dependencies
```bash
cd Advance_Selenium_Framework
mvn clean install
```

### Step 3: Configure Application
Edit `src/main/resources/config.properties`:
```properties
base.url=YOUR_APPLICATION_URL
sf.username=YOUR_USERNAME
sf.password=YOUR_PASSWORD
```

### Step 4: Run First Test
```bash
mvn test -Dtest=LoginTests
```

### Step 5: View Results
```
Open: test-output/index.html
```

## Common Commands

### Build Project
```bash
mvn clean compile
```

### Run All Tests
```bash
mvn clean test
```

### Run Tests in QA Environment
```bash
mvn test -Denv=qa
```

### Run Specific Test Class
```bash
mvn test -Dtest=LoginTests
```

### Run Specific Test Method
```bash
mvn test -Dtest=LoginTests#testValidLogin
```

### Run Tests in Headless Mode
```bash
mvn test -Dheadless=true
```

### Run Tests with Firefox
```bash
mvn test -Dbrowser=firefox
```

### Generate HTML Report
```bash
mvn surefire-report:report
# Open: target/site/surefire-report.html
```

## Project File Structure Explained

```
Advance_Selenium_Framework/
│
├── pom.xml                          # Maven configuration file
│
├── src/
│   ├── main/
│   │   ├── java/com/crm/automation/
│   │   │   ├── config/              # Configuration management
│   │   │   │   └── ConfigReader.java
│   │   │   ├── core/                # Core framework classes
│   │   │   │   ├── DriverFactory.java
│   │   │   │   ├── BasePage.java
│   │   │   │   └── BaseTest.java
│   │   │   ├── pages/               # Page Objects
│   │   │   │   ├── LoginPage.java
│   │   │   │   └── HomePage.java
│   │   │   ├── utilities/           # Helper utilities
│   │   │   │   ├── Logger.java
│   │   │   │   ├── ScreenshotUtil.java
│   │   │   │   ├── CommonUtils.java
│   │   │   │   ├── DatabaseUtil.java
│   │   │   │   ├── ApiUtil.java
│   │   │   │   └── JsonUtil.java
│   │   │   └── listeners/           # TestNG Listeners
│   │   │       └── TestListener.java
│   │   └── resources/               # Configuration files
│   │       ├── config.properties
│   │       ├── config_qa.properties
│   │       ├── config_prod.properties
│   │       └── log4j2.xml
│   └── test/
│       ├── java/com/crm/automation/tests/
│       │   └── LoginTests.java
│       └── resources/
│           └── testng.xml
│
├── README.md                        # Project documentation
├── ARCHITECTURE.md                  # Architecture details
├── CODING_STANDARDS.md              # Code style guidelines
└── GETTING_STARTED.md              # This file

test-output/                         # Test execution results
├── index.html                       # HTML Test Report
├── screenshots/                     # Failure screenshots
└── ...

logs/                                # Application logs
├── application.log
├── error.log
└── ...
```

## Creating Your First Test

### Step 1: Create a New Page Object
Create file: `src/main/java/com/crm/automation/pages/AccountPage.java`

```java
package com.crm.automation.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import com.crm.automation.core.BasePage;

public class AccountPage extends BasePage {
    
    private By accountName = By.id("account-name");
    private By createButton = By.id("create-btn");
    
    public AccountPage(WebDriver driver) {
        super(driver);
    }
    
    public void createAccount(String name) {
        type(accountName, name);
        click(createButton);
    }
}
```

### Step 2: Create Test Class
Create file: `src/test/java/com/crm/automation/tests/AccountTests.java`

```java
package com.crm.automation.tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import com.crm.automation.core.BaseTest;
import com.crm.automation.pages.LoginPage;
import com.crm.automation.pages.AccountPage;

public class AccountTests extends BaseTest {
    
    @Test(description = "Create new account")
    public void testCreateAccount() {
        LoginPage loginPage = new LoginPage(driver);
        loginPage.login("user@example.com", "password");
        
        AccountPage accountPage = new AccountPage(driver);
        accountPage.createAccount("Test Account");
        
        // Add assertions
        Assert.assertTrue(true, "Account created successfully");
    }
}
```

### Step 3: Update TestNG XML
Edit: `src/test/resources/testng.xml`

Add under suite:
```xml
<test name="Account Tests" enabled="true">
    <classes>
        <class name="com.crm.automation.tests.AccountTests" />
    </classes>
</test>
```

### Step 4: Run Your Test
```bash
mvn test -Dtest=AccountTests
```

## Using Data Providers

### Data Provider Method
```java
@DataProvider(name = "loginData")
public Object[][] getLoginData() {
    return new Object[][] {
        {"user1@example.com", "password1", true},
        {"user2@example.com", "password2", true},
        {"invalid@example.com", "invalid", false}
    };
}
```

### Test Using Data Provider
```java
@Test(dataProvider = "loginData")
public void testLogin(String email, String password, boolean shouldSucceed) {
    LoginPage loginPage = new LoginPage(driver);
    loginPage.login(email, password);
    
    if (shouldSucceed) {
        Assert.assertTrue(new HomePage(driver).isHomePageDisplayed());
    } else {
        Assert.assertTrue(loginPage.isErrorMessageDisplayed());
    }
}
```

## Working with Salesforce

### Salesforce-Specific Configuration
Update `src/main/resources/config.properties`:
```properties
base.url=https://your-salesforce-instance.lightning.force.com
sf.username=your-email@company.com
sf.password=your-password
sf.security.token=your-security-token
```

### Create Salesforce Page Object
```java
public class SalesforceHomePage extends BasePage {
    
    private By appLauncher = By.xpath("//button[@aria-label='App Launcher']");
    private By searchApps = By.xpath("//input[@placeholder='Search apps and items...']");
    
    public SalesforceHomePage(WebDriver driver) {
        super(driver);
    }
    
    public void openApp(String appName) {
        click(appLauncher);
        type(searchApps, appName);
        click(By.xpath("//div[contains(text(), '" + appName + "')]"));
    }
}
```

## Debugging Tips

### Enable Debug Logging
Edit `src/main/resources/log4j2.xml`:
```xml
<Logger name="com.crm.automation" level="DEBUG" ...>
```

### View Logs During Test
```bash
mvn test -X  # Detailed Maven output
```

### Take Manual Screenshots
```java
ScreenshotUtil.takeScreenshot(driver, "TestName", "test-output/debug");
```

### Increase Wait Times for Debugging
In `config.properties`:
```properties
explicit.wait=30
implicit.wait=15
```

## Troubleshooting

### Problem: "WebDriver not initialized"
**Solution:** Ensure `@BeforeMethod` setUp() is called
```java
// Add to your test class if not extending BaseTest
@BeforeMethod
public void setUp() {
    driver = DriverFactory.initializeDriver();
}
```

### Problem: "Element not found"
**Solution:** Check if element is in iframe
```java
switchToFrame(By.id("frame-id"));
// Interact with element
switchOutOfFrame();
```

### Problem: Tests timeout
**Solution:** Increase wait times in config
```properties
explicit.wait=20
implicit.wait=15
```

### Problem: "Port already in use"
**Solution:** Kill process using port or use different port in config

## IDE Setup

### IntelliJ IDEA
1. File → Open → Select project root
2. Configure JDK: File → Project Structure → Project
3. Right-click `pom.xml` → Add as Maven Project
4. Run test: Right-click test class → Run

### Eclipse
1. File → Import → Maven → Existing Maven Projects
2. Select project folder
3. Right-click project → Maven → Update Project
4. Run test: Right-click test class → Run As → TestNG Test

### VS Code
1. Install Java Extension Pack
2. Install TestNG extension
3. Open Terminal: Terminal → New Terminal
4. Run: `mvn test`

## Best Practices Checklist

- [ ] Use page objects for all UI elements
- [ ] Implement explicit waits for synchronization
- [ ] Add meaningful assertions in tests
- [ ] Use data providers for multiple test scenarios
- [ ] Add logging for debugging
- [ ] Keep test data separate from tests
- [ ] Use descriptive test names
- [ ] Add documentation to complex methods
- [ ] Keep tests independent and idempotent
- [ ] Regular commits to version control

## Next Steps

1. **Explore Framework** - Review existing tests
2. **Create Page Objects** - Add pages for your application
3. **Write Tests** - Implement test cases
4. **Run & Debug** - Execute and troubleshoot
5. **Generate Reports** - Review test results
6. **Continuous Integration** - Setup CI/CD pipeline

---

**Need Help?** Check README.md for detailed documentation.
