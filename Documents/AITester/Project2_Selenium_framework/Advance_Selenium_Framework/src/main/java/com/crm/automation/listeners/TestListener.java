package com.crm.automation.listeners;

import org.testng.ITestListener;
import org.testng.ITestResult;
import com.crm.automation.config.ConfigReader;
import com.crm.automation.core.DriverFactory;
import com.crm.automation.utilities.Logger;
import com.crm.automation.utilities.ScreenshotUtil;

/**
 * Test Listener - Captures test execution events
 * Takes screenshots on failure, logs test results
 * 
 * @author QA Team
 * @version 1.0
 */
public class TestListener implements ITestListener {

    @Override
    public void onTestStart(ITestResult result) {
        Logger.info("========================================");
        Logger.info("Test Started: " + result.getMethod().getMethodName());
        Logger.info("========================================");
    }

    @Override
    public void onTestSuccess(ITestResult result) {
        Logger.info("✓ Test PASSED: " + result.getMethod().getMethodName());
        Logger.info("Execution Time: " + (result.getEndMillis() - result.getStartMillis()) + "ms");
    }

    @Override
    public void onTestFailure(ITestResult result) {
        Logger.error("✗ Test FAILED: " + result.getMethod().getMethodName());
        Logger.error("Failure Message: " + result.getThrowable().getMessage());

        // Take screenshot on failure
        if (ConfigReader.isScreenshotOnFailure()) {
            try {
                String screenshotPath = ScreenshotUtil.takeScreenshot(
                    DriverFactory.getDriver(),
                    result.getMethod().getMethodName()
                );
                Logger.info("Screenshot saved at: " + screenshotPath);
            } catch (Exception e) {
                Logger.error("Failed to take screenshot: " + e.getMessage());
            }
        }
    }

    @Override
    public void onTestSkipped(ITestResult result) {
        Logger.warn("⊝ Test SKIPPED: " + result.getMethod().getMethodName());
        Logger.warn("Reason: " + result.getThrowable().getMessage());
    }

    @Override
    public void onTestFailedButWithinSuccessPercentage(ITestResult result) {
        Logger.warn("Test Failed but within success percentage: " + result.getMethod().getMethodName());
    }
}
