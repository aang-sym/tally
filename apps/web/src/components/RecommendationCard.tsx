import React, { useState } from 'react';

export interface CancellationRecommendation {
  serviceId: string;
  serviceName: string;
  type: 'cancel' | 'pause';
  reason: string;
  potentialSavings: {
    monthly?: number;
    annual?: number;
    shortTerm?: number;
  };
  confidence: number;
  showsCompleted?: number;
  showsInWatchlist?: number;
  nextContent?: string | null;
  safeDate?: string;
  resumeWhen?: string;
  recommendation?: string;
}

export interface SubscriptionRecommendation {
  serviceName: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  monthlyPrice: number;
  shows: string[];
  startDate: string;
  estimatedValue: number;
  confidence: number;
}

export interface OptimizationRecommendation {
  currentSituation: {
    activeServices: number;
    monthlyCost: number;
    annualCost: number;
    utilization: {
      watching: number;
      watchlist: number;
      completed: number;
    };
  };
  optimizedPlan: {
    recommendedServices: number;
    estimatedMonthlyCost: number;
    estimatedAnnualSavings: number;
    actions: Array<{
      action: string;
      service?: string;
      timing?: string;
      reason?: string;
      explanation?: string;
      estimatedSavings?: number;
    }>;
  };
  timeline: Array<{
    month: number;
    action: string;
    savings: number;
    reasoning: string;
  }>;
}

interface CancellationCardProps {
  recommendation: CancellationRecommendation;
  onAccept?: (() => void) | undefined;
  onReject?: (() => void) | undefined;
}

interface SubscriptionCardProps {
  recommendation: SubscriptionRecommendation;
  onAccept?: (() => void) | undefined;
  onReject?: (() => void) | undefined;
}

interface OptimizationCardProps {
  recommendation: OptimizationRecommendation;
  onViewDetails?: (() => void) | undefined;
}

const CancellationCard: React.FC<CancellationCardProps> = ({
  recommendation,
  onAccept,
  onReject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getTypeIcon = () => {
    return recommendation.type === 'cancel' ? '❌' : '⏸️';
  };

  const getTypeColor = () => {
    return recommendation.type === 'cancel'
      ? 'border-red-200 bg-red-50'
      : 'border-yellow-200 bg-yellow-50';
  };

  const getConfidenceColor = () => {
    if (recommendation.confidence >= 0.8) return 'text-green-600';
    if (recommendation.confidence >= 0.6) return 'text-yellow-600';
    return 'text-gray-600';
  };

  return (
    <div className={`border rounded-lg p-6 ${getTypeColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getTypeIcon()}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {recommendation.type === 'cancel' ? 'Cancel' : 'Pause'} {recommendation.serviceName}
            </h3>
            <p className="text-gray-600 text-sm">{recommendation.reason}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-green-600">
            $
            {recommendation.potentialSavings.monthly?.toFixed(2) ||
              recommendation.potentialSavings.shortTerm?.toFixed(2) ||
              '0.00'}
            <span className="text-sm text-gray-500">
              /{recommendation.potentialSavings.monthly ? 'mo' : '3mo'}
            </span>
          </div>
          <div className={`text-sm ${getConfidenceColor()}`}>
            {Math.round(recommendation.confidence * 100)}% confidence
          </div>
        </div>
      </div>

      {/* Additional Details */}
      <div className="mb-4">
        {recommendation.showsCompleted && (
          <p className="text-sm text-gray-600">
            ✅ {recommendation.showsCompleted} show{recommendation.showsCompleted !== 1 ? 's' : ''}{' '}
            completed
          </p>
        )}
        {recommendation.showsInWatchlist && (
          <p className="text-sm text-gray-600">
            📋 {recommendation.showsInWatchlist} show
            {recommendation.showsInWatchlist !== 1 ? 's' : ''} in watchlist
          </p>
        )}
        {recommendation.resumeWhen && (
          <p className="text-sm text-gray-600">🔄 Resume: {recommendation.resumeWhen}</p>
        )}
        {recommendation.safeDate && (
          <p className="text-sm text-gray-500">
            Safe to cancel after: {new Date(recommendation.safeDate).toLocaleDateString()}
          </p>
        )}
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
          {recommendation.recommendation && (
            <p className="text-sm text-gray-600 mb-2">{recommendation.recommendation}</p>
          )}
          {recommendation.potentialSavings.annual && (
            <p className="text-sm text-gray-600">
              Annual savings: ${recommendation.potentialSavings.annual.toFixed(2)}
            </p>
          )}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Less details ↑' : 'More details ↓'}
        </button>
        <div className="flex space-x-2">
          <button
            onClick={onReject}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Not now
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            {recommendation.type === 'cancel' ? 'Cancel subscription' : 'Pause subscription'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({
  recommendation,
  onAccept,
  onReject,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const getPriorityColor = () => {
    switch (recommendation.priority) {
      case 'high':
        return 'border-green-200 bg-green-50';
      case 'medium':
        return 'border-yellow-200 bg-yellow-50';
      case 'low':
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getPriorityIcon = () => {
    switch (recommendation.priority) {
      case 'high':
        return '🔥';
      case 'medium':
        return '⭐';
      case 'low':
        return '💡';
    }
  };

  return (
    <div className={`border rounded-lg p-6 ${getPriorityColor()}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">{getPriorityIcon()}</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              Subscribe to {recommendation.serviceName}
            </h3>
            <p className="text-gray-600 text-sm">{recommendation.reason}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold text-gray-900">
            ${recommendation.monthlyPrice.toFixed(2)}
            <span className="text-sm text-gray-500">/mo</span>
          </div>
          <div className="text-sm text-blue-600">Value: {recommendation.estimatedValue}/10</div>
        </div>
      </div>

      {/* Shows List */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 mb-2">
          Shows available ({recommendation.shows.length}):
        </p>
        <div className="flex flex-wrap gap-1">
          {recommendation.shows.map((show, index) => (
            <span
              key={index}
              className="px-2 py-1 bg-white bg-opacity-70 text-xs rounded-full text-gray-700"
            >
              {show}
            </span>
          ))}
        </div>
      </div>

      {/* Expandable Details */}
      {isExpanded && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
          <p className="text-sm text-gray-600 mb-2">
            Recommended start: {new Date(recommendation.startDate).toLocaleDateString()}
          </p>
          <p className="text-sm text-gray-600">
            Confidence: {Math.round(recommendation.confidence * 100)}%
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Less details ↑' : 'More details ↓'}
        </button>
        <div className="flex space-x-2">
          <button
            onClick={onReject}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Not interested
          </button>
          <button
            onClick={onAccept}
            className="px-3 py-1 text-sm bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            Subscribe
          </button>
        </div>
      </div>
    </div>
  );
};

const OptimizationCard: React.FC<OptimizationCardProps> = ({ recommendation, onViewDetails }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center">
          <span className="text-2xl mr-3">🎯</span>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Subscription Optimization Plan</h3>
            <p className="text-gray-600 text-sm">
              Reduce from {recommendation.currentSituation.activeServices} to{' '}
              {recommendation.optimizedPlan.recommendedServices} services
            </p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">
            ${recommendation.optimizedPlan.estimatedAnnualSavings.toFixed(2)}
            <span className="text-sm text-gray-500">/year</span>
          </div>
          <div className="text-sm text-gray-600">
            ${recommendation.optimizedPlan.estimatedMonthlyCost.toFixed(2)}/mo
          </div>
        </div>
      </div>

      {/* Current vs Optimized */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <h4 className="font-semibold text-gray-900 text-sm mb-2">Current</h4>
          <p className="text-sm text-gray-600">
            ${recommendation.currentSituation.monthlyCost.toFixed(2)}/mo
          </p>
          <p className="text-xs text-gray-500">
            {recommendation.currentSituation.utilization.watching} watching,{' '}
            {recommendation.currentSituation.utilization.watchlist} queued
          </p>
        </div>
        <div className="bg-white bg-opacity-50 rounded-lg p-3">
          <h4 className="font-semibold text-green-700 text-sm mb-2">Optimized</h4>
          <p className="text-sm text-green-700">
            ${recommendation.optimizedPlan.estimatedMonthlyCost.toFixed(2)}/mo
          </p>
          <p className="text-xs text-gray-500">
            {recommendation.optimizedPlan.recommendedServices} services
          </p>
        </div>
      </div>

      {/* Quick Actions Preview */}
      <div className="mb-4">
        <h4 className="font-semibold text-gray-900 text-sm mb-2">Recommended Actions:</h4>
        <div className="space-y-1">
          {recommendation.optimizedPlan.actions
            .slice(0, isExpanded ? undefined : 2)
            .map((action, index) => (
              <div key={index} className="flex items-center text-sm text-gray-600">
                <span className="mr-2">
                  {action.action === 'cancel' ? '❌' : action.action === 'rotate' ? '🔄' : '📋'}
                </span>
                {action.service && <span className="font-medium mr-2">{action.service}:</span>}
                <span>{action.reason || action.explanation}</span>
                {action.estimatedSavings && (
                  <span className="ml-auto text-green-600 font-medium">
                    +${action.estimatedSavings.toFixed(2)}
                  </span>
                )}
              </div>
            ))}
          {!isExpanded && recommendation.optimizedPlan.actions.length > 2 && (
            <p className="text-xs text-gray-500">
              +{recommendation.optimizedPlan.actions.length - 2} more actions...
            </p>
          )}
        </div>
      </div>

      {/* Timeline Preview */}
      {isExpanded && (
        <div className="bg-white bg-opacity-50 rounded-lg p-4 mb-4">
          <h4 className="font-semibold text-gray-900 mb-2">3-Month Timeline</h4>
          <div className="space-y-2">
            {recommendation.timeline.map((item, index) => (
              <div key={index} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium">Month {item.month}:</span> {item.action}
                </div>
                <span className="text-green-600 font-medium">
                  {item.savings > 0 ? `$${item.savings.toFixed(2)}` : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-sm text-blue-600 hover:text-blue-700"
        >
          {isExpanded ? 'Less details ↑' : 'View timeline ↓'}
        </button>
        <div className="flex space-x-2">
          <button
            onClick={onViewDetails}
            className="px-3 py-1 text-sm border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            View full plan
          </button>
          <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700">
            Start optimization
          </button>
        </div>
      </div>
    </div>
  );
};

// Main export component that handles different recommendation types
export const RecommendationCard: React.FC<{
  type: 'cancellation' | 'subscription' | 'optimization';
  recommendation:
    | CancellationRecommendation
    | SubscriptionRecommendation
    | OptimizationRecommendation;
  onAccept?: () => void;
  onReject?: () => void;
  onViewDetails?: () => void;
}> = ({ type, recommendation, onAccept, onReject, onViewDetails }) => {
  switch (type) {
    case 'cancellation':
      return (
        <CancellationCard
          recommendation={recommendation as CancellationRecommendation}
          onAccept={onAccept}
          onReject={onReject}
        />
      );
    case 'subscription':
      return (
        <SubscriptionCard
          recommendation={recommendation as SubscriptionRecommendation}
          onAccept={onAccept}
          onReject={onReject}
        />
      );
    case 'optimization':
      return (
        <OptimizationCard
          recommendation={recommendation as OptimizationRecommendation}
          onViewDetails={onViewDetails}
        />
      );
    default:
      return null;
  }
};

export default RecommendationCard;
