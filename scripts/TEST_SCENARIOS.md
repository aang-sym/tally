# Streaming API Test Scenarios

This document outlines safe testing procedures for the Streaming Availability API with your limited 1000 calls/month quota.

## Quick Start

```bash
# 1. Set up conservative testing environment
cp .env.example .env
# Edit .env with your API key and set STREAMING_API_MONTHLY_LIMIT=20

# 2. Start the API server
npm run dev

# 3. Run the testing suite
./scripts/test-streaming-api.sh

# 4. Monitor quota in real-time (separate terminal)
./scripts/quota-monitor.sh watch
```

## Testing Scripts

### `/scripts/test-streaming-api.sh`
Interactive testing suite with guided phases:
- **Phase 1**: Baseline setup (0 calls)  
- **Phase 2**: Single API call testing (2-4 calls)
- **Phase 3**: Edge case testing (2-4 calls)
- **Phase 4**: Integration testing (cached)
- **Phase 5**: Quota safety testing

### `/scripts/quota-monitor.sh`
Quota monitoring utilities:
```bash
./scripts/quota-monitor.sh          # Check quota once
./scripts/quota-monitor.sh watch    # Continuous monitoring  
./scripts/quota-monitor.sh reset    # Reset quota (dev only)
./scripts/quota-monitor.sh clear-cache  # Clear API cache
```

## Manual Testing Scenarios

### Scenario 1: Basic Watchlist Addition (2 API calls)

**Expected API Calls**: Search (1) + GetAvailability (1) = 2 calls

```bash
# Check quota before
./scripts/quota-monitor.sh

# Add item to watchlist  
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "test-1",
    "title": "Stranger Things",
    "serviceId": "netflix", 
    "serviceName": "Netflix",
    "type": "series"
  }'

# Check quota after
./scripts/quota-monitor.sh
```

### Scenario 2: Cache Verification (0 API calls)

**Expected API Calls**: 0 (should use cache)

```bash
# Add same show again - should use cached search results
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "test-2", 
    "title": "Stranger Things",
    "serviceId": "hulu",
    "serviceName": "Hulu", 
    "type": "series"
  }'

# Quota should NOT increase
./scripts/quota-monitor.sh
```

### Scenario 3: Non-existent Content (1-2 API calls)

**Expected API Calls**: Search (1), possibly GetAvailability (0-1)

```bash
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_testuser" \
  -H "Content-Type: application/json" \
  -d '{
    "titleId": "test-fake",
    "title": "This Show Does Not Exist 12345",
    "serviceId": "netflix",
    "serviceName": "Netflix",
    "type": "series"
  }'
```

### Scenario 4: Refresh Availability (1 API call)

**Expected API Calls**: GetAvailability (1)

```bash
# Get watchlist to find an item ID
curl -H "Authorization: Bearer stub_token_testuser" \
  http://localhost:3001/api/watchlist

# Refresh specific item (replace ITEM_ID)
curl -X PUT http://localhost:3001/api/watchlist/ITEM_ID/refresh \
  -H "Authorization: Bearer stub_token_testuser"
```

### Scenario 5: Plan Generation (0 API calls)

**Expected API Calls**: 0 (uses cached/stored data)

```bash
curl -X POST http://localhost:3001/api/plan/generate \
  -H "Authorization: Bearer stub_token_testuser"
```

### Scenario 6: Quota Exhaustion Testing

```bash
# 1. Note current quota usage
./scripts/quota-monitor.sh

# 2. Set limit to current usage + 1
# Edit .env: STREAMING_API_MONTHLY_LIMIT=X (where X = current usage + 1)

# 3. Restart server
npm run dev

# 4. Try to add watchlist item - should get 429 error
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_testuser" \
  -H "Content-Type: application/json" \
  -d '{"titleId":"test","title":"Test Show","serviceId":"netflix","serviceName":"Netflix"}'

# Expected response: 
# {"error":"QUOTA_EXHAUSTED","message":"Monthly API quota exhausted..."}
```

## Development Mode Testing

### Enable Development Mode (0 API calls)
```bash
# Set in .env
STREAMING_API_DEV_MODE=true

# Restart server - all API calls will be mocked
npm run dev

# Add watchlist items - no quota consumption
curl -X POST http://localhost:3001/api/watchlist \
  -H "Authorization: Bearer stub_token_testuser" \
  -H "Content-Type: application/json" \
  -d '{"titleId":"dev-test","title":"Any Show","serviceId":"netflix","serviceName":"Netflix"}'
```

## API Call Budget Planning

For the **1000 calls/month free tier** with **950 safe limit**:

### Conservative Testing (50 calls):
- 10 different show searches = 20 calls
- 5 refresh operations = 5 calls  
- 10 edge case tests = 15 calls
- 5 integration tests = 5 calls
- 5 error scenario tests = 5 calls
- **Total: ~50 calls**

### Extensive Testing (200 calls):
- 25 different shows = 50 calls
- 20 refresh operations = 20 calls
- Various service combinations = 50 calls
- Edge cases and errors = 30 calls
- Integration and frontend testing = 50 calls
- **Total: ~200 calls**

## Safety Tips

1. **Always start with low limits** (`STREAMING_API_MONTHLY_LIMIT=20`)
2. **Monitor quota continuously** with `quota-monitor.sh watch`
3. **Use development mode** for UI/frontend work
4. **Clear cache between tests** if needed
5. **Reset quota** during development: `./scripts/quota-monitor.sh reset`
6. **Test caching first** - most operations should use cached data

## Expected API Usage Patterns

| Operation | API Calls | Notes |
|-----------|-----------|--------|
| Add new show to watchlist | 2 | Search + GetAvailability |
| Add same show again | 0 | Uses cached search |
| Refresh availability | 1 | GetAvailability only |
| Get watchlist | 0 | Local data |
| Generate plan | 0 | Uses stored watchlist data |
| Get leaving soon | 0 | Uses stored availability data |

Remember: **Caching is your friend!** Most operations after the initial API calls should consume 0 quota.