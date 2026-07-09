package com.crm.automation.config;

import java.io.FileInputStream;
import java.io.IOException;
import java.util.Properties;

/**
 * Configuration Reader - Loads properties from config files
 * Supports multiple environments (dev, qa, prod)
 * 
 * @author QA Team
 * @version 1.0
 */
public class ConfigReader {
    private static Properties properties;

    static {
        try {
            loadProperties();
        } catch (IOException e) {
            throw new RuntimeException("Failed to load configuration properties: " + e.getMessage());
        }
    }

    private static void loadProperties() throws IOException {
        properties = new Properties();
        
        // Load base configuration
        String basePath = "src/main/resources/config.properties";
        FileInputStream baseFile = new FileInputStream(basePath);
        properties.load(baseFile);
        baseFile.close();

        // Load environment-specific configuration
        String environment = System.getProperty("env", "qa");
        String envPath = "src/main/resources/config_" + environment + ".properties";
        try {
            FileInputStream envFile = new FileInputStream(envPath);
            properties.load(envFile);
            envFile.close();
        } catch (IOException e) {
            System.out.println("Environment config file not found: " + envPath + ". Using base config.");
        }
    }

    public static String getProperty(String key) {
        String value = properties.getProperty(key);
        if (value == null) {
            throw new RuntimeException("Property not found: " + key);
        }
        return value;
    }

    public static String getProperty(String key, String defaultValue) {
        return properties.getProperty(key, defaultValue);
    }

    public static int getIntProperty(String key) {
        return Integer.parseInt(getProperty(key));
    }

    public static boolean getBooleanProperty(String key) {
        return Boolean.parseBoolean(getProperty(key));
    }

    // Browser Configuration
    public static String getBrowser() {
        return getProperty("browser", "chrome");
    }

    public static String getBaseURL() {
        return getProperty("base.url");
    }

    public static int getImplicitWait() {
        return getIntProperty("implicit.wait");
    }

    public static int getExplicitWait() {
        return getIntProperty("explicit.wait");
    }

    public static boolean isHeadlessMode() {
        return getBooleanProperty("headless.mode");
    }

    // Salesforce Credentials
    public static String getSalesforceUsername() {
        return getProperty("sf.username");
    }

    public static String getSalesforcePassword() {
        return getProperty("sf.password");
    }

    public static String getSalesforceSecurityToken() {
        return getProperty("sf.security.token", "");
    }

    // Report Configuration
    public static String getReportPath() {
        return getProperty("report.path", "test-output/");
    }

    public static boolean isScreenshotOnFailure() {
        return getBooleanProperty("screenshot.on.failure");
    }
}
