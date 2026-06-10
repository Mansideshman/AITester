package com.thetestingacademy.tests.e2e_integration;

import com.thetestingacademy.base.BaseTest;
import com.thetestingacademy.endpoints.APIConstants;
import com.thetestingacademy.pojos.response.BookingResponse;
import io.restassured.RestAssured;
import org.testng.ITestContext;
import org.testng.annotations.Test;

public class TestIntegrationFlow1 extends BaseTest {

    @Test(priority = 1)
    public void testCreateBooking(ITestContext iTestContext) {
        requestSpecification.basePath(APIConstants.CREATE_UPDATE_BOOKING_URL);
        response = RestAssured.given(requestSpecification)
            .when()
            .body(payloadManager.createPayloadBookingAsString())
            .post();

        validatableResponse = response.then().log().all();
        validatableResponse.statusCode(200);

        BookingResponse bookingResponse = payloadManager.bookingResponseJava(response.asString());
        iTestContext.setAttribute("bookingid", bookingResponse.getBookingid());
        assertActions.verifyStringKeyNotNull(bookingResponse.getBookingid());
    }

    @Test(priority = 2)
    public void testVerifyBookingId(ITestContext iTestContext) {
        Integer bookingid = (Integer) iTestContext.getAttribute("bookingid");
        String basePathGET = APIConstants.CREATE_UPDATE_BOOKING_URL + "/" + bookingid;
        requestSpecification.basePath(basePathGET);

        response = RestAssured.given(requestSpecification)
            .when()
            .get();

        validatableResponse = response.then().log().all();
        validatableResponse.statusCode(200);

        com.thetestingacademy.pojos.request.Booking booking = payloadManager.bookingFromGet(response.asString());
        assertActions.verifyStringKey(booking.getFirstname(), "Pramod");
    }

    @Test(priority = 3)
    public void testUpdateBookingByID(ITestContext iTestContext) {
        Integer bookingid = (Integer) iTestContext.getAttribute("bookingid");
        String token = getToken();
        iTestContext.setAttribute("token", token);

        String basePathPUT = APIConstants.CREATE_UPDATE_BOOKING_URL + "/" + bookingid;
        requestSpecification.basePath(basePathPUT);

        response = RestAssured.given(requestSpecification)
            .cookie("token", token)
            .when()
            .body(payloadManager.fullUpdatePayloadAsString())
            .put();

        validatableResponse = response.then().log().all();
        validatableResponse.statusCode(200);
    }

    @Test(priority = 4)
    public void testVerifyUpdatedBooking(ITestContext iTestContext) {
        Integer bookingid = (Integer) iTestContext.getAttribute("bookingid");
        String basePathGET = APIConstants.CREATE_UPDATE_BOOKING_URL + "/" + bookingid;
        requestSpecification.basePath(basePathGET);

        response = RestAssured.given(requestSpecification)
            .when()
            .get();

        validatableResponse = response.then().log().all();
        validatableResponse.statusCode(200);

        com.thetestingacademy.pojos.request.Booking booking = payloadManager.bookingFromGet(response.asString());
        assertActions.verifyStringKey(booking.getFirstname(), "UpdatedFirstName");
    }

    @Test(priority = 5)
    public void testDeleteBookingById(ITestContext iTestContext) {
        Integer bookingid = (Integer) iTestContext.getAttribute("bookingid");
        String token = (String) iTestContext.getAttribute("token");
        String basePathDELETE = APIConstants.CREATE_UPDATE_BOOKING_URL + "/" + bookingid;
        requestSpecification.basePath(basePathDELETE);

        response = RestAssured.given(requestSpecification)
            .cookie("token", token)
            .when()
            .delete();

        validatableResponse = response.then().log().all();
        validatableResponse.statusCode(201);
    }
}
