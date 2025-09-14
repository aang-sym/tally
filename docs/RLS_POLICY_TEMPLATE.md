# Row-Level Security (RLS) Policy Template

## 1. Purpose

This document provides a standardized template for defining and documenting Row-Level Security (RLS) policies in our database. By following these patterns, we ensure consistency, security, and clarity across all user-scoped tables and operations.

## 2. General Pattern

Use the following SQL skeleton as a starting point for user-scoped tables:

```sql
-- Enable RLS on the table
ALTER TABLE <table_name> ENABLE ROW LEVEL SECURITY;

-- Create SELECT policy
CREATE POLICY <table_name>_select_policy
  ON <table_name>
  FOR SELECT
  USING (user_id = auth.uid());

-- Create INSERT policy
CREATE POLICY <table_name>_insert_policy
  ON <table_name>
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Create UPDATE policy
CREATE POLICY <table_name>_update_policy
  ON <table_name>
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Create DELETE policy
CREATE POLICY <table_name>_delete_policy
  ON <table_name>
  FOR DELETE
  USING (user_id = auth.uid());
```

## 3. Naming Conventions

- Policy names should follow the pattern: `<table>_<operation>_policy`
  - `<table>`: Name of the table (e.g., `expenses`)
  - `<operation>`: One of `select`, `insert`, `update`, `delete`
  - Example: `expenses_select_policy`

## 4. Policy Types

For each table, define policies for the four main operations. Each policy should scope access to the current authenticated user:

- **SELECT**: Allow users to read only their own rows.
  ```sql
  USING (user_id = auth.uid())
  ```
- **INSERT**: Allow users to insert rows only for themselves.
  ```sql
  WITH CHECK (user_id = auth.uid())
  ```
- **UPDATE**: Allow users to update only their own rows, and ensure they cannot change ownership.
  ```sql
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid())
  ```
- **DELETE**: Allow users to delete only their own rows.
  ```sql
  USING (user_id = auth.uid())
  ```

## 5. WITH CHECK Clause

The `WITH CHECK` clause ensures that any new or updated row still satisfies the policy condition. For example, it prevents a user from inserting or updating a row to have a different `user_id` than their own. Always use `WITH CHECK (user_id = auth.uid())` for INSERT and UPDATE policies.

## 6. Grants

Minimize privilege escalation by granting only necessary permissions to the `authenticated` role:

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON <table_name> TO authenticated;
```

Do **not** grant privileges to `anon` unless explicitly required and reviewed.

## 7. Testing Checklist

- [ ] RLS is enabled on the table.
- [ ] Policies exist for SELECT, INSERT, UPDATE, and DELETE.
- [ ] Policy names follow the naming convention.
- [ ] Policies use `user_id = auth.uid()` or equivalent for scoping.
- [ ] INSERT and UPDATE policies use `WITH CHECK`.
- [ ] Only the `authenticated` role is granted access.
- [ ] Verified that users can access only their own rows.
- [ ] Verified users cannot escalate privileges or modify others' data.
- [ ] Attempted negative tests (e.g., inserting with a different `user_id`).
