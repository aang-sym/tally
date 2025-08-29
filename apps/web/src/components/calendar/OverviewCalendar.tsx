import React, { useState, useEffect } from 'react';
import CalendarView, { CalendarDay } from './CalendarView';

// API base URL
const API_BASE = 'http://localhost:3001';

// Mock user ID (would come from authentication)
const USER_ID = 'user-1';

const OverviewCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<CalendarDay | null>(null);

  useEffect(() => {
    fetchCalendarData();
  }, [currentDate]);

  const fetchCalendarData = async () => {
    try {
      setLoading(true);
      
      // Fetch calendar recommendations from API
      const response = await fetch(`${API_BASE}/api/recommendations/calendar?months=3`, {
        headers: { 'x-user-id': USER_ID }
      });

      if (response.ok) {
        const data = await response.json();
        const calendarRecommendations = data.data.calendar;
        
        // Transform API data to calendar format
        const transformedData = generateCalendarData(calendarRecommendations);
        setCalendarData(transformedData);
      } else {
        // Generate mock data if API fails
        setCalendarData(generateMockCalendarData());
      }
    } catch (error) {
      console.error('Failed to fetch calendar data:', error);
      setCalendarData(generateMockCalendarData());
    } finally {
      setLoading(false);
    }
  };

  const generateCalendarData = (apiData: any[]): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      
      // Find relevant month data from API
      const monthData = apiData.find(m => {
        const monthDate = new Date(m.month);
        return monthDate.getMonth() === month && monthDate.getFullYear() === year;
      });
      
      const activeServices = monthData?.recommendations.map((rec: any) => ({
        serviceId: rec.service.toLowerCase().replace(' ', '-'),
        serviceName: rec.service,
        intensity: rec.action === 'keep' ? 0.8 : rec.action === 'subscribe' ? 0.6 : 0.2,
        userShows: rec.shows || [],
        allShows: rec.shows || [],
        cost: rec.cost || 0
      })) || [];

      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices,
        savings: monthData?.savings || 0
      });
    }
    
    return data;
  };

  const generateMockCalendarData = (): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      
      // Mock streaming service activity
      const activeServices = [];
      
      // Netflix - active most days
      if (Math.random() > 0.3) {
        activeServices.push({
          serviceId: 'netflix',
          serviceName: 'Netflix',
          intensity: 0.6 + Math.random() * 0.4,
          userShows: ['Stranger Things', 'The Crown'],
          allShows: ['Stranger Things', 'The Crown', 'Ozark'],
          cost: 15.99
        });
      }
      
      // HBO Max - active some days
      if (Math.random() > 0.6) {
        activeServices.push({
          serviceId: 'hbo-max',
          serviceName: 'HBO Max',
          intensity: 0.4 + Math.random() * 0.6,
          userShows: ['House of the Dragon'],
          allShows: ['House of the Dragon', 'The Last of Us'],
          cost: 14.99
        });
      }
      
      // Disney+ - active occasionally
      if (Math.random() > 0.8) {
        activeServices.push({
          serviceId: 'disney-plus',
          serviceName: 'Disney Plus',
          intensity: 0.3 + Math.random() * 0.4,
          userShows: ['The Mandalorian'],
          allShows: ['The Mandalorian', 'Loki'],
          cost: 12.99
        });
      }
      
      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices,
        savings: Math.random() > 0.7 ? Math.random() * 30 : 0,
        recommendations: Math.random() > 0.9 ? [{ type: 'optimization', message: 'Consider pausing service' }] : []
      });
    }
    
    return data;
  };

  const navigateMonth = (direction: 'prev' | 'next') => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      if (direction === 'prev') {
        newDate.setMonth(newDate.getMonth() - 1);
      } else {
        newDate.setMonth(newDate.getMonth() + 1);
      }
      return newDate;
    });
  };

  const handleDateClick = (day: CalendarDay) => {
    setSelectedDay(day);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-600">Loading calendar...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Calendar Controls */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Subscription Overview</h2>
          <p className="text-gray-600 mt-1">
            Visual overview of your streaming services usage and optimization opportunities
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={() => navigateMonth('prev')}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            ← Previous
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Today
          </button>
          <button
            onClick={() => navigateMonth('next')}
            className="p-2 text-gray-500 hover:text-gray-700"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Main Calendar */}
      <CalendarView
        year={currentDate.getFullYear()}
        month={currentDate.getMonth()}
        data={calendarData}
        onDateClick={handleDateClick}
        mode="overview"
      />

      {/* Day Detail Modal */}
      {selectedDay && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {new Date(selectedDay.date).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </h3>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Active Services */}
              {selectedDay.activeServices.length > 0 ? (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Active Services</h4>
                  <div className="space-y-2">
                    {selectedDay.activeServices.map((service) => (
                      <div key={service.serviceId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                          <div className="font-medium">{service.serviceName}</div>
                          <div className="text-sm text-gray-600">
                            {service.userShows.length} show{service.userShows.length !== 1 ? 's' : ''}
                            {service.userShows.length > 0 && ': ' + service.userShows.join(', ')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">${service.cost.toFixed(2)}</div>
                          <div className={`text-sm ${
                            service.intensity > 0.7 ? 'text-green-600' : 
                            service.intensity > 0.3 ? 'text-yellow-600' : 
                            'text-gray-600'
                          }`}>
                            {service.intensity > 0.7 ? 'Heavy use' : 
                             service.intensity > 0.3 ? 'Light use' : 'Minimal use'}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-6 text-gray-500">
                  <p>No active services on this day</p>
                </div>
              )}

              {/* Savings */}
              {selectedDay.savings && selectedDay.savings > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2">💰</span>
                    <span className="font-medium text-green-800">
                      Potential savings: ${selectedDay.savings.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {selectedDay.recommendations && selectedDay.recommendations.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center">
                    <span className="text-blue-600 mr-2">💡</span>
                    <span className="font-medium text-blue-800">
                      Optimization available
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-green-600">
            ${calendarData.reduce((sum, day) => sum + (day.savings || 0), 0).toFixed(2)}
          </div>
          <div className="text-sm text-gray-600">Potential Monthly Savings</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-blue-600">
            {Math.round(calendarData.filter(day => day.activeServices.length > 0).length / calendarData.length * 100)}%
          </div>
          <div className="text-sm text-gray-600">Service Utilization</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-purple-600">
            {new Set(calendarData.flatMap(day => day.activeServices.map(s => s.serviceId))).size}
          </div>
          <div className="text-sm text-gray-600">Active Services</div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <div className="text-2xl font-bold text-orange-600">
            {calendarData.filter(day => day.recommendations && day.recommendations.length > 0).length}
          </div>
          <div className="text-sm text-gray-600">Optimization Days</div>
        </div>
      </div>
    </div>
  );
};

export default OverviewCalendar;