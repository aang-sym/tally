# UserSubscription


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [optional] [default to undefined]
**service_id** | **string** |  | [optional] [default to undefined]
**monthly_cost** | **number** |  | [optional] [default to undefined]
**is_active** | **boolean** |  | [optional] [default to undefined]
**started_date** | **string** |  | [optional] [default to undefined]
**ended_date** | **string** |  | [optional] [default to undefined]
**tier** | **string** |  | [optional] [default to undefined]
**service** | [**StreamingServiceSummary**](StreamingServiceSummary.md) |  | [optional] [default to undefined]

## Example

```typescript
import { UserSubscription } from './api';

const instance: UserSubscription = {
    id,
    service_id,
    monthly_cost,
    is_active,
    started_date,
    ended_date,
    tier,
    service,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
