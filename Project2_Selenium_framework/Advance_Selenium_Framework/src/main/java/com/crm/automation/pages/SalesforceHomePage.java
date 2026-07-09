package com.crm.automation.pages;

import org.openqa.selenium.By;
import org.openqa.selenium.WebDriver;
import com.crm.automation.core.BasePage;

/**
 * SalesforceHomePage - Salesforce Lightning Experience Home Page
 * Contains elements and methods for Salesforce home page operations
 * 
 * @author QA Team
 * @version 1.0
 */
public class SalesforceHomePage extends BasePage {

    // Locators
    private By appLauncher = By.xpath("//button[@aria-label='App Launcher']");
    private By appLauncherSearchBox = By.xpath("//input[@placeholder='Search apps and items...']");
    private By userMenuButton = By.xpath("//button[@title='User menu']");
    private By logoutOption = By.xpath("//a[contains(text(), 'Log Out')]");
    private By homeTab = By.xpath("//a[contains(@href, '/lightning/page/home')]");
    private By pageHeading = By.xpath("//h1[@class='slds-page-header__title']");

    public SalesforceHomePage(WebDriver driver) {
        super(driver);
    }

    /**
     * Check if Salesforce home page is displayed
     * @return true if displayed
     */
    public boolean isSalesforceHomeDisplayed() {
        return isElementDisplayed(appLauncher);
    }

    /**
     * Open app via App Launcher
     * @param appName - Name of the app to open
     */
    public void openApp(String appName) {
        click(appLauncher);
        waitForSeconds(1);
        type(appLauncherSearchBox, appName);
        By appOption = By.xpath("//span[contains(text(), '" + appName + "')]/ancestor::div[@class='slds-box']");
        click(appOption);
        Logger.info("Opened app: " + appName);
    }

    /**
     * Open specific Salesforce object
     * @param objectName - Name of the object (e.g., "Accounts", "Leads")
     */
    public void openSalesforceObject(String objectName) {
        click(appLauncher);
        type(appLauncherSearchBox, objectName);
        By objectLink = By.xpath("//span[contains(text(), '" + objectName + "')]");
        click(objectLink);
        Logger.info("Opened object: " + objectName);
    }

    /**
     * Open user menu
     */
    public void openUserMenu() {
        click(userMenuButton);
        Logger.info("Opened user menu");
    }

    /**
     * Logout from Salesforce
     */
    public void logout() {
        openUserMenu();
        click(logoutOption);
        Logger.info("Logged out from Salesforce");
    }

    /**
     * Go to home page
     */
    public void goToHome() {
        click(homeTab);
        Logger.info("Navigated to home page");
    }

    /**
     * Get current page heading
     * @return Page heading text
     */
    public String getPageHeading() {
        return getText(pageHeading);
    }

    private void waitForSeconds(int seconds) {
        try {
            Thread.sleep(seconds * 1000L);
        } catch (InterruptedException e) {
            Logger.error("Wait interrupted: " + e.getMessage());
        }
    }

    private void logger(String message) {
        // Placeholder for logger
    }
}
