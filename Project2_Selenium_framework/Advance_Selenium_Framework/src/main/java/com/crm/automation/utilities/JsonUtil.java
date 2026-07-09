package com.crm.automation.utilities;

import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import com.google.gson.JsonObject;

/**
 * JSON Utility for handling JSON operations
 * 
 * @author QA Team
 * @version 1.0
 */
public class JsonUtil {
    private static final Gson gson = new GsonBuilder().setPrettyPrinting().create();

    /**
     * Convert object to JSON string
     * @param object - Object to convert
     * @return JSON string
     */
    public static String toJson(Object object) {
        return gson.toJson(object);
    }

    /**
     * Parse JSON string to JsonObject
     * @param jsonString - JSON string
     * @return JsonObject
     */
    public static JsonObject parseJson(String jsonString) {
        return gson.fromJson(jsonString, JsonObject.class);
    }

    /**
     * Get value from JSON string
     * @param jsonString - JSON string
     * @param key - Key to retrieve
     * @return Value
     */
    public static String getJsonValue(String jsonString, String key) {
        try {
            JsonObject jsonObject = parseJson(jsonString);
            return jsonObject.get(key).getAsString();
        } catch (Exception e) {
            Logger.error("Error retrieving JSON value: " + e.getMessage());
            return null;
        }
    }
}
