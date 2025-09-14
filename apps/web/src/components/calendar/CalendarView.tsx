import React from 'react';

export interface CalendarDay {
  date: string;
  day: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  activeServices: {
    serviceId: string;
    serviceName: string;
    intensity: number; // 0-1 (content density)
    userShows: any[];
    allShows: any[];
    cost: number;
    logoUrl?: string;
    displayType?: 'logo' | 'bar';
    // Visual rail hints for ongoing period
    barLeftCap?: boolean;
    barRightCap?: boolean;
    // Status indicators
    isStart?: boolean;
    isEnd?: boolean;
    isEndingSoon?: boolean;
  }[];
  savings?: number;
  recommendations?: any[];
}

export interface CalendarProps {
  year: number;
  month: number; // 0-indexed
  data: CalendarDay[];
  onDateClick?: (day: CalendarDay) => void;
  mode?: 'overview' | 'provider' | 'savings' | 'personal';
  selectedService?: string;
  userProviders?: { serviceName: string; color: string }[];
  selectedDate?: string | undefined; // YYYY-MM-DD
  showHeader?: boolean;
}

const CalendarView: React.FC<CalendarProps> = ({
  year,
  month,
  data,
  onDateClick,
  mode = 'overview',
  selectedService,
  userProviders = [],
  selectedDate,
  showHeader = true,
}) => {
  const monthNames = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];

  // Monday-first labels
  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();

  // Convert Sunday=0..Saturday=6 to Monday=0..Sunday=6
  const firstDayWeekday = (firstDayOfMonth.getDay() + 6) % 7;

  // Generate 6x7 grid with spillover days
  const calendarDays: CalendarDay[] = [];

  // Previous month spillover
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = firstDayWeekday - 1; i >= 0; i--) {
    const day = prevMonthLastDay - i;
    const prevMonthDate = new Date(year, month - 1, day);
    const dateStr = `${prevMonthDate.getFullYear()}-${String(prevMonthDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = data.find((d) => d.date === dateStr) || {
      date: dateStr,
      day,
      isCurrentMonth: false,
      isToday: false,
      activeServices: [],
      savings: 0,
    };
    calendarDays.push(dayData);
  }

  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = data.find((d) => d.date === dateStr) || {
      date: dateStr,
      day,
      isCurrentMonth: true,
      isToday: false,
      activeServices: [],
      savings: 0,
    };
    calendarDays.push(dayData);
  }

  // Next month spillover to reach 42 cells
  const totalCells = 42;
  const nextMonthDaysToAdd = totalCells - calendarDays.length;
  for (let i = 1; i <= nextMonthDaysToAdd; i++) {
    const nextMonthDate = new Date(year, month + 1, i);
    const dateStr = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const dayData = data.find((d) => d.date === dateStr) || {
      date: dateStr,
      day: i,
      isCurrentMonth: false,
      isToday: false,
      activeServices: [],
      savings: 0,
    };
    calendarDays.push(dayData);
  }

  const renderServiceBars = (dayData: CalendarDay) => {
    if (mode === 'savings') {
      return (
        <div className="h-2 w-full">
          {dayData.savings !== undefined && dayData.savings > 0 ? (
            <div
              className="h-full bg-green-500 rounded-sm"
              title={`Save $${dayData.savings.toFixed(2)}`}
            />
          ) : dayData.savings !== undefined && dayData.savings < 0 ? (
            <div
              className="h-full bg-red-500 rounded-sm"
              title={`Cost $${Math.abs(dayData.savings).toFixed(2)}`}
            />
          ) : (
            <div className="h-full bg-gray-200 rounded-sm" />
          )}
        </div>
      );
    }

    if (mode === 'provider' && selectedService) {
      const service = dayData.activeServices.find((s) => s.serviceId === selectedService);
      if (service) {
        return (
          <div className="space-y-1">
            <div
              className={`h-1 rounded-sm ${
                service.intensity > 0.7
                  ? 'bg-green-500'
                  : service.intensity > 0.3
                    ? 'bg-yellow-500'
                    : 'bg-gray-300'
              }`}
            />
            <div className="flex space-x-1">
              {service.userShows.slice(0, 3).map((_, idx) => (
                <div key={idx} className="w-1 h-1 bg-blue-500 rounded-full" />
              ))}
            </div>
          </div>
        );
      }
      return <div className="h-2 bg-gray-100 rounded-sm" />;
    }

    // Overview mode – Stacked centered logos + subtle continuity pips
    const logosToShow = dayData.activeServices.filter((s) => s.displayType === 'logo').slice(0, 3);
    const extraCount = Math.max(
      0,
      dayData.activeServices.filter((s) => s.displayType === 'logo').length - 3
    );
    const pipServices = dayData.activeServices.filter((s) => s.displayType === 'bar');

    return (
      <>
        {/* Centered stacked logos */}
        {logosToShow.length > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="logos w-full h-full flex items-center justify-center">
              {logosToShow.map((service, idx) => (
                <div
                  key={`logo-${service.serviceId}-${idx}`}
                  className="logo relative rounded-full overflow-hidden ring-1 ring-gray-300 shadow"
                  style={{
                    marginLeft: idx === 0 ? 0 : 'calc(var(--overlap) * -1)',
                    zIndex: 10 + idx,
                  }}
                  title={service.serviceName}
                >
                  {service.logoUrl ? (
                    <img
                      src={service.logoUrl}
                      alt={service.serviceName}
                      className="w-full h-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement as HTMLElement;
                        if (parent)
                          parent.className = `logo relative rounded-full ${getServiceColor(service.serviceName, service.intensity)} flex items-center justify-center`;
                      }}
                    />
                  ) : (
                    <div
                      className={`w-full h-full ${getServiceColor(service.serviceName, service.intensity)}`}
                    />
                  )}
                  {(service.isStart || service.isEnd || service.isEndingSoon) && (
                    <span
                      className={
                        `absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full ` +
                        `${service.isEnd ? 'bg-red-500' : service.isEndingSoon ? 'bg-orange-500' : 'bg-green-500'}`
                      }
                    />
                  )}
                </div>
              ))}
              {extraCount > 0 && (
                <>
                  {/* Stacked mode: small circular plus */}
                  <div
                    className="plus-stacked ml-1 rounded-full bg-gray-200 text-gray-700 text-xs shadow-sm"
                    style={{ zIndex: 10 + logosToShow.length }}
                  >
                    +
                  </div>
                  {/* Grid/narrow mode: show +N badge */}
                  <div className="more-badge hidden ml-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-700 font-medium">
                    +{extraCount}
                  </div>
                </>
              )}
            </div>
          </div>
        )}

        {/* Continuity pips (for bar days) */}
        {pipServices.length > 0 && (
          <div className="absolute bottom-2 inset-x-0 flex items-center justify-center space-x-1.5 pointer-events-none">
            {pipServices.map((s, i) => (
              <span
                key={`pip-${s.serviceId}-${i}`}
                className={`inline-block w-1.5 h-1.5 rounded-full opacity-80 ${getServiceColor(s.serviceName, s.intensity)}`}
                title={`${s.serviceName}: ongoing`}
              />
            ))}
          </div>
        )}
      </>
    );
  };

  const getServiceColor = (serviceName: string, intensity: number) => {
    const colors = {
      Netflix: intensity > 0.5 ? 'bg-red-500' : 'bg-red-300',
      'HBO Max': intensity > 0.5 ? 'bg-purple-500' : 'bg-purple-300',
      'Disney Plus': intensity > 0.5 ? 'bg-blue-500' : 'bg-blue-300',
      'Disney+': intensity > 0.5 ? 'bg-blue-500' : 'bg-blue-300',
      Hulu: intensity > 0.5 ? 'bg-green-500' : 'bg-green-300',
      'Amazon Prime Video': intensity > 0.5 ? 'bg-indigo-500' : 'bg-indigo-300',
      'Prime Video': intensity > 0.5 ? 'bg-indigo-500' : 'bg-indigo-300',
      'Apple TV Plus': intensity > 0.5 ? 'bg-gray-500' : 'bg-gray-300',
      'Apple TV+': intensity > 0.5 ? 'bg-gray-500' : 'bg-gray-300',
      'Paramount+ with Showtime': intensity > 0.5 ? 'bg-orange-500' : 'bg-orange-300',
      'Paramount+': intensity > 0.5 ? 'bg-orange-500' : 'bg-orange-300',
    };

    return colors[serviceName as keyof typeof colors] || 'bg-gray-400';
  };

  const getDayClasses = (dayData: CalendarDay | null) => {
    if (!dayData) return 'relative p-2 h-24 rounded-lg day-cq overflow-hidden';

    let classes =
      'relative p-2 h-24 rounded-lg border cursor-pointer group transition-colors day-cq overflow-hidden ';

    if (dayData.isToday) {
      classes += 'border-blue-400 ';
    } else {
      classes += 'border-gray-200 ';
    }

    if (!dayData.isCurrentMonth) {
      classes += 'bg-gray-50 text-gray-400 ';
    } else {
      classes += 'bg-gray-100 text-gray-900 hover:bg-gray-200 ';
    }

    if (dayData.date === selectedDate) {
      classes += ' ring-2 ring-gray-300 ';
    }

    return classes;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      {showHeader && (
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            {monthNames[month]} {year}
          </h2>
          <div className="flex items-center space-x-4 mt-2">
            <div className="flex items-center space-x-2">
              {mode === 'overview' && userProviders.length > 0 && (
                <>
                  {userProviders.map((provider) => (
                    <div key={provider.serviceName} className="flex items-center space-x-1">
                      <div className={`w-3 h-3 rounded ${provider.color}`}></div>
                      <span className="text-xs text-gray-600">{provider.serviceName}</span>
                    </div>
                  ))}
                </>
              )}
              {mode === 'savings' && (
                <>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-green-500 rounded"></div>
                    <span className="text-xs text-gray-600">Savings</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <div className="w-3 h-3 bg-red-500 rounded"></div>
                    <span className="text-xs text-gray-600">Costs</span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-2 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-2">
          {calendarDays.map((dayData, index) => (
            <div
              key={index}
              className={getDayClasses(dayData)}
              onClick={() => dayData && onDateClick?.(dayData)}
            >
              {dayData && (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${dayData.isToday ? 'font-bold text-blue-600' : ''}`}>
                      {dayData.day}
                    </span>
                    {dayData.recommendations && dayData.recommendations.length > 0 && (
                      <span className="text-xs text-orange-600">💡</span>
                    )}
                  </div>
                  <div className="flex-1">{renderServiceBars(dayData)}</div>
                  {/* Hover price badge */}
                  {dayData.activeServices.length > 0 && (
                    <div className="absolute top-1 right-1 hidden group-hover:block">
                      <div className="text-[10px] px-1.5 py-0.5 rounded-md bg-white shadow border border-gray-200 text-gray-700">
                        ${sumUniqueCosts(dayData).toFixed(2)}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;

// Helpers
function sumUniqueCosts(day: CalendarDay): number {
  const unique = new Map<string, number>();
  for (const s of day.activeServices) {
    if (!unique.has(s.serviceId)) unique.set(s.serviceId, s.cost || 0);
  }
  return Array.from(unique.values()).reduce((a, b) => a + b, 0);
}
