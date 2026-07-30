package com.thetestingacademy.modules;

import com.github.javafaker.Faker;
import com.google.gson.Gson;
import com.thetestingacademy.pojos.request.Auth;
import com.thetestingacademy.pojos.request.Booking;
import com.thetestingacademy.pojos.request.Bookingdates;
import com.thetestingacademy.pojos.response.BookingResponse;
import com.thetestingacademy.pojos.response.TokenResponse;

public class PayloadManager {
    private Gson gson = new Gson();
    private Faker faker = new Faker();

    public String createPayloadBookingAsString() {
        Booking booking = new Booking();
        booking.setFirstname("Pramod");
        booking.setLastname("Dutta");
        booking.setTotalprice(112);
        booking.setDepositpaid(true);

        Bookingdates bookingdates = new Bookingdates();
        bookingdates.setCheckin("2024-02-01");
        bookingdates.setCheckout("2024-02-10");
        booking.setBookingdates(bookingdates);
        booking.setAdditionalneeds("Breakfast");

        return gson.toJson(booking);
    }

    public String createPayloadBookingFakerJS() {
        Booking booking = new Booking();
        booking.setFirstname(faker.name().firstName());
        booking.setLastname(faker.name().lastName());
        booking.setTotalprice(faker.number().numberBetween(1, 1000));
        booking.setDepositpaid(faker.bool().bool());

        Bookingdates bookingdates = new Bookingdates();
        bookingdates.setCheckin("2024-02-01");
        bookingdates.setCheckout("2024-02-10");
        booking.setBookingdates(bookingdates);
        booking.setAdditionalneeds("Lunch");

        return gson.toJson(booking);
    }

    public String createPayloadBookingAsStringWrongBody() {
        Booking booking = new Booking();
        booking.setFirstname("会意; 會意");
        booking.setLastname("Test");
        booking.setTotalprice(112);
        booking.setDepositpaid(true);

        Bookingdates bookingdates = new Bookingdates();
        bookingdates.setCheckin("5025-02-01");
        bookingdates.setCheckout("5025-02-10");
        booking.setBookingdates(bookingdates);
        booking.setAdditionalneeds("Breakfast");

        return gson.toJson(booking);
    }

    public String fullUpdatePayloadAsString() {
        Booking booking = new Booking();
        booking.setFirstname("UpdatedFirstName");
        booking.setLastname("UpdatedLastName");
        booking.setTotalprice(500);
        booking.setDepositpaid(false);

        Bookingdates bookingdates = new Bookingdates();
        bookingdates.setCheckin("2024-03-01");
        bookingdates.setCheckout("2024-03-15");
        booking.setBookingdates(bookingdates);
        booking.setAdditionalneeds("Dinner");

        return gson.toJson(booking);
    }

    public String setAuthPayload() {
        Auth auth = new Auth();
        auth.setUsername("admin");
        auth.setPassword("password123");
        return gson.toJson(auth);
    }

    public BookingResponse bookingResponseJava(String responseString) {
        return gson.fromJson(responseString, BookingResponse.class);
    }

    public Booking bookingFromGet(String responseString) {
        return gson.fromJson(responseString, Booking.class);
    }

    public String getTokenFromJSON(String tokenResponse) {
        TokenResponse response = gson.fromJson(tokenResponse, TokenResponse.class);
        return response.getToken();
    }
}
