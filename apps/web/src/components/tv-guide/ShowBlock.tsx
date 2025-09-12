import React, { useState } from 'react';
import { format } from 'date-fns';
import { ShowSchedule, TVGuideService } from './tv-guide.types';

interface ShowBlockPosition {
  gridColumnStart: number;
  gridColumnEnd: number;
  dayIndex: number;
  span: number;
}

interface ShowBlockProps {
  show: ShowSchedule;
  service: TVGuideService;
  position: ShowBlockPosition;
  rowIndex: number;
  columnWidth: number;
}

const ShowBlock: React.FC<ShowBlockProps> = ({
  show,
  service,
  position,
  rowIndex,
  columnWidth,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const blockWidth = position.span * columnWidth - 8; // -8px for margins
  const nextEpisode = show.upcomingEpisodes[0];

  // Determine if user has watched episodes
  const watched = Array.isArray(show.userProgress?.watchedEpisodes)
    ? show.userProgress!.watchedEpisodes
    : [];
  const hasProgress = watched.length > 0;
  const isNewEpisode =
    !!nextEpisode &&
    !watched.includes(`S${nextEpisode.seasonNumber}E${nextEpisode.episodeNumber}`);

  const handleShowClick = () => {
    // TODO: Navigate to show details or episode list
    console.log('Navigate to show:', show.title);
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <div
      className={`relative overflow-hidden cursor-pointer ${isHovered ? 'z-30' : 'z-10'}`}
      style={{
        gridColumn: `${position.gridColumnStart} / ${position.gridColumnEnd}`,
        gridRow: rowIndex + 1,
        width: `${blockWidth}px`,
        height: '72px',
        // Align left edge flush with the start of the date grid (services column boundary)
        marginLeft: '0px',
        marginRight: '4px',
        marginTop: '4px',
        marginBottom: '4px',
        backgroundColor: service.color,
        color: service.textColor,
        borderRadius: '16px',
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={handleShowClick}
    >
      {/* Background overlay for better text readability */}
      <div className="absolute inset-0 bg-black bg-opacity-20" />

      {/* Content container */}
      <div className="relative h-full flex items-center p-2 space-x-2">
        {/* Show poster thumbnail */}
        {show.poster && !imageError ? (
          <div className="flex-shrink-0 w-12 h-16 bg-gray-300 rounded overflow-hidden">
            <img
              src={show.poster}
              alt={show.title}
              className="w-full h-full object-cover"
              onError={handleImageError}
            />
          </div>
        ) : (
          <div className="flex-shrink-0 w-12 h-16 bg-black bg-opacity-30 rounded flex items-center justify-center">
            <span className="text-xs font-bold text-center leading-tight">
              {show.title
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 3)}
            </span>
          </div>
        )}

        {/* Show info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-sm leading-tight truncate">{show.title}</h3>

          {nextEpisode && (
            <div className="text-xs opacity-90 mt-1">
              <div className="truncate">
                S{nextEpisode.seasonNumber}E{nextEpisode.episodeNumber}
                {nextEpisode.title && ` • ${nextEpisode.title}`}
              </div>
              {show.nextEpisodeDate && (
                <div className="truncate">{format(show.nextEpisodeDate, 'MMM d')}</div>
              )}
            </div>
          )}

          {/* Progress indicators */}
          <div className="flex items-center space-x-1 mt-1">
            {hasProgress && (
              <div className="w-2 h-2 bg-green-400 rounded-full" title="In progress" />
            )}
            {isNewEpisode && (
              <div className="w-2 h-2 bg-yellow-400 rounded-full" title="New episode" />
            )}
            {Array.isArray(show.upcomingEpisodes) && show.upcomingEpisodes.length > 1 && (
              <span className="text-xs opacity-75">+{show.upcomingEpisodes.length - 1}</span>
            )}
          </div>
        </div>
      </div>

      {/* Hover tooltip */}
      {isHovered && (
        <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 bg-gray-900 text-white p-3 rounded-lg shadow-lg z-40 min-w-64 max-w-80">
          <div className="text-sm font-medium mb-1">{show.title}</div>

          {nextEpisode && (
            <div className="text-xs text-gray-300 mb-2">
              <div>
                Season {nextEpisode.seasonNumber}, Episode {nextEpisode.episodeNumber}
              </div>
              {nextEpisode.title && <div>"{nextEpisode.title}"</div>}
              {show.nextEpisodeDate && (
                <div>Airs {format(show.nextEpisodeDate, 'EEEE, MMM d')}</div>
              )}
            </div>
          )}

          {Array.isArray(show.upcomingEpisodes) && show.upcomingEpisodes.length > 1 && (
            <div className="text-xs text-gray-400">
              {show.upcomingEpisodes.length} episodes scheduled
            </div>
          )}

          <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-700">
            <span className="text-xs text-gray-400">Available on {service.name}</span>
            {hasProgress && <span className="text-xs text-green-400">Watching</span>}
          </div>

          {/* Tooltip arrow */}
          <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900" />
        </div>
      )}
    </div>
  );
};

export default ShowBlock;
