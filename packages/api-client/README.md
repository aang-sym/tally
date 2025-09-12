# @tally/api-client

TypeScript API client for Tally, auto-generated from the OpenAPI 3.0.3 specification.

This client provides fully-typed access to all Tally API endpoints with built-in JWT authentication and RLS (Row-Level Security) compliance.

## Installation

```bash
npm install @tally/api-client
```

## Quick Start

```typescript
import { WatchlistApi, Configuration } from '@tally/api-client';

// Configure with JWT authentication
const config = new Configuration({
  basePath: 'http://localhost:4000', // or your API base URL
  accessToken: 'your-jwt-token', // Bearer token from authentication
});

const watchlistApi = new WatchlistApi(config);

// Get user's watchlist (automatically RLS-filtered)
const response = await watchlistApi.apiWatchlistGet();
console.log(response.data.data.shows); // User's shows only

// Get user statistics
const stats = await watchlistApi.apiWatchlistStatsGet();
console.log(stats.data.data); // { totalShows, byStatus, averageRating }

// Update show status
await watchlistApi.apiWatchlistUserShowIdStatusPut('show-uuid', { status: 'completed' });
```

## Features

- **🔒 Security First**: Built-in JWT authentication with Bearer token support
- **🎯 RLS Compliance**: All user-scoped endpoints automatically enforce Row-Level Security
- **📝 Fully Typed**: Complete TypeScript definitions for all API endpoints and models
- **🔄 Auto-Generated**: Stays in sync with the latest OpenAPI specification
- **⚡ Modern**: Uses Axios with Promise-based API

## Authentication

All user-scoped endpoints require JWT authentication. The client automatically includes the Bearer token in all requests.

### Getting a Test Token

For development, you can generate a test token:

```bash
cd apps/api
node src/utils/generate-test-token.js
```

### Configuration Options

```typescript
const config = new Configuration({
  basePath: 'https://api.tally.app',
  accessToken: 'your-jwt-token',
  // Optional: custom axios config
  baseOptions: {
    timeout: 10000,
    headers: {
      'Custom-Header': 'value',
    },
  },
});
```

## Available APIs

### WatchlistApi

- `apiWatchlistGet()` - Get user's watchlist with shows and metadata
- `apiWatchlistStatsGet()` - Get user's watchlist statistics and aggregations
- `apiWatchlistUserShowIdStatusPut()` - Update show watch status
- `apiWatchlistUserShowIdRatingPut()` - Update show rating
- `apiWatchlistUserShowIdProviderPut()` - Update streaming provider
- `apiWatchlistTmdbIdProgressPut()` - Update episode watch progress

## Error Handling

The client includes proper error handling for common scenarios:

```typescript
try {
  const watchlist = await watchlistApi.apiWatchlistGet();
  console.log(watchlist.data);
} catch (error) {
  if (error.response?.status === 401) {
    console.error('Authentication required');
  } else if (error.response?.status === 403) {
    console.error('Access denied by RLS policy');
  } else {
    console.error('API error:', error.message);
  }
}
```

## Common Response Format

All API responses follow a consistent format:

```typescript
{
  success: boolean;
  data?: any;        // Present on successful responses
  error?: string;    // Present on error responses
}
```

## Development

This client is auto-generated from the OpenAPI specification. Do not edit the generated files directly.

To regenerate the client:

```bash
pnpm run client:regen
```

## Security & RLS

All user-scoped endpoints are protected by Row-Level Security (RLS) policies that ensure:

- ✅ Users can only access their own data
- ✅ Authentication is required for protected endpoints
- ✅ Cross-user data access is prevented
- ✅ Database-level security enforcement

## API Documentation

- **Live OpenAPI Spec**: [http://localhost:4000/openapi.json](http://localhost:4000/openapi.json)
- **Interactive Docs**: [http://localhost:4000/docs](http://localhost:4000/docs)

## License

MIT
