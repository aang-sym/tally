# Streaming API Quota Management

This document explains how Tally manages API quota for the Streaming Availability API to stay within the 1000 calls/month free tier limit.

## Configuration

### Environment Variables

```bash
# Your RapidAPI key for Streaming Availability API
STREAMING_AVAILABILITY_API_KEY=your_rapidapi_key_here

# Monthly API call limit (default: 950 to leave buffer)
STREAMING_API_MONTHLY_LIMIT=950

# Development mode - mocks API calls even with real key
STREAMING_API_DEV_MODE=false
```

### Development Modes

1. **Development Mode (`STREAMING_API_DEV_MODE=true`)**
   - All API calls are mocked
   - No quota consumption
   - Perfect for development and testing

2. **Production Mode (`STREAMING_API_DEV_MODE=false`)**
   - Real API calls with quota tracking
   - Automatic quota enforcement
   - Low quota warnings

## Quota Management Features

### 📊 Automatic Tracking
- Tracks API calls per month with automatic reset
- Persistent storage in `streaming-api-quota.json`
- Detailed call logging with success/failure status

### 🚨 Quota Protection
- Pre-flight quota checking before each API call
- Automatic rejection when quota exhausted
- Low quota warnings (when < 10% or 50 calls remaining)

### 💾 Aggressive Caching
- **Search results**: Cached for 24 hours
- **Show details**: Cached for 24 hours
- **Leaving soon**: Cached for 6 hours
- **Newly added**: Cached for 12 hours

### 🎯 Smart API Usage
- Skips availability check if search returns no results
- Only enhances watchlist items when not in dev mode
- Batch operations to minimize redundant calls

## API Endpoints

### Get Quota Status
```bash
GET /api/streaming-quota
```

Response:
```json
{
  "month": "2025-08",
  "callsUsed": 42,
  "callsRemaining": 908,
  "limit": 950,
  "percentUsed": 4.4,
  "lastReset": "2025-08-01T00:00:00.000Z",
  "isLowQuota": false,
  "devMode": false,
  "hasApiKey": true,
  "cacheStats": {
    "size": 15,
    "entries": ["search:...", "getShow:..."]
  }
}
```

### Get Call Log
```bash
GET /api/streaming-quota/log?limit=20
```

### Reset Quota (Development Only)
```bash
POST /api/streaming-quota/reset
```

### Clear Cache
```bash
POST /api/streaming-quota/clear-cache
```

## Usage Recommendations

### For Development
```bash
# Set dev mode to avoid quota consumption
STREAMING_API_DEV_MODE=true
STREAMING_API_MONTHLY_LIMIT=950
```

### For Testing with Real API
```bash
# Use a lower limit for safety during testing
STREAMING_API_DEV_MODE=false
STREAMING_API_MONTHLY_LIMIT=100
```

### For Production
```bash
# Full quota with monitoring
STREAMING_API_DEV_MODE=false
STREAMING_API_MONTHLY_LIMIT=950
NODE_ENV=production
```

## Quota Conservation Strategies

### 1. **Use Development Mode**
Enable `STREAMING_API_DEV_MODE=true` for:
- Local development
- Testing features
- Frontend work
- When API data isn't critical

### 2. **Cache-First Approach**
- Data is cached for hours/days
- Most requests served from cache
- Manual cache clearing available

### 3. **Smart Enhancement**
- Watchlist items only enhanced when necessary
- Search failures don't trigger availability checks
- Quota checked before each API call

### 4. **Monitoring & Alerts**
- Server startup shows quota status
- Console warnings when quota is low
- API returns 429 when quota exhausted

## Error Handling

### Quota Exhausted
```json
{
  "error": "QUOTA_EXHAUSTED",
  "message": "Monthly API quota exhausted. Cannot refresh availability data.",
  "quotaStatus": {
    "canMakeCall": false,
    "remaining": 0,
    "limit": 950
  }
}
```

### Low Quota Warning
```
⚠️  API quota running low: 45/950 calls remaining. Consider enabling dev mode.
```

## Best Practices

1. **Start with Dev Mode**: Always begin development with `STREAMING_API_DEV_MODE=true`
2. **Monitor Usage**: Check `/api/streaming-quota` regularly during testing
3. **Conservative Limits**: Set `STREAMING_API_MONTHLY_LIMIT` below actual API limit
4. **Cache Awareness**: Understand cache TTLs to avoid unexpected API calls
5. **Production Ready**: Only disable dev mode when deploying to production

## File Locations

- **Config**: `/apps/api/src/config/index.ts`
- **Quota Tracker**: `/apps/api/src/services/quota-tracker.ts` 
- **Service Layer**: `/apps/api/src/services/streaming-availability.ts`
- **Quota Data**: `streaming-api-quota.json` (auto-generated)
- **Environment**: `.env` (copy from `.env.example`)

This quota management system ensures you can develop and test Tally without accidentally exhausting your monthly API quota!