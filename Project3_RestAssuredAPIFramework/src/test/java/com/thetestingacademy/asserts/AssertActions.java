package com.thetestingacademy.asserts;

import io.restassured.response.Response;

import static org.assertj.core.api.Assertions.assertThat;
import static org.testng.Assert.assertEquals;

public class AssertActions {

    public void verifyResponseBody(String actual, String expected, String description) {
        assertEquals(actual, expected, description);
    }

    public void verifyResponseBody(int actual, int expected, String description) {
        assertEquals(actual, expected, description);
    }

    public void verifyStatusCode(Response response, Integer expected) {
        assertEquals(response.getStatusCode(), expected.intValue());
    }

    public void verifyStringKey(String actual, String expected) {
        assertThat(actual).isNotNull();
        assertThat(actual).isNotBlank();
        assertEquals(actual, expected);
    }

    public void verifyStringKeyNotNull(Object keyExpect) {
        assertThat(keyExpect).isNotNull();
    }

    public void verifyResponseTime(Response response, long maxMillis) {
        assertThat(response.getTime()).isLessThan(maxMillis);
    }

    public void verifyContentType(Response response, String expectedContentType) {
        assertThat(response.getContentType()).contains(expectedContentType);
    }
}
