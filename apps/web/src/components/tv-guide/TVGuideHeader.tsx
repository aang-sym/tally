import React from 'react';
import { format, isToday, isTomorrow, isYesterday } from 'date-fns';

interface TVGuideHeaderProps {
  dates: Date[];
  columnWidth: number;
  onJumpToDate?: (date: Date) => void;
}

const TVGuideHeader: React.FC<TVGuideHeaderProps> = ({ dates, columnWidth, onJumpToDate }) => {
  // Ensure we only operate on valid Date instances to satisfy strict typing
  const safeDates: Date[] = Array.isArray(dates)
    ? dates.filter((d): d is Date => d instanceof Date && !isNaN(d.getTime()))
    : [];
 
  const formatDateHeader = (date: Date): { day: string; date: string; isSpecial: boolean } => {
    let day = format(date, 'EEE'); // Mon, Tue, etc.
    let isSpecial = false;
 
    if (isToday(date)) {
      day = 'Today';
      isSpecial = true;
    } else if (isTomorrow(date)) {
      day = 'Tomorrow';
      isSpecial = true;
    } else if (isYesterday(date)) {
      day = 'Yesterday';
      isSpecial = true;
    }
 
    return {
      day,
      date: format(date, 'MMM d'),
      isSpecial,
    };
  };
 
  const handleJumpToToday = () => {
    const today = new Date();
    if (onJumpToDate) {
      onJumpToDate(today);
    }
  };
 
  const handleJumpToNextMonth = () => {
    if (!safeDates.length || !onJumpToDate) return;
    const last = safeDates[safeDates.length - 1]!;
    const nextMonth = new Date(last.getTime());
    nextMonth.setMonth(nextMonth.getMonth() + 1, 1);
    onJumpToDate(nextMonth);
  };
 
  return (
    <div className="bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
      <div className="flex items-center h-16">
        {/* Service column header */}
        <div className="w-40 px-4 flex items-center justify-between border-r border-gray-200">
          <h2 className="font-semibold text-gray-900">Services</h2>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleJumpToToday}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600 transition-colors"
              title="Jump to today"
            >
              Today
            </button>
            <button
              onClick={handleJumpToNextMonth}
              className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded hover:bg-gray-300 transition-colors"
              title="Jump to next month"
            >
              Next Month
            </button>
          </div>
        </div>
 
        {/* Date columns */}
        <div className="flex-1 flex overflow-hidden">
          {safeDates.map((date, index) => {
            const { day, date: dateStr, isSpecial } = formatDateHeader(date);
            const isTodayColumn = isToday(date);
 
            return (
              <div
                key={`${date.getTime()}-${index}`}
                className={`flex-shrink-0 flex flex-col items-center justify-center px-2 border-r border-gray-200 transition-colors ${
                  isTodayColumn ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-100'
                }`}
                style={{ width: columnWidth }}
              >
                <div
                  className={`text-sm font-medium ${
                    isSpecial
                      ? isTodayColumn
                        ? 'text-blue-700'
                        : 'text-gray-700'
                      : 'text-gray-600'
                  }`}
                >
                  {day}
                </div>
                <div
                  className={`text-xs ${
                    isTodayColumn ? 'text-blue-600 font-medium' : 'text-gray-500'
                  }`}
                >
                  {dateStr}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TVGuideHeader;
