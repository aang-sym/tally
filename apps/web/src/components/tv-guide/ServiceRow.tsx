import React from 'react';
import { differenceInDays, startOfDay } from 'date-fns';
import { TVGuideService, ViewportRange, ShowSchedule } from './tv-guide.types';
import ShowBlock from './ShowBlock';

interface ServiceRowProps {
  service: TVGuideService;
  dates: Date[];
  visibleRange: ViewportRange;
  rowIndex: number;
  columnWidth: number;
  shows: ShowSchedule[]; // All shows for this service
  showIndex?: number; // Index of the current show (for multi-show services)
}

const ServiceRow: React.FC<ServiceRowProps> = ({
  service,
  dates,
  visibleRange,
  rowIndex,
  columnWidth,
  shows,
  showIndex = 0,
}) => {
  // Get the specific show for this row (if multi-show service)
  const currentShow = shows[showIndex];
  const visibleShows = currentShow
    ? [currentShow].filter((show) => {
        // Consider bar visibility if any portion of activeWindow intersects viewport
        if (show.activeWindow) {
          const winStart = startOfDay(show.activeWindow.start);
          const winEnd = startOfDay(show.activeWindow.end);
          return winEnd >= visibleRange.startDate && winStart <= visibleRange.endDate;
        }
        if (show.nextEpisodeDate) {
          const showDate = startOfDay(show.nextEpisodeDate);
          return showDate >= visibleRange.startDate && showDate <= visibleRange.endDate;
        }
        return false;
      })
    : [];

  // Determine if this is the first row for this service (to show logo)
  const isFirstRowForService = showIndex === 0;

  // Calculate show positions relative to the grid
  const calculateShowPosition = (show: ShowSchedule) => {
    if (!dates.length) return null;

    // Prefer activeWindow if present; otherwise fallback to nextEpisodeDate single-day
    let startDate: Date;
    let endDate: Date;
    if (show.activeWindow) {
      startDate = startOfDay(show.activeWindow.start);
      endDate = startOfDay(show.activeWindow.end);
    } else if (show.nextEpisodeDate) {
      startDate = startOfDay(show.nextEpisodeDate);
      endDate = startDate;
    } else {
      return null;
    }

    const firstIndex = dates.findIndex((d) => startOfDay(d).getTime() === startDate.getTime());
    const lastIndex = dates.findIndex((d) => startOfDay(d).getTime() === endDate.getTime());
    if (firstIndex === -1 || lastIndex === -1) return null;

    const span = Math.max(1, differenceInDays(endDate, startDate) + 1);

    return {
      gridColumnStart: firstIndex + 2,
      gridColumnEnd: firstIndex + span + 2,
      dayIndex: firstIndex,
      span,
    };
  };

  return (
    <>
      {/* Service logo column */}
      <div
        className="flex items-center justify-center px-2 border-r border-gray-200 bg-white sticky left-0 z-50"
        style={{
          height: '80px',
          gridRow: isFirstRowForService
            ? `${rowIndex + 1} / ${rowIndex + shows.length + 1}`
            : rowIndex + 1,
          backgroundColor: isFirstRowForService ? '#f9fafb' : 'transparent',
        }}
      >
        {isFirstRowForService && (
          <div className="flex flex-col items-center space-y-1">
            {/* Circular service logo */}
            {service.logo ? (
              <div className="w-10 h-10 rounded-full overflow-hidden bg-white shadow-md border border-gray-200">
                <img
                  src={service.logo}
                  alt={service.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to colored circle with initial
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    target.parentElement!.innerHTML = `
                      <div class="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" 
                           style="background-color: ${service.color}">
                        ${service.name.charAt(0)}
                      </div>
                    `;
                  }}
                />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shadow-md"
                style={{ backgroundColor: service.color }}
                title={service.name}
              >
                {service.name.charAt(0)}
              </div>
            )}

            {/* Show count indicator for multiple shows */}
            {shows.length > 1 && (
              <div className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {shows.length} shows
              </div>
            )}
          </div>
        )}
      </div>

      {/* Removed sticky left overlay so poster/title appear only inside the show bar */}

      {/* Show blocks for this service */}
      {visibleShows.map((show) => {
        const position = calculateShowPosition(show);
        if (!position) return null;

        // Render buffer extension if configured: extend both sides by bufferDays in faded color
        const buffer = Math.max(0, show.bufferDays || 0);
        let bufferElem: React.ReactNode = null;
        if (buffer > 0 && show.activeWindow) {
          const bufStart = startOfDay(new Date(show.activeWindow.start));
          bufStart.setDate(bufStart.getDate() - buffer);
          const bufEnd = startOfDay(new Date(show.activeWindow.end));
          bufEnd.setDate(bufEnd.getDate() + buffer);

          const startIdx = dates.findIndex((d) => startOfDay(d).getTime() === bufStart.getTime());
          const endIdx = dates.findIndex((d) => startOfDay(d).getTime() === bufEnd.getTime());
          if (startIdx >= 0 && endIdx >= 0) {
            bufferElem = (
              <div
                className="rounded-lg opacity-50"
                style={{
                  gridColumn: `${startIdx + 2} / ${endIdx + 3}`,
                  gridRow: rowIndex + 1,
                  margin: '6px',
                  backgroundColor: service.color,
                  height: '68px',
                }}
              />
            );
          }
        }

        return (
          <>
            {bufferElem}
            <ShowBlock
              key={`${service.id}-${show.tmdbId}-${position.dayIndex}`}
              show={show}
              service={service}
              position={position}
              rowIndex={rowIndex}
              columnWidth={columnWidth}
            />
          </>
        );
      })}

      {/* Empty cells for dates without shows */}
      {dates.map((_, dateIndex) => {
        const hasShow = visibleShows.some((show) => {
          const position = calculateShowPosition(show);
          return (
            position &&
            dateIndex >= position.dayIndex &&
            dateIndex < position.dayIndex + position.span
          );
        });

        if (hasShow) return null;

        return (
          <div
            key={`${service.id}-empty-${dateIndex}`}
            className="border-r border-gray-100 bg-gray-50/30 hover:bg-gray-50 transition-colors"
            style={{
              height: '80px',
              gridColumn: dateIndex + 2,
              gridRow: rowIndex + 1,
            }}
          />
        );
      })}
    </>
  );
};

export default ServiceRow;
