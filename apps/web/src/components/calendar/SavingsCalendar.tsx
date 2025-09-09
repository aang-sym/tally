import React, { useState, useEffect } from 'react';
import CalendarView, { CalendarDay } from './CalendarView';
import { UserManager } from '../../services/UserManager';
import { API_ENDPOINTS, apiRequest } from '../../config/api';

interface UserSubscription {
  id: string;
  service_id: string;
  monthly_cost: number;
  is_active: boolean;
  service: {
    id: string;
    name: string;
    logo_path?: string;
  };
}

interface UserShow {
  id: string;
  show_id: string;
  status: 'watchlist' | 'watching' | 'completed' | 'dropped';
  show: {
    title: string;
    tmdb_id: number;
  };
}

interface SavingsCalendarProps {
  useUserData?: boolean;
  userSubscriptions?: UserSubscription[] | undefined;
  userShows?: UserShow[] | undefined;
}

// API base URL

const SavingsCalendar: React.FC<SavingsCalendarProps> = ({ 
  useUserData = false, 
  userSubscriptions = [], 
  userShows = [] 
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState<CalendarDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('aggressive');

  useEffect(() => {
    fetchSavingsData();
  }, [currentDate, selectedStrategy, useUserData, userSubscriptions, userShows]);

  const fetchSavingsData = async () => {
    try {
      setLoading(true);
      
      if (useUserData && (userSubscriptions?.length || 0) === 0) {
        // No subscription data for savings calculation
        setCalendarData([]);
        setLoading(false);
        return;
      }
      
      // Get user ID for API calls
      
      // Create abort controller for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      try {
        // Fetch savings simulation data
        const token = localStorage.getItem('authToken') || undefined;
        const data = await apiRequest(
          `${API_ENDPOINTS.recommendations}/savings-simulator`, 
          { signal: controller.signal }, 
          token
        );
        
        clearTimeout(timeoutId);
        const strategies = data.data.strategies;
        const selectedStrategyData = strategies.find((s: any) => 
          s.name.toLowerCase().includes(selectedStrategy)
        );
        
        // Generate calendar data based on selected strategy
        const transformedData = generateSavingsCalendarData(selectedStrategyData);
        setCalendarData(transformedData);
      } catch (fetchError) {
        clearTimeout(timeoutId);
        console.error('SavingsCalendar - Fetch error:', fetchError);
        
        if (fetchError instanceof Error && fetchError.name === 'AbortError') {
          console.warn('SavingsCalendar - Request timed out after 10 seconds');
        }
        
        // Fall back to mock data on fetch error
        setCalendarData(generateMockSavingsData());
      }
    } catch (error) {
      const currentUserId = UserManager.getCurrentUserId();
      console.error('SavingsCalendar - Failed to fetch savings data:', error);
      console.error('SavingsCalendar - API URL was:', `${API_ENDPOINTS.recommendations}/savings-simulator`);
      console.error('SavingsCalendar - User ID was:', currentUserId);
      console.error('SavingsCalendar - useUserData:', useUserData, 'hasUserData:', (userSubscriptions?.length || 0) > 0);
      
      // Fall back to mock data
      setCalendarData(generateMockSavingsData());
    } finally {
      setLoading(false);
    }
  };

  const generateSavingsCalendarData = (strategyData: any): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      
      // Calculate daily savings based on strategy
      const dailySavings = strategyData ? strategyData.monthlySavings / 30 : 0;
      
      // Simulate varied savings throughout the month
      let savings = 0;
      if (selectedStrategy === 'aggressive') {
        // Aggressive strategy: immediate savings on certain days
        savings = day % 3 === 0 ? dailySavings * 2 : 0;
      } else if (selectedStrategy === 'rotation') {
        // Rotation strategy: savings when services are paused
        savings = day % 7 < 3 ? dailySavings : -dailySavings * 0.5; // Cost when active
      } else {
        // Bundle consolidation: steady moderate savings
        savings = dailySavings * 0.8;
      }
      
      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices: [], // Not needed for savings view
        savings: parseFloat(savings.toFixed(2))
      });
    }
    
    return data;
  };

  const generateMockSavingsData = (): CalendarDay[] => {
    const data: CalendarDay[] = [];
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const today = new Date();
      
      // Mock savings based on different patterns
      let savings = 0;
      if (selectedStrategy === 'aggressive') {
        savings = day % 5 === 0 ? 15.99 : day % 7 === 0 ? 14.99 : 0;
      } else if (selectedStrategy === 'rotation') {
        savings = day % 10 < 5 ? Math.random() * 10 + 5 : -(Math.random() * 8 + 7);
      } else {
        savings = Math.random() * 5 + 2;
      }
      
      data.push({
        date: dateStr,
        day,
        isCurrentMonth: true,
        isToday: dateStr === today.toISOString().split('T')[0],
        activeServices: [],
        savings: parseFloat(savings.toFixed(2))
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

  const strategies = [
    { id: 'aggressive', name: 'Aggressive Optimization', color: 'bg-red-100 text-red-800' },
    { id: 'rotation', name: 'Rotation Strategy', color: 'bg-blue-100 text-blue-800' },
    { id: 'bundle', name: 'Bundle Consolidation', color: 'bg-green-100 text-green-800' }
  ];

  const monthlyStats = {
    totalSavings: calendarData.filter(d => d.savings && d.savings > 0).reduce((sum, d) => sum + (d.savings || 0), 0),
    totalCosts: Math.abs(calendarData.filter(d => d.savings && d.savings < 0).reduce((sum, d) => sum + (d.savings || 0), 0)),
    savingsDays: calendarData.filter(d => d.savings && d.savings > 0).length,
    costDays: calendarData.filter(d => d.savings && d.savings < 0).length
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="ml-3 text-gray-600">Calculating savings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Strategy Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between space-y-4 md:space-y-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Savings Calendar</h2>
          <p className="text-gray-600 mt-1">
            Visualize your potential savings with different optimization strategies
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Strategy Selector */}
          <div className="flex space-x-2">
            {strategies.map((strategy) => (
              <button
                key={strategy.id}
                onClick={() => setSelectedStrategy(strategy.id)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedStrategy === strategy.id 
                    ? strategy.color
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {strategy.name}
              </button>
            ))}
          </div>
          
          {/* Navigation */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => navigateMonth('prev')}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              Today
            </button>
            <button
              onClick={() => navigateMonth('next')}
              className="p-2 text-gray-500 hover:text-gray-700"
            >
              →
            </button>
          </div>
        </div>
      </div>

      {/* Savings Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">
            +${monthlyStats.totalSavings.toFixed(2)}
          </div>
          <div className="text-sm text-green-700">Total Savings</div>
          <div className="text-xs text-green-600 mt-1">
            {monthlyStats.savingsDays} savings days
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-red-600">
            -${monthlyStats.totalCosts.toFixed(2)}
          </div>
          <div className="text-sm text-red-700">Active Costs</div>
          <div className="text-xs text-red-600 mt-1">
            {monthlyStats.costDays} active days
          </div>
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">
            ${(monthlyStats.totalSavings - monthlyStats.totalCosts).toFixed(2)}
          </div>
          <div className="text-sm text-blue-700">Net Savings</div>
          <div className="text-xs text-blue-600 mt-1">This month</div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">
            ${((monthlyStats.totalSavings - monthlyStats.totalCosts) * 12).toFixed(0)}
          </div>
          <div className="text-sm text-purple-700">Annual Projection</div>
          <div className="text-xs text-purple-600 mt-1">If sustained</div>
        </div>
      </div>

      {/* Calendar */}
      <CalendarView
        year={currentDate.getFullYear()}
        month={currentDate.getMonth()}
        data={calendarData}
        mode="savings"
      />

      {/* Strategy Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          {strategies.find(s => s.id === selectedStrategy)?.name} Strategy
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {selectedStrategy === 'aggressive' && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Quick Wins</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Cancel all unused subscriptions immediately for maximum savings
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Risk Level</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Low - You can always resubscribe when needed
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Effort Required</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Minimal - One-time cancellations
                </p>
              </div>
            </>
          )}
          
          {selectedStrategy === 'rotation' && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Smart Rotation</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Subscribe only when actively watching, pause between shows
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Risk Level</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Minimal - Never miss shows, just optimize timing
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Effort Required</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Moderate - Regular subscription management
                </p>
              </div>
            </>
          )}
          
          {selectedStrategy === 'bundle' && (
            <>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Bundle Benefits</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Consolidate to bundled services for better value
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Risk Level</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Minimal - Keep access to content while saving
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-900">Effort Required</h4>
                <p className="text-sm text-gray-600 mt-1">
                  Low - One-time switch to bundled plans
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SavingsCalendar;