package com.crm.automation.utilities;

import java.text.SimpleDateFormat;
import java.util.Date;

/**
 * Common utilities for test execution
 * 
 * @author QA Team
 * @version 1.0
 */
public class CommonUtils {

    /**
     * Wait for specified number of milliseconds
     * @param milliseconds - Time to wait
     */
    public static void waitFor(long milliseconds) {
        try {
            Logger.debug("Waiting for " + milliseconds + " milliseconds");
            Thread.sleep(milliseconds);
        } catch (InterruptedException e) {
            Logger.error("Wait interrupted: " + e.getMessage());
            Thread.currentThread().interrupt();
        }
    }

    /**
     * Wait for specified number of seconds
     * @param seconds - Time to wait
     */
    public static void waitForSeconds(int seconds) {
        waitFor(seconds * 1000L);
    }

    /**
     * Get current timestamp
     * @return Timestamp string
     */
    public static String getCurrentTimestamp() {
        return new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
    }

    /**
     * Get timestamp with custom format
     * @param format - Date format
     * @return Formatted timestamp
     */
    public static String getTimestamp(String format) {
        return new SimpleDateFormat(format).format(new Date());
    }

    /**
     * Check if string is null or empty
     * @param str - String to check
     * @return true if null or empty
     */
    public static boolean isNullOrEmpty(String str) {
        return str == null || str.trim().isEmpty();
    }

    /**
     * Generate random string
     * @param length - Length of string
     * @return Random string
     */
    public static String generateRandomString(int length) {
        String characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
        StringBuilder result = new StringBuilder();
        for (int i = 0; i < length; i++) {
            result.append(characters.charAt((int) (Math.random() * characters.length())));
        }
        return result.toString();
    }

    /**
     * Generate random number
     * @param min - Minimum value
     * @param max - Maximum value
     * @return Random number
     */
    public static int generateRandomNumber(int min, int max) {
        return min + (int) (Math.random() * ((max - min) + 1));
    }

    /**
     * Generate unique email
     * @return Unique email
     */
    public static String generateUniqueEmail() {
        return "test_" + System.currentTimeMillis() + "@testmail.com";
    }
}
