package com.crm.automation.core;

import org.testng.annotations.BeforeMethod;
import org.testng.annotations.AfterMethod;
import org.openqa.selenium.WebDriver;
import com.crm.automation.config.ConfigReader;
import com.crm.automation.utilities.Logger;

/**
 * BaseTest - Base class for all test cases
 * Handles driver setup/teardown and common test operations
 * 
 * @author QA Team
 * @version 1.0
 */
public class BaseTest {
    protected WebDriver driver;

    @BeforeMethod
    public void setUp() {
        Logger.info("=========== Test Setup Started ===========");
        driver = DriverFactory.initializeDriver();
        driver.navigate().to(ConfigReader.getBaseURL());
        Logger.info("Browser navigated to: " + ConfigReader.getBaseURL());
    }

    @AfterMethod
    public void tearDown() {
        Logger.info("=========== Test Teardown Started ===========");
        try {
            DriverFactory.quitDriver();
            Logger.info("Browser closed successfully");
        } catch (Exception e) {
            Logger.error("Error during teardown: " + e.getMessage());
        }
    }
}
