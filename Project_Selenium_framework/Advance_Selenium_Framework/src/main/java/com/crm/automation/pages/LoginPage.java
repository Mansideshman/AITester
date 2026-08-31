package com.crm.automation.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import com.crm.automation.core.BasePage;

/**
 * LoginPage - Page Object Model for Login Page
 * Contains elements and methods for login functionality
 * 
 * @author QA Team
 * @version 1.0
 */
public class LoginPage extends BasePage {

    // Locators
    private By usernameField = By.id("username");
    private By passwordField = By.id("password");
    private By loginButton = By.id("login");
    private By errorMessage = By.className("error-message");
    private By rememberMeCheckbox = By.id("rememberMe");

    public LoginPage(WebDriver driver) {
        super(driver);
    }

    /**
     * Enter username
     * @param username - Username to enter
     */
    public void enterUsername(String username) {
        type(usernameField, username);
    }

    /**
     * Enter password
     * @param password - Password to enter
     */
    public void enterPassword(String password) {
        type(passwordField, password);
    }

    /**
     * Click login button
     */
    public void clickLoginButton() {
        click(loginButton);
    }

    /**
     * Perform login
     * @param username - Username
     * @param password - Password
     */
    public void login(String username, String password) {
        enterUsername(username);
        enterPassword(password);
        clickLoginButton();
    }

    /**
     * Get error message
     * @return Error message text
     */
    public String getErrorMessage() {
        return getText(errorMessage);
    }

    /**
     * Check if error message is displayed
     * @return true if displayed
     */
    public boolean isErrorMessageDisplayed() {
        return isElementDisplayed(errorMessage);
    }

    /**
     * Check if login page is displayed
     * @return true if displayed
     */
    public boolean isLoginPageDisplayed() {
        return isElementDisplayed(usernameField);
    }
}
