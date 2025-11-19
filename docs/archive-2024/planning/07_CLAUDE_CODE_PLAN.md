# Episode Selection & Dynamic Button States Implementation

## Overview

This document outlines the implementation of advanced episode selection functionality and dynamic button states for the Tally streaming management application. The goal is to create a seamless user experience where episode interactions from search results mirror the behavior found in "My Shows", with intelligent visual feedback and button state management.

## Current Issues Addressed

### 1. Episode Click Failures from Search

- **Problem**: Console errors when clicking episodes from search results
- **Root Cause**: API endpoint inconsistencies and error handling gaps
- **Impact**: Users cannot set episode progress directly from search

### 2. Missing Visual Feedback

- **Problem**: No indication of watched vs unwatched episodes
- **Root Cause**: Lack of episode state tracking and visual styling system
- **Impact**: Users have no visual cue about their progress

### 3. Static Button States

- **Problem**: Buttons don't reflect current watchlist status
- **Root Cause**: No real-time watchlist status detection
- **Impact**: Confusing UX where users can re-add already-added shows

## Implementation Strategy

### Phase 1: API Reliability & Episode Click Fix

#### 1.1 Debug Episode Click Handler

```typescript
// Fixed API call sequence
const handleEpisodeClick = async (episode) => {
  try {
    // 1. Add to watchlist first
    const watchlistResponse = await addToWatchlist(selectedShow, 'watching');

    // 2. Then set episode progress
    const progressResponse = await setEpisodeProgress(
      selectedShow.id,
      episode.seasonNumber,
      episode.number
    );

    // 3. Update local state to reflect changes
    updateLocalWatchlistStatus();
    updateEpisodeVisualStates();
  } catch (error) {
    // Proper error handling with user feedback
    showErrorNotification(error.message);
  }
};
```

#### 1.2 API Endpoint Standardization

- Use `/api/watchlist-v2/:tmdbId/progress` consistently
- Implement proper error handling and retry logic
- Add comprehensive logging for debugging

### Phase 2: Visual Episode State System

#### 2.1 Episode State Definitions

```typescript
enum EpisodeState {
  UNWATCHED = 'unwatched', // Default state, clickable
  WATCHED = 'watched', // Green background + ✓ tick
  CURRENT = 'current', // Blue highlight (next to watch)
  FUTURE = 'future', // Greyed out, disabled
}
```

#### 2.2 Visual Styling Implementation

```css
.episode-watched {
  @apply bg-green-50 border-green-200 text-green-800;
}

.episode-watched::after {
  content: '✓';
  @apply ml-2 text-green-600 font-bold;
}

.episode-current {
  @apply bg-blue-50 border-blue-200 ring-2 ring-blue-100;
}

.episode-future {
  @apply bg-gray-100 border-gray-200 opacity-60 pointer-events-none;
}
```

### Phase 3: Dynamic Button State System

#### 3.1 Button State Logic

```typescript
interface ButtonState {
  isInWatchlist: boolean;
  isWatching: boolean;
  isLoading: boolean;
}

const renderActionButtons = ({ isInWatchlist, isWatching, isLoading }: ButtonState) => {
  if (isLoading) {
    return <LoadingButton />;
  }

  if (isInWatchlist || isWatching) {
    return (
      <WatchingButton
        onRemove={() => removeFromWatchlist(selectedShow.id)}
        className="w-full bg-green-600 hover:bg-green-700"
      >
        ✓ Watching
      </WatchingButton>
    );
  }

  return (
    <DualActionButtons>
      <AddToWatchlistButton />
      <StartWatchingButton />
    </DualActionButtons>
  );
};
```

#### 3.2 Watchlist Status Detection

```typescript
const useWatchlistStatus = (tmdbId: number) => {
  const [status, setStatus] = useState({
    isInWatchlist: false,
    isWatching: false,
    loading: true,
  });

  useEffect(() => {
    checkWatchlistStatus(tmdbId).then(setStatus);
  }, [tmdbId]);

  return status;
};
```

### Phase 4: Cross-Page Consistency

#### 4.1 Shared Episode Logic

Extract common episode handling logic into reusable utilities:

```typescript
// utils/episodeUtils.ts
export const markEpisodeAsWatched = async (tmdbId, seasonNumber, episodeNumber) => {
  // Unified logic for marking episodes across all pages
};

export const calculateEpisodeState = (episode, userProgress) => {
  // Consistent episode state calculation
};
```

#### 4.2 Real-time State Synchronization

- Update episode states immediately after actions
- Sync changes between Search and My Shows views
- Implement optimistic UI updates with error rollback

## Component Architecture

### New Components Created

1. **EpisodeStateManager**: Centralized episode state logic
2. **WatchlistActions**: Dynamic button rendering component
3. **EpisodeProgressIndicator**: Visual episode state component
4. **WatchlistStatusProvider**: Context for watchlist state

### Modified Components

1. **SearchShows.tsx**: Enhanced with dynamic buttons and episode tracking
2. **PatternAnalysis.tsx**: Added visual episode states and click handling
3. **MyShows.tsx**: Extracted shared logic to utilities

## API Requirements

### Endpoints Used

- `POST /api/tmdb/watchlist` - Add show to watchlist
- `PUT /api/watchlist-v2/:tmdbId/progress` - Set episode progress
- `DELETE /api/watchlist-v2/:tmdbId` - Remove from watchlist
- `GET /api/watchlist-v2/:tmdbId/status` - Check watchlist status

### Error Handling Strategy

- Network failures: Show retry button
- API errors: Display user-friendly error messages
- Validation errors: Highlight problematic fields
- Timeout errors: Implement automatic retry with backoff

## User Experience Flow

### Episode Selection from Search

1. User searches for show → sees episodes in timeline
2. User clicks desired episode
3. System adds show to "Watching" status
4. System marks clicked episode + all previous as watched
5. Episodes turn green with ✓ ticks immediately
6. Buttons change to single "Watching" state
7. Success notification appears

### Button State Transitions

```
Initial State: [Add to Watchlist] [Start Watching]
        ↓ (click either button or episode)
Active State: [✓ Watching (full width)]
        ↓ (click "Watching" button)
Confirm Remove: [Cancel] [Remove from Watchlist]
        ↓ (confirm removal)
Initial State: [Add to Watchlist] [Start Watching]
```

## Testing Strategy

### Functional Tests

- Episode clicking from search sets correct progress
- Visual states update immediately and correctly
- Button states reflect actual watchlist status
- Remove functionality works without errors

### Integration Tests

- Search episode actions sync with My Shows
- API failures are handled gracefully
- Multiple rapid clicks don't cause race conditions
- Cross-browser compatibility for visual states

### User Acceptance Tests

- Users can intuitively understand episode states
- Button state changes feel natural and responsive
- Error messages are clear and actionable
- Performance remains smooth with many episodes

## Performance Considerations

### Optimization Strategies

- Debounce rapid episode clicks
- Cache watchlist status to avoid repeated API calls
- Use optimistic UI updates for immediate feedback
- Lazy load episode details for better performance

### Memory Management

- Clean up event listeners on component unmount
- Avoid memory leaks in episode state tracking
- Implement proper cleanup for API call cancellation

## Future Enhancements

### Planned Features

- Bulk episode marking (mark entire season as watched)
- Episode notes and personal ratings
- Watch history with timestamps
- Cross-device synchronization

### Technical Debt

- Migrate to React Query for better API state management
- Implement proper TypeScript typing for all episode interfaces
- Add comprehensive error boundary components
- Create automated visual regression tests

## Conclusion

This implementation creates a cohesive, intuitive episode selection system that significantly improves the user experience. The combination of visual feedback, dynamic button states, and reliable API interactions makes it easy for users to manage their viewing progress directly from search results, eliminating unnecessary navigation steps while maintaining consistency across the application.

The modular architecture ensures maintainability and extensibility for future features, while the comprehensive testing strategy ensures reliability and user satisfaction.
