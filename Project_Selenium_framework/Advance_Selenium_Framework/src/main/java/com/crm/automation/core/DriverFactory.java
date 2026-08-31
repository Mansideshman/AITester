package com.crm.automation.core;

import io.github.bonigarcia.wdm.WebDriverManager;
import org.openqa.selenium.WebDriver;
import org.openqa.selenium.chrome.ChromeDriver;
import org.openqa.selenium.chrome.ChromeOptions;
import org.openqa.selenium.firefox.FirefoxDriver;
import org.openqa.selenium.firefox.FirefoxOptions;
import org.openqa.selenium.edge.EdgeDriver;
import org.openqa.selenium.edge.EdgeOptions;
import com.crm.automation.config.ConfigReader;
import com.crm.automation.utilities.Logger;

/**
 * DriverFactory - Manages WebDriver initialization and lifecycle
 * Supports Chrome, Firefox, and Edge browsers
 * Provides thread-local driver management for parallel execution
 * 
 * @author QA Team
 * @version 1.0
 */
public class DriverFactory {
    private static final ThreadLocal<WebDriver> driverThreadLocal = new ThreadLocal<>();

    private DriverFactory() {
        // Private constructor to prevent instantiation
    }

    /**
     * Initialize WebDriver based on browser configuration
     * @return WebDriver instance
     */
    public static WebDriver initializeDriver() {
        String browser = ConfigReader.getBrowser().toLowerCase();
        WebDriver driver;

        Logger.info("Initializing WebDriver for browser: " + browser);

        try {
            switch (browser) {
                case "chrome":
                    driver = initializeChromeDriver();
                    break;
                case "firefox":
                    driver = initializeFirefoxDriver();
                    break;
                case "edge":
                    driver = initializeEdgeDriver();
                    break;
                default:
                    throw new IllegalArgumentException("Unsupported browser: " + browser);
            }

            configureDriver(driver);
            driverThreadLocal.set(driver);
            Logger.info("WebDriver initialized successfully for: " + browser);
            return driver;

        } catch (Exception e) {
            Logger.error("Failed to initialize WebDriver: " + e.getMessage());
            throw new RuntimeException("WebDriver initialization failed", e);
        }
    }

    private static WebDriver initializeChromeDriver() {
        WebDriverManager.chromedriver().setup();
        ChromeOptions options = new ChromeOptions();

        if (ConfigReader.isHeadlessMode()) {
            options.addArguments("--headless");
            Logger.info("Chrome running in headless mode");
        }

        options.addArguments(
            "--disable-notifications",
            "--disable-popup-blocking",
            "--disable-extensions",
            "--disable-dev-shm-usage",
            "--no-sandbox",
            "--disable-gpu",
            "--start-maximized"
        );

        return new ChromeDriver(options);
    }

    private static WebDriver initializeFirefoxDriver() {
        WebDriverManager.firefoxdriver().setup();
        FirefoxOptions options = new FirefoxOptions();

        if (ConfigReader.isHeadlessMode()) {
            options.addArguments("--headless");
            Logger.info("Firefox running in headless mode");
        }

        options.addArguments("--width=1920", "--height=1080");
        return new FirefoxDriver(options);
    }

    private static WebDriver initializeEdgeDriver() {
        WebDriverManager.edgedriver().setup();
        EdgeOptions options = new EdgeOptions();

        if (ConfigReader.isHeadlessMode()) {
            options.addArguments("--headless");
            Logger.info("Edge running in headless mode");
        }

        options.addArguments(
            "--disable-notifications",
            "--start-maximized"
        );

        return new EdgeDriver(options);
    }

    private static void configureDriver(WebDriver driver) {
        driver.manage().window().maximize();
        driver.manage().timeouts()
            .implicitlyWait(
                java.time.Duration.ofSeconds(ConfigReader.getImplicitWait())
            );
        Logger.info("WebDriver configured with timeouts and window settings");
    }

    /**
     * Get current thread's WebDriver instance
     * @return WebDriver instance
     */
    public static WebDriver getDriver() {
        WebDriver driver = driverThreadLocal.get();
        if (driver == null) {
            throw new RuntimeException("WebDriver not initialized. Call initializeDriver() first.");
        }
        return driver;
    }

    /**
     * Close and quit the WebDriver
     */
    public static void quitDriver() {
        WebDriver driver = driverThreadLocal.get();
        if (driver != null) {
            try {
                driver.quit();
                Logger.info("WebDriver closed successfully");
            } catch (Exception e) {
                Logger.error("Error closing WebDriver: " + e.getMessage());
            } finally {
                driverThreadLocal.remove();
            }
        }
    }
}
