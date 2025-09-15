# Task 30: Fix Switch User Dropdown (User Correction) - ✅ COMPLETED

## Problem

When using the switch user dropdown in the web dashboard, the selected user is not actually being changed. This is evident because the "My Shows" list does not update — it always displays the same shows, regardless of the user selected.

## Goal

Ensure that when a user is switched from the dropdown:

- The correct user context is applied.
- `My Shows` updates to reflect the selected user's `user_shows` entries.
- Any authenticated requests (watchlist, subscriptions, etc.) use the selected user's token/id.

## ✅ Solution Implemented

### Root Cause Identified

The original implementation used `window.location.reload()` after switching users, which created race conditions where API calls could use stale tokens before the page fully reloaded.

### Changes Made

#### 1. Updated UserSwitcher Component (`apps/web/src/components/UserSwitcher.tsx`)

- **Removed page reload pattern**: Eliminated `window.location.reload()`
- **Added AuthContext integration**: Now uses `useAuth()` hook and calls `auth.login()` directly
- **Improved UX**: Added loading states, error handling, and user feedback
- **Enhanced debugging**: Comprehensive logging for user switch tracking

#### 2. Updated MyShows Component (`apps/web/src/pages/MyShows.tsx`)

- **Reactive to auth changes**: Added `useAuth()` hook with user ID dependency
- **Cache clearing**: Automatically clears all cached data when user changes
- **Auto-refresh**: Re-fetches watchlist data immediately when user switches
- **Debug logging**: Added logging to confirm which user's data is being fetched

#### 3. Enhanced API Request Logging (`apps/web/src/config/api.ts`)

- **JWT validation**: Decodes tokens to confirm user identity
- **Token/user ID validation**: Warns if token user ID doesn't match stored user ID
- **Request tracing**: Enhanced debug logging throughout API request flow

### How It Works Now

1. User selects different user from dropdown
2. UserSwitcher performs login for target user (if known password exists)
3. AuthContext updates immediately via `auth.login()`
4. All components using `useAuth()` re-render with new user context
5. MyShows detects user change and automatically refreshes data
6. No page reload - seamless user switching experience

### Current Limitation

- User switching currently only works for users with known test passwords:
  - `admin@test.com`
  - `test1@example.com`
  - `test2@example.com`
  - `freshtest@example.com`
- These appear as "Quick" (green) users in the dropdown

## 🔄 Future Enhancement

**Task**: Allow switching to any test user without requiring hardcoded passwords
**Solution**: Create development-only `/api/auth/impersonate` endpoint that generates valid tokens for any user ID without password verification. This would make all users in the dropdown switchable.

## ✅ Deliverables Completed

- ✅ Updated implementation so that switching the user in the dropdown properly changes the active user context
- ✅ Confirmation that `My Shows` reflects the new user's data immediately after switching
- ✅ Added comprehensive logging (dev mode only) to confirm which user id is active after a switch
- ✅ Eliminated page reloads for seamless user experience
