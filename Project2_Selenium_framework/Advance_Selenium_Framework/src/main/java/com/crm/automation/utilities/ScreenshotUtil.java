package com.crm.automation.utilities;

import org.openqa.selenium.WebDriver;
import org.openqa.selenium.OutputType;
import org.openqa.selenium.TakesScreenshot;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Screenshot utility for capturing screen on failures
 * 
 * @author QA Team
 * @version 1.0
 */
public class ScreenshotUtil {

    /**
     * Take screenshot and save to file
     * @param driver - WebDriver instance
     * @param testName - Name of the test
     * @return Path to screenshot file
     */
    public static String takeScreenshot(WebDriver driver, String testName) {
        try {
            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());
            String screenshotPath = "test-output/screenshots/" + testName + "_" + timestamp + ".png";
            
            // Create directory if it doesn't exist
            Files.createDirectories(Paths.get("test-output/screenshots"));
            
            TakesScreenshot screenshot = (TakesScreenshot) driver;
            File srcFile = screenshot.getScreenshotAs(OutputType.FILE);
            File destFile = new File(screenshotPath);
            
            Files.copy(srcFile.toPath(), destFile.toPath());
            Logger.info("Screenshot taken: " + screenshotPath);
            return screenshotPath;
            
        } catch (IOException e) {
            Logger.error("Failed to take screenshot: " + e.getMessage());
            return null;
        }
    }

    /**
     * Take screenshot with custom path
     * @param driver - WebDriver instance
     * @param filePath - Custom file path
     * @return true if successful
     */
    public static boolean takeScreenshot(WebDriver driver, String filePath, String fileName) {
        try {
            Files.createDirectories(Paths.get(filePath));
            String timestamp = new SimpleDateFormat("yyyy-MM-dd_HH-mm-ss").format(new Date());
            String fullPath = filePath + "/" + fileName + "_" + timestamp + ".png";
            
            TakesScreenshot screenshot = (TakesScreenshot) driver;
            File srcFile = screenshot.getScreenshotAs(OutputType.FILE);
            Files.copy(srcFile.toPath(), Paths.get(fullPath));
            
            Logger.info("Screenshot saved: " + fullPath);
            return true;
            
        } catch (IOException e) {
            Logger.error("Failed to take screenshot: " + e.getMessage());
            return false;
        }
    }
}
