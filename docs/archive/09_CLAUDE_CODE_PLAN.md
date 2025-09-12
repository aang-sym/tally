# TV Guide Implementation Plan (Infinite Scrolling)

## Overview

Create an infinite-scrolling TV guide that starts from today's date and can scroll forward indefinitely, showing user's shows in a grid-based calendar layout with streaming services as rows and dates as columns.

## Key Design Changes from Screenshot

- **Infinite horizontal scrolling**: Start from today, load more dates as user scrolls right
- **Dynamic date loading**: Fetch episode data on-demand as new date ranges come into view
- **Virtual scrolling optimization**: Only render visible date columns for performance
- **No fixed week/month limits**: Theoretically endless forward scrolling

## Component Architecture

### 1. Main TV Guide Component (`TVGuide.tsx`)

- Manages infinite scroll state and virtual viewport
- Handles dynamic date range expansion
- Coordinates lazy loading of episode data
- Implements intersection observers for scroll detection

### 2. Virtual Scroll Manager

- Calculates which date columns are currently visible
- Loads/unloads data as user scrolls horizontally
- Maintains buffer zones for smooth scrolling experience
- Handles date column recycling for memory efficiency

### 3. Service Row (`ServiceRow.tsx`)

- Renders show blocks only for visible date range
- Handles dynamic show block positioning
- Manages loading states for new data chunks

### 4. Show Block (`ShowBlock.tsx`)

- Optimized rendering for virtual scrolling
- Dynamic positioning based on episode air dates
- Efficient re-rendering when scrolling

## Data Loading Strategy

### Infinite Date Generation

```typescript
interface DateRange {
  startDate: Date;
  endDate: Date;
  isLoaded: boolean;
  episodes: EpisodeSchedule[];
}

// Load data in chunks (e.g., 30-day segments)
function loadNextDateChunk(currentEndDate: Date): DateRange {
  const start = currentEndDate;
  const end = addDays(start, 30);
  return fetchEpisodesInRange(start, end);
}
```

### Progressive Data Loading

1. **Initial load**: Today + next 30 days
2. **Scroll detection**: When user nears end of loaded range
3. **Chunk loading**: Load next 30-day segment
4. **Background prefetch**: Anticipate user scrolling patterns

## Virtual Scrolling Implementation

### Viewport Management

- Track horizontal scroll position
- Calculate visible date columns (e.g., 7-14 columns visible)
- Maintain buffer zones (render extra 3-5 columns on each side)
- Recycle DOM elements for dates that scroll out of view

### Performance Optimizations

- Only render show blocks for visible date range
- Use `transform: translateX()` for smooth horizontal scrolling
- Debounce scroll events to prevent excessive re-renders
- Implement intersection observer for efficient visibility detection

## Implementation Plan

### Phase 1: Infinite Scroll Infrastructure (4-5 hours)

1. Build virtual scrolling container with horizontal overflow
2. Implement date range management that expands dynamically
3. Create intersection observer for detecting when to load more data
4. Build efficient date column rendering/recycling system

### Phase 2: Dynamic Data Loading (3-4 hours)

1. Enhance API to support date range queries
2. Implement progressive episode data loading
3. Add caching layer for previously loaded date ranges
4. Build loading states and error handling for new chunks

### Phase 3: Show Block Positioning (2-3 hours)

1. Calculate show positions relative to infinite timeline
2. Handle show blocks that span multiple data chunks
3. Optimize rendering for only visible show blocks
4. Implement smooth animations as blocks enter/exit viewport

### Phase 4: Performance & Polish (2-3 hours)

1. Optimize virtual scrolling performance
2. Add smooth scroll indicators and navigation
3. Implement "jump to date" functionality
4. Handle edge cases (timezone changes, daylight savings)

### Phase 5: Integration (1-2 hours)

1. Add to main navigation as `/tv-guide`
2. Integrate with existing show data
3. Add quick actions and interactivity
4. Testing across different screen sizes

## Technical Implementation

### Infinite Scroll Container

```typescript
const TVGuide = () => {
  const [dateRanges, setDateRanges] = useState<DateRange[]>([initialRange]);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 7 });
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Intersection observer to detect when to load more dates
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const lastEntry = entries[entries.length - 1];
        if (lastEntry.isIntersecting) {
          loadNextDateChunk();
        }
      },
      { rootMargin: '200px' } // Load before user reaches the end
    );

    return () => observer.disconnect();
  }, []);
};
```

### Dynamic Date Generation

```typescript
function generateInfiniteDates(startDate: Date = new Date()) {
  const dates = [];
  let currentDate = startDate;

  // Generate dates indefinitely as needed
  while (dates.length < CHUNK_SIZE) {
    dates.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return dates;
}
```

### Show Block Positioning

```typescript
function calculateShowPosition(show: ShowSchedule, timelineStart: Date) {
  const showStart = differenceInDays(show.startDate, timelineStart);
  const showDuration = differenceInDays(show.endDate, show.startDate) || 1;

  return {
    gridColumnStart: showStart + 2, // +2 for service column
    gridColumnEnd: showStart + showDuration + 2,
  };
}
```

## User Experience Features

### Navigation

- Smooth horizontal scrolling with momentum
- "Today" button to jump back to current date
- Date picker to jump to specific future dates
- Keyboard navigation (arrow keys for scrolling)

### Visual Indicators

- "Today" column highlighted differently
- Loading indicators for new date chunks
- Smooth fade-in animations for new show blocks
- Progress indicators showing how far user has scrolled

### Performance Considerations

- Maximum rendered columns at any time: ~20
- Data chunk size: 30 days
- Prefetch next chunk when user is within 7 days of boundary
- Memory cleanup for date ranges scrolled far out of view

## Success Metrics

1. **Infinite scrolling**: Users can scroll months/years into future without performance degradation
2. **Load times**: New date chunks load in <500ms
3. **Smooth scrolling**: 60fps horizontal scrolling experience
4. **Memory efficiency**: Memory usage stays stable during extended scrolling sessions

This revised plan focuses on true infinite scrolling capability while maintaining the visual grid layout from your example screenshot.
