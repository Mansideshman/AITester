package com.crm.automation.utilities;

import java.sql.*;

/**
 * Database Utility for data validation and test data management
 * 
 * @author QA Team
 * @version 1.0
 */
public class DatabaseUtil {
    private static Connection connection;

    /**
     * Get database connection
     * @return Database connection
     */
    public static Connection getConnection() {
        try {
            if (connection == null || connection.isClosed()) {
                String url = "jdbc:mysql://" + ConfigReader.getProperty("db.host", "localhost") + 
                           ":" + ConfigReader.getProperty("db.port", "3306") + 
                           "/" + ConfigReader.getProperty("db.name", "test_db");
                String username = ConfigReader.getProperty("db.username", "root");
                String password = ConfigReader.getProperty("db.password", "");

                Class.forName("com.mysql.cj.jdbc.Driver");
                connection = DriverManager.getConnection(url, username, password);
                Logger.info("Database connection established");
            }
        } catch (Exception e) {
            Logger.error("Failed to get database connection: " + e.getMessage());
            throw new RuntimeException("Database connection failed", e);
        }
        return connection;
    }

    /**
     * Execute query and get result set
     * @param query - SQL query
     * @return ResultSet
     */
    public static ResultSet executeQuery(String query) {
        try {
            Logger.debug("Executing query: " + query);
            Statement statement = getConnection().createStatement();
            return statement.executeQuery(query);
        } catch (SQLException e) {
            Logger.error("Query execution failed: " + e.getMessage());
            throw new RuntimeException("Query execution failed", e);
        }
    }

    /**
     * Execute update/insert/delete query
     * @param query - SQL query
     * @return Number of affected rows
     */
    public static int executeUpdate(String query) {
        try {
            Logger.debug("Executing update: " + query);
            Statement statement = getConnection().createStatement();
            return statement.executeUpdate(query);
        } catch (SQLException e) {
            Logger.error("Update execution failed: " + e.getMessage());
            throw new RuntimeException("Update execution failed", e);
        }
    }

    /**
     * Close database connection
     */
    public static void closeConnection() {
        try {
            if (connection != null && !connection.isClosed()) {
                connection.close();
                Logger.info("Database connection closed");
            }
        } catch (SQLException e) {
            Logger.error("Error closing connection: " + e.getMessage());
        }
    }
}
