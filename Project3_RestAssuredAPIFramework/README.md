# REST Assured API Automation Framework

This project contains a production-style REST API automation framework built with Java, REST Assured, TestNG, GSON, JavaFaker, AssertJ and Allure reporting.

## Structure

- `src/main/java/com/thetestingacademy/endpoints` - API endpoint constants
- `src/main/java/com/thetestingacademy/modules` - Payload manager and helpers
- `src/main/java/com/thetestingacademy/pojos` - Request and response POJOs
- `src/test/java/com/thetestingacademy/base` - Base test setup and utilities
- `src/test/java/com/thetestingacademy/asserts` - Custom assertion wrappers
- `src/test/java/com/thetestingacademy/tests` - CRUD and E2E test flows
- `src/test/resources` - Test configuration files

## Run tests

```bash
mvn test
```

## Notes

- Uses `https://restful-booker.herokuapp.com` as the target API.
- Login token is created via `/auth` and reused for update/delete flows.
- Payloads are generated via a `PayloadManager` class.
