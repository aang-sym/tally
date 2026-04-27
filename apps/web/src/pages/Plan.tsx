import React, { useState, useEffect } from 'react';
import { TrendingDown, Calendar, Bell, Settings } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

interface Subscription {
  id: string;
  serviceId: string;
  monthlyCost: number;
  isActive: boolean;
  service: {
    id: string;
    name: string;
    logoPath: string | null;
  };
}

interface PauseRecommendation {
  serviceId: string;
  serviceName: string;
  monthlyPrice: number;
  pauseFrom: string;
  pauseUntil: string;
  estimatedSavings: number;
  reason: string;
}

const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w92';

const formatMonth = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

const monthsBetween = (from: string, until: string) => {
  const a = new Date(from);
  const b = new Date(until);
  return Math.max(1, (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()));
};

// Generate a mock pause recommendation from a subscription while real math isn't wired
const mockRecommendation = (sub: Subscription): PauseRecommendation => {
  const now = new Date();
  const pauseFrom = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  const pauseUntil = new Date(now.getFullYear(), now.getMonth() + 3, 1);
  const months = monthsBetween(pauseFrom.toISOString(), pauseUntil.toISOString());
  return {
    serviceId: sub.serviceId,
    serviceName: sub.service.name,
    monthlyPrice: sub.monthlyCost,
    pauseFrom: pauseFrom.toISOString(),
    pauseUntil: pauseUntil.toISOString(),
    estimatedSavings: parseFloat((sub.monthlyCost * months).toFixed(2)),
    reason: 'No new episodes of your shows air during this window.',
  };
};

const ServiceLogo: React.FC<{ name: string; logoPath: string | null }> = ({ name, logoPath }) => {
  if (logoPath) {
    return (
      <img
        src={logoPath.startsWith('http') ? logoPath : `${TMDB_IMAGE_BASE}${logoPath}`}
        alt={name}
        className="w-10 h-10 rounded-lg object-contain bg-gray-800"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = 'none';
        }}
      />
    );
  }
  return (
    <div className="w-10 h-10 rounded-lg bg-gray-700 flex items-center justify-center text-xs font-bold text-gray-300">
      {name.slice(0, 2).toUpperCase()}
    </div>
  );
};

const PauseBar: React.FC<{ from: string; until: string }> = ({ from, until }) => {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
  ];
  const now = new Date();
  const fromDate = new Date(from);
  const untilDate = new Date(until);

  const windowMonths = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const isPause = d >= fromDate && d < untilDate;
    return { label: months[d.getMonth()], isPause };
  });

  return (
    <div className="flex gap-1 mt-3">
      {windowMonths.map(({ label, isPause }) => (
        <div key={label} className="flex-1 text-center">
          <div className={`h-2 rounded-full mb-1 ${isPause ? 'bg-emerald-500' : 'bg-gray-600'}`} />
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      ))}
    </div>
  );
};

const PlanCard: React.FC<{ sub: Subscription; rec: PauseRecommendation }> = ({ sub, rec }) => (
  <div className="bg-gray-800 border border-gray-700 rounded-xl p-5 space-y-4">
    {/* Header */}
    <div className="flex items-center gap-3">
      <ServiceLogo name={sub.service.name} logoPath={sub.service.logoPath} />
      <div className="flex-1 min-w-0">
        <h3 className="font-semibold text-white text-sm">{sub.service.name}</h3>
        <p className="text-gray-400 text-xs">${sub.monthlyCost.toFixed(2)}/mo</p>
      </div>
      <div className="text-right">
        <p className="text-emerald-400 font-bold text-lg">${rec.estimatedSavings}</p>
        <p className="text-gray-500 text-xs">potential saving</p>
      </div>
    </div>

    {/* Recommendation */}
    <div className="bg-gray-700/50 rounded-lg px-4 py-3 flex items-start gap-3">
      <TrendingDown className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-sm text-white font-medium">
          Pause {formatMonth(rec.pauseFrom)} – {formatMonth(rec.pauseUntil)}
        </p>
        <p className="text-xs text-gray-400 mt-0.5">{rec.reason}</p>
      </div>
    </div>

    {/* Timeline bar */}
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <Calendar className="w-3 h-3 text-gray-500" />
        <span className="text-xs text-gray-500 uppercase tracking-wide">Next 6 months</span>
      </div>
      <PauseBar from={rec.pauseFrom} until={rec.pauseUntil} />
      <div className="flex items-center gap-3 mt-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs text-gray-400">Pause window</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-gray-600" />
          <span className="text-xs text-gray-400">Active</span>
        </div>
      </div>
    </div>

    {/* Action */}
    <button
      className="w-full flex items-center justify-center gap-2 text-xs text-gray-400 border border-gray-600 rounded-lg py-2 hover:border-gray-500 hover:text-gray-300 transition-colors"
      onClick={() => {}}
    >
      <Bell className="w-3.5 h-3.5" />
      Set a reminder
    </button>
  </div>
);

const Plan: React.FC = () => {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const result = await apiRequest(API_ENDPOINTS.users.subscriptions(user.id));
        const subs: Subscription[] = (result.data?.subscriptions ?? [])
          .filter((s: any) => s.is_active)
          .map((s: any) => ({
            id: s.id,
            serviceId: s.service_id,
            monthlyCost: s.monthly_cost,
            isActive: s.is_active,
            service: {
              id: s.service?.id ?? s.service_id,
              name: s.service?.name ?? s.service_id,
              logoPath: s.service?.logo_path ?? null,
            },
          }));
        setSubscriptions(subs);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load plan');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white" />
      </div>
    );
  }

  if (error) {
    return <div className="p-6 text-center text-red-400 text-sm">{error}</div>;
  }

  if (subscriptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <Settings className="w-10 h-10 text-gray-600" />
        <div>
          <p className="text-white font-medium">No subscriptions yet</p>
          <p className="text-gray-400 text-sm mt-1">
            Add your subscriptions in Settings to see your pause plan.
          </p>
        </div>
      </div>
    );
  }

  const totalMonthly = subscriptions.reduce((sum, s) => sum + s.monthlyCost, 0);
  const recommendations = subscriptions.map(mockRecommendation);
  const totalSavings = recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Summary header */}
      <div className="bg-gray-800 border border-gray-700 rounded-xl p-5">
        <p className="text-gray-400 text-sm">You're paying</p>
        <p className="text-3xl font-bold text-white mt-1">
          ${totalMonthly.toFixed(2)}
          <span className="text-base font-normal text-gray-400">/mo</span>
        </p>
        <p className="text-gray-400 text-sm mt-1">
          across {subscriptions.length} service{subscriptions.length !== 1 ? 's' : ''}
        </p>
        {totalSavings > 0 && (
          <div className="mt-3 flex items-center gap-2 text-emerald-400 text-sm font-medium">
            <TrendingDown className="w-4 h-4" />
            Pause smartly and save up to ${totalSavings.toFixed(0)} this year
          </div>
        )}
      </div>

      {/* Per-service cards */}
      <div className="space-y-4">
        {subscriptions.map((sub, i) => {
          const rec = recommendations[i];
          if (!rec) return null;
          return <PlanCard key={sub.id} sub={sub} rec={rec} />;
        })}
      </div>

      <p className="text-center text-xs text-gray-600 pb-2">
        Pause recommendations are based on your watchlist activity. Real savings math coming soon.
      </p>
    </div>
  );
};

export default Plan;
