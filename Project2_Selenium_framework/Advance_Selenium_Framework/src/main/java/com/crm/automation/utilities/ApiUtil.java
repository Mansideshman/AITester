package com.crm.automation.utilities;

import io.restassured.RestAssured;
import io.restassured.response.Response;
import io.restassured.specification.RequestSpecification;

/**
 * API Utility for REST API testing
 * Wrapper around RestAssured
 * 
 * @author QA Team
 * @version 1.0
 */
public class ApiUtil {

    /**
     * Create base request specification
     * @param baseURL - Base URL for API
     * @return RequestSpecification
     */
    public static RequestSpecification createRequest(String baseURL) {
        return RestAssured.given()
                .baseUri(baseURL)
                .contentType("application/json");
    }

    /**
     * Perform GET request
     * @param url - URL endpoint
     * @return Response
     */
    public static Response get(String url) {
        Logger.info("GET request: " + url);
        return RestAssured.get(url);
    }

    /**
     * Perform POST request
     * @param url - URL endpoint
     * @param body - Request body
     * @return Response
     */
    public static Response post(String url, Object body) {
        Logger.info("POST request: " + url);
        return RestAssured.given()
                .contentType("application/json")
                .body(JsonUtil.toJson(body))
                .post(url);
    }

    /**
     * Perform PUT request
     * @param url - URL endpoint
     * @param body - Request body
     * @return Response
     */
    public static Response put(String url, Object body) {
        Logger.info("PUT request: " + url);
        return RestAssured.given()
                .contentType("application/json")
                .body(JsonUtil.toJson(body))
                .put(url);
    }

    /**
     * Perform DELETE request
     * @param url - URL endpoint
     * @return Response
     */
    public static Response delete(String url) {
        Logger.info("DELETE request: " + url);
        return RestAssured.delete(url);
    }
}
