package com.crm.automation.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import com.crm.automation.core.BasePage;

/**
 * HomePage - Page Object Model for Home Page
 * Contains elements and methods for home page operations
 * 
 * @author QA Team
 * @version 1.0
 */
public class HomePage extends BasePage {

    // Locators
    private By userMenu = By.id("userMenu");
    private By logoutButton = By.id("logout");
    private By pageTitle = By.className("page-title");
    private By welcomeMessage = By.className("welcome-message");

    public HomePage(WebDriver driver) {
        super(driver);
    }

    /**
     * Check if home page is displayed
     * @return true if displayed
     */
    public boolean isHomePageDisplayed() {
        return isElementDisplayed(pageTitle);
    }

    /**
     * Get welcome message
     * @return Welcome message text
     */
    public String getWelcomeMessage() {
        return getText(welcomeMessage);
    }

    /**
     * Click on user menu
     */
    public void clickUserMenu() {
        click(userMenu);
    }

    /**
     * Click logout button
     */
    public void clickLogout() {
        clickUserMenu();
        click(logoutButton);
    }

    /**
     * Verify user is logged in
     * @return true if logged in
     */
    public boolean verifyUserLoggedIn() {
        return isHomePageDisplayed() && isElementDisplayed(userMenu);
    }
}
