# Service


## Properties

Name | Type | Description | Notes
------------ | ------------- | ------------- | -------------
**id** | **string** |  | [optional] [default to undefined]
**tmdb_provider_id** | **number** |  | [optional] [default to undefined]
**name** | **string** |  | [optional] [default to undefined]
**logo_path** | **string** |  | [optional] [default to undefined]
**homepage** | **string** |  | [optional] [default to undefined]
**prices** | [**Array&lt;SchemasPriceTier&gt;**](SchemasPriceTier.md) |  | [optional] [default to undefined]
**default_price** | [**SchemasPriceTier**](SchemasPriceTier.md) |  | [optional] [default to undefined]

## Example

```typescript
import { Service } from './api';

const instance: Service = {
    id,
    tmdb_provider_id,
    name,
    logo_path,
    homepage,
    prices,
    default_price,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
