# Tally iOS App

> Main iOS app for Tally - Smart streaming service management

## Status

**Not implemented yet** - This directory is prepared for the iOS app development.

## Planned Architecture

**UI Framework**: SwiftUI
**Networking**: URLSession with Codable models
**Data Persistence**: Core Data or Swift Data
**Architecture**: MVVM or Swift's new Observable framework

## API Integration

The iOS app will consume the REST API at `/apps/api`. Key endpoints:

- Authentication: `/api/auth/login`, `/api/auth/register`
- Watchlist: `/api/watchlist` (GET, POST, DELETE)
- Planning: `/api/plan/generate`

## Swift Models

Consider using tools like [quicktype](https://quicktype.io) to generate Swift models from the TypeScript types in `/packages/types`. This ensures type consistency between the API and iOS client.

Example workflow:

1. Export TypeScript types to JSON schema
2. Generate Swift Codable models with quicktype
3. Use generated models in API client

## Next Steps

1. **Create Xcode Project**: Initialize SwiftUI app with proper bundle ID
2. **Setup API Client**: Create networking layer with generated models
3. **Core Features**: Implement watchlist management and planning views
4. **Authentication**: Add secure token storage with Keychain
5. **Push Notifications**: Setup for subscription reminders
6. **Testing**: Add unit tests for business logic and UI tests

## Development Setup

When ready to start iOS development:

1. Ensure the API is running (`npm run dev:api`)
2. Create new iOS project in this directory
3. Configure API base URL for local development (`http://localhost:4000/api`)
4. Generate Swift models from `/packages/types`

See the main project README and CLAUDE.md for full context.
