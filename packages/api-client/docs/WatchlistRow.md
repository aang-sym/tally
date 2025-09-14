# WatchlistRow

## Properties

| Name                   | Type                                        | Description | Notes                             |
| ---------------------- | ------------------------------------------- | ----------- | --------------------------------- |
| **id**                 | **string**                                  |             | [optional] [default to undefined] |
| **status**             | **string**                                  |             | [optional] [default to undefined] |
| **show**               | [**ShowSummary**](ShowSummary.md)           |             | [optional] [default to undefined] |
| **streaming_provider** | [**SelectedProvider**](SelectedProvider.md) |             | [optional] [default to undefined] |

## Example

```typescript
import { WatchlistRow } from './api';

const instance: WatchlistRow = {
  id,
  status,
  show,
  streaming_provider,
};
```

[[Back to Model list]](../README.md#documentation-for-models) [[Back to API list]](../README.md#documentation-for-api-endpoints) [[Back to README]](../README.md)
