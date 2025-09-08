# Gemini Plan: Implement "Upsert" Logic for User Creation

The current system returns a 404 when fetching a user profile that doesn't exist. The goal is to ensure a user is automatically created in the database the first time they are identified via the `x-user-id` header. This will be achieved by adding "upsert" (update or insert) logic to the relevant middleware or service.

## Phase 1: Investigation & Analysis

1.  **Analyze the Request Flow:**
    *   Examine the code for the endpoint `GET /api/users/:userId/profile`. Based on the file structure, this is likely handled in `apps/api/src/routes/users.ts`.
    *   Read `apps/api/src/routes/users.ts` to understand how it handles the request and what services it calls.

2.  **Identify User Handling Middleware:**
    *   A `x-user-id` header suggests there might be middleware that reads this header and attaches user information to the request object. `apps/api/src/middleware/usage-tracker.ts` is a likely candidate.
    *   Read `apps/api/src/middleware/usage-tracker.ts` to see if it's suitable for adding the user creation logic.

3.  **Examine Database Interaction:**
    *   Understand how users are currently fetched from the database by reviewing `apps/api/src/db/queries.sql` and any relevant services.
    *   Read `apps/api/src/db/migrations/002_user_enhancements.sql` to confirm the structure of the `users` table (e.g., column names like `id`, `created_at`, `last_seen`).

## Phase 2: Implementation

1.  **Create a User Upsert Database Query:**
    *   Add a new query to `apps/api/src/db/queries.sql`.
    *   This query will use an `INSERT ... ON CONFLICT` statement (for PostgreSQL) to perform the upsert operation. It will insert a new user with the given `id` and `now()` for `created_at` and `last_seen`. On conflict (if the user `id` already exists), it will update the `last_seen` field to `now()`.

2.  **Create a `UserService`:**
    *   Create a new service file: `apps/api/src/services/UserService.ts`.
    *   This service will contain a method, `upsertUser(userId: string)`, which executes the new database query. This encapsulates the logic cleanly.

3.  **Modify Middleware to Upsert User:**
    *   Modify the middleware that extracts the `x-user-id` (likely `usage-tracker.ts`).
    *   In this middleware, after extracting the `userId`, call the new `UserService.upsertUser(userId)` method. This will be done without awaiting the result to avoid blocking the request pipeline.

4.  **Refactor Profile Endpoint:**
    *   Review the `GET /api/users/:userId/profile` handler in `apps/api/src/routes/users.ts`.
    *   With the upsert logic in the middleware, the handler can now safely assume the user exists. Ensure it correctly fetches and returns the user's profile information.

## Phase 3: Verification

1.  **Write an Integration Test:**
    *   Create a new test file, `apps/api/src/routes/users.test.ts`.
    *   The test will simulate the user's report: make a `GET` request to `/api/users/some-new-user-id/profile` with the `x-user-id` header set.
    *   **Assertion 1:** The request should now return a `200 OK` status.
    *   **Assertion 2:** The response body should contain the profile of the newly created user.
    *   **Assertion 3:** Verify the user exists in the `users` table.

2.  **Run All Tests:**
    *   Execute the project's full test suite to ensure no regressions have been introduced.
