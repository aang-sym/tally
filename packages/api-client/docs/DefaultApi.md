# DefaultApi

All URIs are relative to *http://localhost:4000*

|Method | HTTP request | Description|
|------------- | ------------- | -------------|
|[**apiStreamingServicesGet**](#apistreamingservicesget) | **GET** /api/streaming-services | List streaming services|
|[**apiStreamingServicesIdGet**](#apistreamingservicesidget) | **GET** /api/streaming-services/{id} | Get a streaming service by id|
|[**apiStreamingServicesPopularGet**](#apistreamingservicespopularget) | **GET** /api/streaming-services/popular | List most popular services by active subscriptions|
|[**apiStreamingServicesRegionsGet**](#apistreamingservicesregionsget) | **GET** /api/streaming-services/regions | List common regions|
|[**apiUsersIdSubscriptionsGet**](#apiusersidsubscriptionsget) | **GET** /api/users/{id}/subscriptions | List a user\&#39;s subscriptions|
|[**apiUsersIdSubscriptionsPost**](#apiusersidsubscriptionspost) | **POST** /api/users/{id}/subscriptions | Add (or upsert) a subscription|
|[**apiUsersIdSubscriptionsSubscriptionIdDelete**](#apiusersidsubscriptionssubscriptioniddelete) | **DELETE** /api/users/{id}/subscriptions/{subscriptionId} | Remove (deactivate or delete) a subscription|
|[**apiUsersIdSubscriptionsSubscriptionIdPut**](#apiusersidsubscriptionssubscriptionidput) | **PUT** /api/users/{id}/subscriptions/{subscriptionId} | Update a subscription|
|[**apiWatchlistGet**](#apiwatchlistget) | **GET** /api/watchlist | Get user\&#39;s watchlist|
|[**apiWatchlistIdBufferPut**](#apiwatchlistidbufferput) | **PUT** /api/watchlist/{id}/buffer | Update buffer days for a show|
|[**apiWatchlistIdCountryPut**](#apiwatchlistidcountryput) | **PUT** /api/watchlist/{id}/country | Update per-show country override|
|[**apiWatchlistIdDelete**](#apiwatchlistiddelete) | **DELETE** /api/watchlist/{id} | Remove show from watchlist|
|[**apiWatchlistIdNotesPut**](#apiwatchlistidnotesput) | **PUT** /api/watchlist/{id}/notes | Update show notes|
|[**apiWatchlistIdProviderPut**](#apiwatchlistidproviderput) | **PUT** /api/watchlist/{id}/provider | Update selected streaming provider for the user\&#39;s show|
|[**apiWatchlistIdRatingPut**](#apiwatchlistidratingput) | **PUT** /api/watchlist/{id}/rating | Rate a show|
|[**apiWatchlistIdStatusPut**](#apiwatchlistidstatusput) | **PUT** /api/watchlist/{id}/status | Update a show\&#39;s status|
|[**apiWatchlistPost**](#apiwatchlistpost) | **POST** /api/watchlist | Add a show to the user\&#39;s watchlist|
|[**apiWatchlistStatsGet**](#apiwatchliststatsget) | **GET** /api/watchlist/stats | Get user\&#39;s watchlist statistics|
|[**apiWatchlistTmdbIdProgressGet**](#apiwatchlisttmdbidprogressget) | **GET** /api/watchlist/{tmdbId}/progress | Get user\&#39;s episode progress for a show (by TMDB ID)|
|[**apiWatchlistTmdbIdProgressPut**](#apiwatchlisttmdbidprogressput) | **PUT** /api/watchlist/{tmdbId}/progress | Set episode progress up to an episode (inclusive) for a show (by TMDB ID)|
|[**apiWatchlistWatchingGet**](#apiwatchlistwatchingget) | **GET** /api/watchlist/watching | List currently watching shows|
|[**apiWatchlistWatchingShowIdGet**](#apiwatchlistwatchingshowidget) | **GET** /api/watchlist/watching/{showId} | Get detailed progress for a specific show (by internal show id)|
|[**watchlistSearchAndAdd**](#watchlistsearchandadd) | **POST** /api/watchlist/search-and-add | Search TMDB and add a show in one request|

# **apiStreamingServicesGet**
> ServicesResponse apiStreamingServicesGet()

Returns streaming services with price tiers for a given country. If `country` is omitted, the server falls back to the authenticated user\'s `users.country_code`, then \'US\'. 

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let country: string; //ISO 3166-1 alpha-2 country code (e.g., AU, US) (optional) (default to undefined)

const { status, data } = await apiInstance.apiStreamingServicesGet(
    country
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **country** | [**string**] | ISO 3166-1 alpha-2 country code (e.g., AU, US) | (optional) defaults to undefined|


### Return type

**ServicesResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiStreamingServicesIdGet**
> ServiceResponse apiStreamingServicesIdGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; // (default to undefined)

const { status, data } = await apiInstance.apiStreamingServicesIdGet(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] |  | defaults to undefined|


### Return type

**ServiceResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiStreamingServicesPopularGet**
> PopularServicesResponse apiStreamingServicesPopularGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiStreamingServicesPopularGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**PopularServicesResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiStreamingServicesRegionsGet**
> RegionsResponse apiStreamingServicesRegionsGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiStreamingServicesRegionsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**RegionsResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiUsersIdSubscriptionsGet**
> SubscriptionsResponse apiUsersIdSubscriptionsGet()

Returns the user\'s active/inactive subscriptions. Prices/tiers in the embedded service object are filtered by `country`. If `country` is omitted server-side may fall back to `users.country_code`, then \'US\'. 

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User UUID (default to undefined)
let country: string; //ISO 3166-1 alpha-2 country code (e.g., AU, US). (optional) (default to undefined)

const { status, data } = await apiInstance.apiUsersIdSubscriptionsGet(
    id,
    country
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | User UUID | defaults to undefined|
| **country** | [**string**] | ISO 3166-1 alpha-2 country code (e.g., AU, US). | (optional) defaults to undefined|


### Return type

**SubscriptionsResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Subscriptions retrieved |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiUsersIdSubscriptionsPost**
> SubscriptionResponse apiUsersIdSubscriptionsPost(subscriptionCreateRequest)

Creates a new subscription for the user; if one already exists for the service, updates it. `tier` is optional; when provided, it is stored alongside the subscription. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SubscriptionCreateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User UUID (default to undefined)
let subscriptionCreateRequest: SubscriptionCreateRequest; //

const { status, data } = await apiInstance.apiUsersIdSubscriptionsPost(
    id,
    subscriptionCreateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **subscriptionCreateRequest** | **SubscriptionCreateRequest**|  | |
| **id** | [**string**] | User UUID | defaults to undefined|


### Return type

**SubscriptionResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Upserted subscription |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiUsersIdSubscriptionsSubscriptionIdDelete**
> apiUsersIdSubscriptionsSubscriptionIdDelete()

Deletes or marks the subscription inactive (implementation-defined). Client should treat as removed. 

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User UUID (default to undefined)
let subscriptionId: string; //Subscription UUID (default to undefined)

const { status, data } = await apiInstance.apiUsersIdSubscriptionsSubscriptionIdDelete(
    id,
    subscriptionId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | User UUID | defaults to undefined|
| **subscriptionId** | [**string**] | Subscription UUID | defaults to undefined|


### Return type

void (empty response body)

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**204** | Deleted |  -  |
|**401** | Unauthorized |  -  |
|**404** | Resource not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiUsersIdSubscriptionsSubscriptionIdPut**
> SubscriptionResponse apiUsersIdSubscriptionsSubscriptionIdPut(subscriptionUpdateRequest)

Partial update; any of `monthly_cost`, `is_active`, or `tier` may be provided. Supports **tier-only** updates for quick UI changes. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    SubscriptionUpdateRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User UUID (default to undefined)
let subscriptionId: string; //Subscription UUID (default to undefined)
let subscriptionUpdateRequest: SubscriptionUpdateRequest; //

const { status, data } = await apiInstance.apiUsersIdSubscriptionsSubscriptionIdPut(
    id,
    subscriptionId,
    subscriptionUpdateRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **subscriptionUpdateRequest** | **SubscriptionUpdateRequest**|  | |
| **id** | [**string**] | User UUID | defaults to undefined|
| **subscriptionId** | [**string**] | Subscription UUID | defaults to undefined|


### Return type

**SubscriptionResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated subscription |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Resource not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistGet**
> WatchlistListResponse apiWatchlistGet()

Returns the user\'s watchlist with normalized show details and selected streaming provider. Optional `status` query filters by watchlist status. 

### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let status: 'watchlist' | 'watching' | 'completed' | 'dropped' | 'all'; // (optional) (default to 'all')

const { status, data } = await apiInstance.apiWatchlistGet(
    status
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **status** | [**&#39;watchlist&#39; | &#39;watching&#39; | &#39;completed&#39; | &#39;dropped&#39; | &#39;all&#39;**]**Array<&#39;watchlist&#39; &#124; &#39;watching&#39; &#124; &#39;completed&#39; &#124; &#39;dropped&#39; &#124; &#39;all&#39;>** |  | (optional) defaults to 'all'|


### Return type

**WatchlistListResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdBufferPut**
> UpdateBufferResponse apiWatchlistIdBufferPut(apiWatchlistIdBufferPutRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdBufferPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdBufferPutRequest: ApiWatchlistIdBufferPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdBufferPut(
    id,
    apiWatchlistIdBufferPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdBufferPutRequest** | **ApiWatchlistIdBufferPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**UpdateBufferResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdCountryPut**
> UpdateCountryResponse apiWatchlistIdCountryPut(apiWatchlistIdCountryPutRequest)

Set a per-show `countryCode` (e.g., AU) or clear it with `null`. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdCountryPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdCountryPutRequest: ApiWatchlistIdCountryPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdCountryPut(
    id,
    apiWatchlistIdCountryPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdCountryPutRequest** | **ApiWatchlistIdCountryPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**UpdateCountryResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdDelete**
> ApiWatchlistIdDelete200Response apiWatchlistIdDelete()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)

const { status, data } = await apiInstance.apiWatchlistIdDelete(
    id
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**ApiWatchlistIdDelete200Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Removed |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdNotesPut**
> UpdateNotesResponse apiWatchlistIdNotesPut(apiWatchlistIdNotesPutRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdNotesPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdNotesPutRequest: ApiWatchlistIdNotesPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdNotesPut(
    id,
    apiWatchlistIdNotesPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdNotesPutRequest** | **ApiWatchlistIdNotesPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**UpdateNotesResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdProviderPut**
> UpdateProviderResponse apiWatchlistIdProviderPut(apiWatchlistIdProviderPutRequest)

Set or clear (`null`) the provider. Expects `{ id, name, logo_path }` when not null. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdProviderPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdProviderPutRequest: ApiWatchlistIdProviderPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdProviderPut(
    id,
    apiWatchlistIdProviderPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdProviderPutRequest** | **ApiWatchlistIdProviderPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**UpdateProviderResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdRatingPut**
> RateShowResponse apiWatchlistIdRatingPut(apiWatchlistIdRatingPutRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdRatingPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdRatingPutRequest: ApiWatchlistIdRatingPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdRatingPut(
    id,
    apiWatchlistIdRatingPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdRatingPutRequest** | **ApiWatchlistIdRatingPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**RateShowResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Rated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistIdStatusPut**
> UserShowStatusResponse apiWatchlistIdStatusPut(apiWatchlistIdStatusPutRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistIdStatusPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let id: string; //User show id (UUID) (default to undefined)
let apiWatchlistIdStatusPutRequest: ApiWatchlistIdStatusPutRequest; //

const { status, data } = await apiInstance.apiWatchlistIdStatusPut(
    id,
    apiWatchlistIdStatusPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistIdStatusPutRequest** | **ApiWatchlistIdStatusPutRequest**|  | |
| **id** | [**string**] | User show id (UUID) | defaults to undefined|


### Return type

**UserShowStatusResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistPost**
> AddWatchlistResponse apiWatchlistPost(apiWatchlistPostRequest)

Adds a show (by TMDB ID) to the user\'s watchlist; status defaults to `watchlist`. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistPostRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let apiWatchlistPostRequest: ApiWatchlistPostRequest; //

const { status, data } = await apiInstance.apiWatchlistPost(
    apiWatchlistPostRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistPostRequest** | **ApiWatchlistPostRequest**|  | |


### Return type

**AddWatchlistResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistStatsGet**
> WatchlistStatsResponse apiWatchlistStatsGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiWatchlistStatsGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WatchlistStatsResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistTmdbIdProgressGet**
> ShowProgressMapResponse apiWatchlistTmdbIdProgressGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tmdbId: number; // (default to undefined)

const { status, data } = await apiInstance.apiWatchlistTmdbIdProgressGet(
    tmdbId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **tmdbId** | [**number**] |  | defaults to undefined|


### Return type

**ShowProgressMapResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistTmdbIdProgressPut**
> ProgressUpdateResponse apiWatchlistTmdbIdProgressPut(apiWatchlistTmdbIdProgressPutRequest)

Sets progress for all episodes up to (and including) the specified episode. 

### Example

```typescript
import {
    DefaultApi,
    Configuration,
    ApiWatchlistTmdbIdProgressPutRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let tmdbId: number; // (default to undefined)
let apiWatchlistTmdbIdProgressPutRequest: ApiWatchlistTmdbIdProgressPutRequest; //

const { status, data } = await apiInstance.apiWatchlistTmdbIdProgressPut(
    tmdbId,
    apiWatchlistTmdbIdProgressPutRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **apiWatchlistTmdbIdProgressPutRequest** | **ApiWatchlistTmdbIdProgressPutRequest**|  | |
| **tmdbId** | [**number**] |  | defaults to undefined|


### Return type

**ProgressUpdateResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | Updated |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistWatchingGet**
> WatchingListResponse apiWatchlistWatchingGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

const { status, data } = await apiInstance.apiWatchlistWatchingGet();
```

### Parameters
This endpoint does not have any parameters.


### Return type

**WatchingListResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **apiWatchlistWatchingShowIdGet**
> ShowProgressDetailResponse apiWatchlistWatchingShowIdGet()


### Example

```typescript
import {
    DefaultApi,
    Configuration
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let showId: string; // (default to undefined)

const { status, data } = await apiInstance.apiWatchlistWatchingShowIdGet(
    showId
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **showId** | [**string**] |  | defaults to undefined|


### Return type

**ShowProgressDetailResponse**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: Not defined
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**200** | OK |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

# **watchlistSearchAndAdd**
> WatchlistSearchAndAdd201Response watchlistSearchAndAdd(watchlistSearchAndAddRequest)


### Example

```typescript
import {
    DefaultApi,
    Configuration,
    WatchlistSearchAndAddRequest
} from './api';

const configuration = new Configuration();
const apiInstance = new DefaultApi(configuration);

let watchlistSearchAndAddRequest: WatchlistSearchAndAddRequest; //

const { status, data } = await apiInstance.watchlistSearchAndAdd(
    watchlistSearchAndAddRequest
);
```

### Parameters

|Name | Type | Description  | Notes|
|------------- | ------------- | ------------- | -------------|
| **watchlistSearchAndAddRequest** | **WatchlistSearchAndAddRequest**|  | |


### Return type

**WatchlistSearchAndAdd201Response**

### Authorization

[bearerAuth](../README.md#bearerAuth)

### HTTP request headers

 - **Content-Type**: application/json
 - **Accept**: application/json


### HTTP response details
| Status code | Description | Response headers |
|-------------|-------------|------------------|
|**201** | Created |  -  |
|**400** | Bad request |  -  |
|**401** | Unauthorized |  -  |
|**404** | Not found |  -  |
|**500** | Server error |  -  |

[[Back to top]](#) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to Model list]](../README.md#documentation-for-models) [[Back to README]](../README.md)

