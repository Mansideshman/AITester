package com.crm.automation.core;

import org.openqa.selenium.*;
import org.openqa.selenium.support.PageFactory;
import org.openqa.selenium.support.ui.ExpectedConditions;
import org.openqa.selenium.support.ui.Wait;
import org.openqa.selenium.support.ui.WebDriverWait;
import com.crm.automation.config.ConfigReader;
import com.crm.automation.utilities.Logger;
import java.time.Duration;

/**
 * BasePage - Base class for all page objects
 * Provides common methods for element interaction and waits
 * Implements Page Object Model pattern
 * 
 * @author QA Team
 * @version 1.0
 */
public abstract class BasePage {
    protected WebDriver driver;
    protected WebDriverWait wait;

    public BasePage(WebDriver driver) {
        this.driver = driver;
        this.wait = new WebDriverWait(driver, Duration.ofSeconds(ConfigReader.getExplicitWait()));
        PageFactory.initElements(driver, this);
    }

    /**
     * Wait for element to be visible
     * @param locator - By locator
     * @return WebElement
     */
    protected WebElement waitForElementToBeVisible(By locator) {
        try {
            Logger.debug("Waiting for element to be visible: " + locator);
            return wait.until(ExpectedConditions.visibilityOfElementLocated(locator));
        } catch (TimeoutException e) {
            Logger.error("Element not visible within timeout: " + locator);
            throw new RuntimeException("Element visibility timeout: " + locator, e);
        }
    }

    /**
     * Wait for element to be clickable
     * @param locator - By locator
     * @return WebElement
     */
    protected WebElement waitForElementToBeClickable(By locator) {
        try {
            Logger.debug("Waiting for element to be clickable: " + locator);
            return wait.until(ExpectedConditions.elementToBeClickable(locator));
        } catch (TimeoutException e) {
            Logger.error("Element not clickable within timeout: " + locator);
            throw new RuntimeException("Element clickable timeout: " + locator, e);
        }
    }

    /**
     * Wait for element to be present in DOM
     * @param locator - By locator
     * @return WebElement
     */
    protected WebElement waitForElementToBePresent(By locator) {
        try {
            Logger.debug("Waiting for element to be present: " + locator);
            return wait.until(ExpectedConditions.presenceOfElementLocated(locator));
        } catch (TimeoutException e) {
            Logger.error("Element not present within timeout: " + locator);
            throw new RuntimeException("Element presence timeout: " + locator, e);
        }
    }

    /**
     * Click on element with wait
     * @param locator - By locator
     */
    protected void click(By locator) {
        try {
            WebElement element = waitForElementToBeClickable(locator);
            element.click();
            Logger.info("Clicked on element: " + locator);
        } catch (Exception e) {
            Logger.error("Failed to click element: " + locator + " - " + e.getMessage());
            throw new RuntimeException("Click failed: " + locator, e);
        }
    }

    /**
     * Type text in an input field
     * @param locator - By locator
     * @param text - Text to type
     */
    protected void type(By locator, String text) {
        try {
            WebElement element = waitForElementToBeVisible(locator);
            element.clear();
            element.sendKeys(text);
            Logger.info("Typed text in element: " + locator);
        } catch (Exception e) {
            Logger.error("Failed to type in element: " + locator + " - " + e.getMessage());
            throw new RuntimeException("Type failed: " + locator, e);
        }
    }

    /**
     * Get text from element
     * @param locator - By locator
     * @return Text content
     */
    protected String getText(By locator) {
        try {
            WebElement element = waitForElementToBeVisible(locator);
            String text = element.getText();
            Logger.info("Retrieved text from element: " + locator + " - " + text);
            return text;
        } catch (Exception e) {
            Logger.error("Failed to get text from element: " + locator + " - " + e.getMessage());
            throw new RuntimeException("Get text failed: " + locator, e);
        }
    }

    /**
     * Check if element is displayed
     * @param locator - By locator
     * @return boolean
     */
    protected boolean isElementDisplayed(By locator) {
        try {
            return driver.findElement(locator).isDisplayed();
        } catch (NoSuchElementException e) {
            Logger.debug("Element not found: " + locator);
            return false;
        }
    }

    /**
     * Wait for URL to contain
     * @param urlPart - Part of URL to wait for
     */
    protected void waitForURLToContain(String urlPart) {
        try {
            wait.until(ExpectedConditions.urlContains(urlPart));
            Logger.info("URL contains: " + urlPart);
        } catch (TimeoutException e) {
            Logger.error("URL did not contain: " + urlPart);
            throw new RuntimeException("URL wait timeout", e);
        }
    }

    /**
     * Switch to frame by locator
     * @param locator - By locator
     */
    protected void switchToFrame(By locator) {
        try {
            wait.until(ExpectedConditions.frameToBeAvailableAndSwitchToIt(locator));
            Logger.info("Switched to frame: " + locator);
        } catch (TimeoutException e) {
            Logger.error("Failed to switch to frame: " + locator);
            throw new RuntimeException("Frame switch timeout", e);
        }
    }

    /**
     * Switch out of frame to main content
     */
    protected void switchOutOfFrame() {
        driver.switchTo().defaultContent();
        Logger.info("Switched out of frame to main content");
    }

    /**
     * Get current page title
     * @return Page title
     */
    public String getPageTitle() {
        return driver.getTitle();
    }

    /**
     * Get current page URL
     * @return Page URL
     */
    public String getCurrentURL() {
        return driver.getCurrentUrl();
    }
}
