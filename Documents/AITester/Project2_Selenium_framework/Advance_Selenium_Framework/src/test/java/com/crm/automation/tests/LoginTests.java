package com.crm.automation.tests;

import org.testng.Assert;
import org.testng.annotations.Test;
import com.crm.automation.core.BaseTest;
import com.crm.automation.pages.LoginPage;
import com.crm.automation.pages.HomePage;
import com.crm.automation.utilities.Logger;

/**
 * LoginTests - Test cases for login functionality
 * 
 * @author QA Team
 * @version 1.0
 */
public class LoginTests extends BaseTest {

    @Test(description = "Verify user can login with valid credentials")
    public void testValidLogin() {
        Logger.info("Test: Valid Login Test");
        
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageDisplayed(), "Login page should be displayed");

        // Note: Use credentials from config or data provider
        // This is a template - replace with actual credentials
        loginPage.login("username", "password");
        
        HomePage homePage = new HomePage(driver);
        Assert.assertTrue(homePage.isHomePageDisplayed(), "Home page should be displayed after successful login");
    }

    @Test(description = "Verify login with invalid credentials shows error")
    public void testInvalidLogin() {
        Logger.info("Test: Invalid Login Test");
        
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageDisplayed(), "Login page should be displayed");

        loginPage.login("invalid_user", "invalid_pass");
        
        Assert.assertTrue(loginPage.isErrorMessageDisplayed(), "Error message should be displayed");
        Assert.assertNotNull(loginPage.getErrorMessage(), "Error message should not be null");
    }

    @Test(description = "Verify login with empty credentials")
    public void testLoginWithEmptyCredentials() {
        Logger.info("Test: Login with Empty Credentials Test");
        
        LoginPage loginPage = new LoginPage(driver);
        Assert.assertTrue(loginPage.isLoginPageDisplayed(), "Login page should be displayed");

        loginPage.clickLoginButton();
        
        Assert.assertTrue(loginPage.isErrorMessageDisplayed(), "Error message should be displayed for empty credentials");
    }
}
