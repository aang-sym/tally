import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { format, addDays, startOfDay } from 'date-fns';
import { DateChunk, TVGuideService, ViewportRange, ScrollState, TV_GUIDE_CONSTANTS } from './tv-guide.types';
import { UserManager } from '../UserSwitcher';
import TVGuideHeader from './TVGuideHeader';
import ServiceRow from './ServiceRow';

const { COLUMN_WIDTH, CHUNK_SIZE_DAYS, BUFFER_COLUMNS, VISIBLE_COLUMNS_DESKTOP } = TV_GUIDE_CONSTANTS;

interface TVGuideProps {
  className?: string;
}

const TVGuide: React.FC<TVGuideProps> = ({ className = '' }) => {
  const [dateChunks, setDateChunks] = useState<DateChunk[]>([]);
  const [services, setServices] = useState<TVGuideService[]>([]);
  const [scrollState, setScrollState] = useState<ScrollState>({
    scrollLeft: 0,
    containerWidth: 0,
    columnWidth: COLUMN_WIDTH,
    visibleColumns: VISIBLE_COLUMNS_DESKTOP
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);
  const initialLoadRef = useRef(false);

  // Generate dates for a chunk
  const generateDateChunk = useCallback((startDate: Date, chunkId: string): DateChunk => {
    const dates: Date[] = [];
    let currentDate = startOfDay(startDate);
    
    for (let i = 0; i < CHUNK_SIZE_DAYS; i++) {
      dates.push(new Date(currentDate));
      currentDate = addDays(currentDate, 1);
    }

    return {
      id: chunkId,
      startDate: dates[0] ?? new Date(),
      endDate: dates[dates.length - 1] ?? new Date(),
      dates,
      isLoaded: false,
      isLoading: false,
      shows: []
    };
  }, []);

  // Calculate viewport range based on scroll position
  const viewportRange = useMemo((): ViewportRange => {
    const startIndex = Math.floor(scrollState.scrollLeft / scrollState.columnWidth);
    const endIndex = startIndex + scrollState.visibleColumns + (BUFFER_COLUMNS * 2);
    
    const allDates = dateChunks.flatMap(chunk => chunk.dates);
    const startDate = allDates[Math.max(0, startIndex)] ?? new Date();
    const endDate = allDates[Math.min(allDates.length - 1, endIndex)] ?? addDays(startDate, scrollState.visibleColumns);

    return {
      startIndex: Math.max(0, startIndex - BUFFER_COLUMNS),
      endIndex: Math.min(allDates.length - 1, endIndex),
      startDate,
      endDate
    };
  }, [scrollState, dateChunks]);

  // Load initial date chunks
  const loadInitialChunks = useCallback(async () => {
    if (initialLoadRef.current) return;
    
    setLoading(true);
    try {
      const today = startOfDay(new Date());
      const chunks: DateChunk[] = [];
      
      // Create initial 3 chunks (prev, current, next)
      for (let i = -1; i <= 1; i++) {
        const chunkStartDate = addDays(today, i * CHUNK_SIZE_DAYS);
        const chunkId = `chunk-${format(chunkStartDate, 'yyyy-MM-dd')}`;
        chunks.push(generateDateChunk(chunkStartDate, chunkId));
      }
      
      setDateChunks(chunks);
      
      // Load initial data for the first chunk
      if (chunks[0]) {
        try {
          const firstChunkData = await loadChunkData(chunks[0]);
          setServices(firstChunkData.services);
          
          // Mark first chunk as loaded
          setDateChunks(prev => 
            prev.map(chunk => 
              chunk.id === chunks[0]?.id 
                ? { ...chunk, isLoaded: true, shows: [] }
                : chunk
            )
          );
        } catch (err) {
          console.error('Failed to load initial data:', err);
          setError('Failed to load initial TV guide data');
        }
      }
      
      initialLoadRef.current = true;
      setLoading(false);
    } catch (err) {
      setError('Failed to load TV guide data');
      setLoading(false);
    }
  }, [generateDateChunk]);

  // Load more chunks when user scrolls near the end
  const loadNextChunk = useCallback(async () => {
    if (!dateChunks.length) return;
    
    const lastChunk = dateChunks[dateChunks.length - 1];
    if (!lastChunk) return;
    
    const nextStartDate = addDays(lastChunk.endDate, 1);
    const chunkId = `chunk-${format(nextStartDate, 'yyyy-MM-dd')}`;
    
    const newChunk = generateDateChunk(nextStartDate, chunkId);
    
    setDateChunks(prev => [...prev, newChunk]);
    
    // Load data for the new chunk
    try {
      const chunkData = await loadChunkData(newChunk);
      setDateChunks(prev => 
        prev.map(chunk => 
          chunk.id === chunkId 
            ? { ...chunk, ...chunkData, isLoaded: true, isLoading: false }
            : chunk
        )
      );
    } catch (err) {
      console.error('Failed to load chunk data:', err);
    }
  }, [dateChunks, generateDateChunk]);

  // Load TV Guide data from API
  const loadTVGuideData = async (startDate: Date, endDate: Date) => {
    try {
      const userId = UserManager.getCurrentUserId();
      const response = await fetch(
        `http://localhost:3001/api/tv-guide?startDate=${format(startDate, 'yyyy-MM-dd')}&endDate=${format(endDate, 'yyyy-MM-dd')}`,
        { headers: { 'x-user-id': userId } }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch TV guide data');
      }
      
      const result = await response.json();
      return result.data;
    } catch (error) {
      console.error('Failed to load TV guide data:', error);
      throw error;
    }
  };

  // Convert API data to component format
  const convertApiToServices = (apiData: any): TVGuideService[] => {
    return apiData.services.map((serviceGroup: any) => ({
      ...serviceGroup.service,
      shows: serviceGroup.shows.map((show: any) => ({
        ...show,
        nextEpisodeDate: show.nextEpisodeDate ? new Date(show.nextEpisodeDate) : undefined,
        activeWindow: show.activeWindow ? {
          start: new Date(show.activeWindow.start),
          end: new Date(show.activeWindow.end)
        } : undefined,
        bufferDays: show.bufferDays ?? 0,
        upcomingEpisodes: show.upcomingEpisodes.map((episode: any) => ({
          ...episode,
          airDate: new Date(episode.airDate)
        }))
      }))
    }));
  };

  const loadChunkData = async (chunk: DateChunk) => {
    try {
      const apiData = await loadTVGuideData(chunk.startDate, chunk.endDate);
      const services = convertApiToServices(apiData);
      
      return {
        services,
        isLoaded: true,
        isLoading: false
      };
    } catch (error) {
      console.error('Failed to load chunk data:', error);
      throw error;
    }
  };

  // Handle scroll events
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const target = event.target as HTMLDivElement;
    const newScrollState = {
      ...scrollState,
      scrollLeft: target.scrollLeft,
      containerWidth: target.clientWidth
    };
    setScrollState(newScrollState);
  }, [scrollState]);

  // Intersection observer for infinite loading
  useEffect(() => {
    if (!loadingTriggerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry?.isIntersecting) {
          loadNextChunk();
        }
      },
      {
        rootMargin: '200px',
        threshold: 0.1
      }
    );

    observer.observe(loadingTriggerRef.current);
    return () => observer.disconnect();
  }, [loadNextChunk]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (scrollContainerRef.current) {
        const containerWidth = scrollContainerRef.current.clientWidth;
        const visibleColumns = Math.floor(containerWidth / COLUMN_WIDTH);
        
        setScrollState(prev => ({
          ...prev,
          containerWidth,
          visibleColumns: Math.max(3, Math.min(visibleColumns, 14))
        }));
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Load initial data
  useEffect(() => {
    loadInitialChunks();
  }, [loadInitialChunks]);

  // After chunks load, jump to today
  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const allDates = dateChunks.flatMap(c => c.dates);
    const today = startOfDay(new Date());
    const idx = allDates.findIndex(d => startOfDay(d).getTime() === today.getTime());
    if (idx >= 0) {
      scrollContainerRef.current.scrollLeft = idx * COLUMN_WIDTH;
    }
  }, [dateChunks]);

  // Calculate total grid dimensions
  const totalColumns = dateChunks.reduce((total, chunk) => total + chunk.dates.length, 0);
  const gridTemplateColumns = `160px repeat(${totalColumns}, ${COLUMN_WIDTH}px)`;
  
  // Calculate total rows (services can have multiple shows = multiple rows)
  const totalRows = services.reduce((total, service) => total + service.shows.length, 0);

  if (loading && !dateChunks.length) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="flex items-center space-x-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-gray-600">Loading TV Guide...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center h-96 ${className}`}>
        <div className="text-center">
          <p className="text-red-600 font-medium mb-2">Failed to load TV Guide</p>
          <p className="text-gray-500 text-sm">{error}</p>
          <button 
            onClick={loadInitialChunks}
            className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const allDates = dateChunks.flatMap(chunk => chunk.dates);
  const visibleDates = allDates.slice(viewportRange.startIndex, viewportRange.endIndex + 1);

  return (
    <div className={`bg-white rounded-lg shadow-lg overflow-hidden ${className}`}>
      {/* Header */}
      <TVGuideHeader 
        dates={visibleDates}
        columnWidth={COLUMN_WIDTH}
        onJumpToDate={(date) => {
          // Implement jump to date functionality
          const dateIndex = allDates.findIndex(d => 
            d.toDateString() === date.toDateString()
          );
          if (dateIndex >= 0 && scrollContainerRef.current) {
            const scrollPosition = dateIndex * COLUMN_WIDTH;
            scrollContainerRef.current.scrollLeft = scrollPosition;
          }
        }}
      />

      {/* Main Content */}
      <div 
        ref={scrollContainerRef}
        className="overflow-x-auto overflow-y-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300"
        onScroll={handleScroll}
        style={{ height: 'calc(100vh - 200px)', maxHeight: '600px' }}
      >
        <div 
          className="relative grid gap-0"
          style={{
            gridTemplateColumns,
            gridTemplateRows: `repeat(${totalRows}, 80px)`,
            minWidth: `${160 + (totalColumns * COLUMN_WIDTH)}px`
          }}
        >
          {/* Today vertical indicator */}
          {(() => {
            const today = startOfDay(new Date());
            const idx = allDates.findIndex(d => startOfDay(d).getTime() === today.getTime());
            if (idx >= 0) {
              const left = 160 + idx * COLUMN_WIDTH; // 160px service column
              return (
                <div
                  key="today-indicator"
                  className="absolute top-0 bottom-0 border-r-2 border-blue-500/70 pointer-events-none"
                  style={{ left: `${left}px` }}
                />
              );
            }
            return null;
          })()}
          {services.map((service, serviceIndex) => {
            // Calculate the starting row for this service
            const rowOffset = services.slice(0, serviceIndex).reduce((total, prevService) => total + prevService.shows.length, 0);
            
            // Render a row for each show in this service
            return service.shows.map((_, showIndex) => (
              <ServiceRow
                key={`${service.id}-show-${showIndex}`}
                service={service}
                dates={allDates}
                visibleRange={viewportRange}
                rowIndex={rowOffset + showIndex}
                columnWidth={COLUMN_WIDTH}
                shows={service.shows}
                showIndex={showIndex}
              />
            ));
          }).flat()}
        </div>

        {/* Loading trigger for infinite scroll */}
        <div 
          ref={loadingTriggerRef}
          className="w-px h-px"
          style={{
            position: 'absolute',
            left: `${totalColumns * COLUMN_WIDTH - 500}px`,
            top: '50%'
          }}
        />
      </div>

      {/* Loading indicator for new chunks */}
      {dateChunks.some(chunk => chunk.isLoading) && (
        <div className="absolute top-1/2 right-4 bg-white rounded-lg shadow-lg p-2">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Loading...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default TVGuide;
