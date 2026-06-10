package com.thetestingacademy.base;

import com.thetestingacademy.asserts.AssertActions;
import com.thetestingacademy.endpoints.APIConstants;
import com.thetestingacademy.modules.PayloadManager;
import io.restassured.RestAssured;
import io.restassured.builder.RequestSpecBuilder;
import io.restassured.filter.log.RequestLoggingFilter;
import io.restassured.http.ContentType;
import io.restassured.response.Response;
import io.restassured.response.ValidatableResponse;
import io.restassured.specification.RequestSpecification;
import org.testng.annotations.AfterClass;
import org.testng.annotations.BeforeClass;

public class BaseTest {
    public RequestSpecification requestSpecification;
    public AssertActions assertActions;
    public PayloadManager payloadManager;
    public Response response;
    public ValidatableResponse validatableResponse;

    @BeforeClass
    public void setUp() {
        payloadManager = new PayloadManager();
        assertActions = new AssertActions();

        requestSpecification = new RequestSpecBuilder()
            .setBaseUri(APIConstants.BASE_URL)
            .setContentType(ContentType.JSON)
            .addHeader("Accept", "application/json")
            .addFilter(new RequestLoggingFilter())
            .build();
    }

    public String getToken() {
        RequestSpecification authSpec = RestAssured.given()
            .baseUri(APIConstants.BASE_URL)
            .basePath(APIConstants.AUTH_URL)
            .contentType(ContentType.JSON)
            .body(payloadManager.setAuthPayload());

        response = authSpec.when().post();
        response.then().statusCode(200);
        return payloadManager.getTokenFromJSON(response.asString());
    }

    @AfterClass
    public void tearDown() {
        System.out.println("Completed RestAssured API tests.");
    }
}
