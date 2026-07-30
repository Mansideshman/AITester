package com.crm.automation.utilities;

import org.apache.logging.log4j.LogManager;
import org.apache.logging.log4j.core.Logger;

/**
 * Logger - Centralized logging utility
 * Wrapper around Log4j for consistent logging across the framework
 * 
 * @author QA Team
 * @version 1.0
 */
public class Log {
    private static Logger logger = (Logger) LogManager.getLogger(Log.class);

    /**
     * Log info message
     */
    public static void info(String message) {
        logger.info(message);
    }

    /**
     * Log debug message
     */
    public static void debug(String message) {
        logger.debug(message);
    }

    /**
     * Log warning message
     */
    public static void warn(String message) {
        logger.warn(message);
    }

    /**
     * Log error message
     */
    public static void error(String message) {
        logger.error(message);
    }

    /**
     * Log error message with exception
     */
    public static void error(String message, Throwable throwable) {
        logger.error(message, throwable);
    }
}
