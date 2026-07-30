package com.crm.automation.tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import com.crm.automation.core.BaseTest;
import com.crm.automation.pages.SalesforceHomePage;
import com.crm.automation.utilities.Logger;

/**
 * SalesforceTests - Test cases for Salesforce-specific functionality
 * 
 * @author QA Team
 * @version 1.0
 */
public class SalesforceTests extends BaseTest {

    @Test(description = "Verify user can access Salesforce home page")
    public void testAccessSalesforceHome() {
        Logger.info("Test: Access Salesforce Home Page");
        
        SalesforceHomePage homePage = new SalesforceHomePage(driver);
        Assert.assertTrue(homePage.isSalesforceHomeDisplayed(), 
            "Salesforce home page should be displayed");
    }

    @Test(description = "Verify user can open app from App Launcher")
    public void testOpenAppFromAppLauncher() {
        Logger.info("Test: Open App from App Launcher");
        
        SalesforceHomePage homePage = new SalesforceHomePage(driver);
        homePage.openApp("Sales");
        
        // Verify app opened
        Assert.assertTrue(driver.getCurrentUrl().contains("sales"), 
            "Sales app should be opened");
    }

    @Test(description = "Verify logout functionality")
    public void testLogout() {
        Logger.info("Test: Logout Functionality");
        
        SalesforceHomePage homePage = new SalesforceHomePage(driver);
        homePage.logout();
        
        // After logout, verify redirected to login
        Assert.assertTrue(driver.getCurrentUrl().contains("login"), 
            "Should be redirected to login page after logout");
    }
}
