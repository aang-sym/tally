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
}

const CalendarView: React.FC<CalendarProps> = ({
  year,
  month,
  data,
  onDateClick,
  mode = 'overview',
  selectedService
}) => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  // Generate calendar grid
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);
  const firstDayWeekday = firstDayOfMonth.getDay();
  const daysInMonth = lastDayOfMonth.getDate();

  // Generate calendar days including padding
  const calendarDays: (CalendarDay | null)[] = [];
  
  // Add empty cells for days before the first day of the month
  for (let i = 0; i < firstDayWeekday; i++) {
    calendarDays.push(null);
  }

  // Add the days of the month
  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const dayData = data.find(d => d.date === dateStr) || {
      date: dateStr,
      day,
      isCurrentMonth: true,
      isToday: false,
      activeServices: [],
      savings: 0
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
      const service = dayData.activeServices.find(s => s.serviceId === selectedService);
      if (service) {
        return (
          <div className="space-y-1">
            <div 
              className={`h-1 rounded-sm ${
                service.intensity > 0.7 ? 'bg-green-500' : 
                service.intensity > 0.3 ? 'bg-yellow-500' : 
                'bg-gray-300'
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

    // Overview mode - show all services as colored bars
    return (
      <div className="space-y-px">
        {dayData.activeServices.slice(0, 4).map((service, idx) => (
          <div 
            key={service.serviceId}
            className={`h-1 rounded-sm ${getServiceColor(service.serviceName, service.intensity)}`}
            title={`${service.serviceName}: ${service.userShows.length} shows`}
          />
        ))}
        {dayData.activeServices.length > 4 && (
          <div className="text-xs text-gray-400 text-center">
            +{dayData.activeServices.length - 4}
          </div>
        )}
      </div>
    );
  };

  const getServiceColor = (serviceName: string, intensity: number) => {
    const colors = {
      'Netflix': intensity > 0.5 ? 'bg-red-500' : 'bg-red-300',
      'HBO Max': intensity > 0.5 ? 'bg-purple-500' : 'bg-purple-300',
      'Disney Plus': intensity > 0.5 ? 'bg-blue-500' : 'bg-blue-300',
      'Hulu': intensity > 0.5 ? 'bg-green-500' : 'bg-green-300',
      'Amazon Prime': intensity > 0.5 ? 'bg-indigo-500' : 'bg-indigo-300',
      'Apple TV': intensity > 0.5 ? 'bg-gray-500' : 'bg-gray-300'
    };
    
    return colors[serviceName as keyof typeof colors] || 'bg-gray-400';
  };

  const getDayClasses = (dayData: CalendarDay | null) => {
    if (!dayData) return 'p-2 h-20';
    
    let classes = 'p-2 h-20 border border-gray-200 cursor-pointer hover:bg-gray-50 ';
    
    if (dayData.isToday) {
      classes += 'ring-2 ring-blue-500 ';
    }
    
    if (!dayData.isCurrentMonth) {
      classes += 'bg-gray-50 text-gray-400 ';
    }
    
    return classes;
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Calendar Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900">
          {monthNames[month]} {year}
        </h2>
        <div className="flex items-center space-x-4 mt-2">
          <div className="flex items-center space-x-2">
            {mode === 'overview' && (
              <>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span className="text-xs text-gray-600">Netflix</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-500 rounded"></div>
                  <span className="text-xs text-gray-600">HBO Max</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-blue-500 rounded"></div>
                  <span className="text-xs text-gray-600">Disney+</span>
                </div>
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

      {/* Calendar Grid */}
      <div className="p-4">
        {/* Week day headers */}
        <div className="grid grid-cols-7 gap-px mb-2">
          {weekDays.map((day) => (
            <div key={day} className="p-2 text-center text-sm font-medium text-gray-700">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {calendarDays.map((dayData, index) => (
            <div
              key={index}
              className={getDayClasses(dayData)}
              onClick={() => dayData && onDateClick?.(dayData)}
            >
              {dayData && (
                <>
                  <div className="flex justify-between items-start mb-1">
                    <span className={`text-sm ${dayData.isToday ? 'font-bold text-blue-600' : 'text-gray-900'}`}>
                      {dayData.day}
                    </span>
                    {dayData.recommendations && dayData.recommendations.length > 0 && (
                      <span className="text-xs text-orange-600">💡</span>
                    )}
                  </div>
                  <div className="flex-1">
                    {renderServiceBars(dayData)}
                  </div>
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