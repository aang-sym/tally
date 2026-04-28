import React, { useState, useEffect } from 'react';
import { Settings, ChevronRight } from 'lucide-react';
import { API_ENDPOINTS, apiRequest } from '../config/api';
import { useAuth } from '../context/AuthContext';

// Accent: lighter pink-300 per design
const ACCENT = '#f9a8d4'; // tailwind pink-300
const ACCENT_DIM = 'rgba(249,168,212,0.50)';
const TMDB_IMG = (path: string, size = 'w45') => `https://image.tmdb.org/t/p/${size}${path}`;

interface UpcomingShow {
  title: string;
  posterPath: string | null;
  tmdbId: number | null;
  nextEpisodeName: string | null;
  nextAirDate: string | null;
  releasePattern: 'binge' | 'weekly' | 'unknown';
  busyFrom: string;
  busyUntil: string;
}

interface GapEntry {
  from: string;
  until: string;
  days: number;
}

interface PauseRecommendation {
  serviceId: string;
  serviceName: string;
  monthlyPrice: number;
  logoPath: string | null;
  pauseFrom: string | null;
  pauseUntil: string | null;
  allGaps: GapEntry[];
  estimatedSavings: number;
  whyPause: string | null;
  whyPauseShow: string | null;
  whyPauseDate: string | null;
  reason: string;
  showCount: number;
  hasEpisodeData: boolean;
  upcomingShows: UpcomingShow[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtShort = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

const fmtMonthYear = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

const fmtMonth = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short' });

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

// ─── Provider logo — real TMDB image or fallback initial badge ────────────────

const ProviderLogo: React.FC<{ name: string; logoPath: string | null }> = ({ name, logoPath }) => {
  const [err, setErr] = useState(false);
  if (logoPath && !err) {
    return (
      <img
        src={TMDB_IMG(logoPath, 'w45')}
        alt={name}
        className="w-9 h-9 rounded-lg object-contain bg-[#1c1c22] flex-shrink-0"
        onError={() => setErr(true)}
      />
    );
  }
  // Fallback: coloured initial pill (matches design mockup style)
  const initials = name.length <= 3 ? name : name.slice(0, 2).toUpperCase();
  return (
    <div
      className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] flex-shrink-0"
      style={{
        background: 'rgba(249,168,212,0.12)',
        color: ACCENT,
        border: `1px solid rgba(249,168,212,0.25)`,
      }}
    >
      {initials}
    </div>
  );
};

// ─── Show poster thumbnail ────────────────────────────────────────────────────

const Poster: React.FC<{ title: string; posterPath: string | null }> = ({ title, posterPath }) => {
  const [err, setErr] = useState(false);
  if (posterPath && !err) {
    return (
      <img
        src={TMDB_IMG(posterPath, 'w92')}
        alt={title}
        className="w-9 h-[54px] rounded object-cover flex-shrink-0 bg-[#1c1c22]"
        onError={() => setErr(true)}
      />
    );
  }
  return (
    <div className="w-9 h-[54px] rounded flex-shrink-0 bg-[#1c1c22] flex items-center justify-center text-[9px] text-gray-600 font-mono">
      {title.slice(0, 1)}
    </div>
  );
};

// ─── 12-month bar (J–D squares) ──────────────────────────────────────────────

const MonthBar: React.FC<{ allGaps: GapEntry[]; upcomingShows: UpcomingShow[] }> = ({
  allGaps,
  upcomingShows,
}) => {
  const now = new Date();
  const LABELS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];

  const months = LABELS.map((label, i) => {
    const start = new Date(now.getFullYear(), i, 1);
    const end = new Date(now.getFullYear(), i + 1, 1);
    const isPast = end <= now;
    const isGap = allGaps.some((g) => new Date(g.from) < end && new Date(g.until) > start);
    const isBusy = upcomingShows.some(
      (s) => new Date(s.busyFrom) < end && new Date(s.busyUntil) > start
    );
    return { label, isPast, isGap, isBusy };
  });

  return (
    <div className="flex items-end gap-[3px]">
      {months.map(({ label, isPast, isGap, isBusy }, i) => (
        <div key={i} className="flex flex-col items-center gap-0.5">
          <div
            style={{
              width: 10,
              height: 18,
              borderRadius: 2,
              background: isPast
                ? '#1a1a22'
                : isGap
                  ? ACCENT_DIM
                  : isBusy
                    ? 'rgba(168,85,247,0.55)'
                    : '#24242c',
              border: `1px solid ${isPast ? '#24242c' : isGap ? 'transparent' : isBusy ? 'transparent' : '#2e2e38'}`,
            }}
          />
          <span className="text-[7px] font-mono" style={{ color: '#4a4a58' }}>
            {label}
          </span>
        </div>
      ))}
    </div>
  );
};

// ─── Daily heatmap (WHOOP-style, 26 weeks) ───────────────────────────────────

const DailyHeatmap: React.FC<{ allGaps: GapEntry[]; upcomingShows: UpcomingShow[] }> = ({
  allGaps,
  upcomingShows,
}) => {
  const now = new Date();
  const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
  const WEEK_COUNT = 26;

  const start = new Date(now);
  const dow = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - dow);
  start.setHours(0, 0, 0, 0);

  const gapSet = new Set<string>();
  for (const g of allGaps) {
    const d = new Date(g.from);
    d.setHours(0, 0, 0, 0);
    const end = new Date(g.until);
    while (d < end) {
      gapSet.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  }
  const busySet = new Set<string>();
  for (const s of upcomingShows) {
    const d = new Date(s.busyFrom);
    d.setHours(0, 0, 0, 0);
    const end = new Date(s.busyUntil);
    while (d < end) {
      busySet.add(d.toISOString().slice(0, 10));
      d.setDate(d.getDate() + 1);
    }
  }

  const weeks: Array<Array<{ iso: string; isGap: boolean; isBusy: boolean; isPast: boolean }>> = [];
  const monthHeaders: Array<{ weekIndex: number; label: string }> = [];
  let lastMonth = -1;

  for (let w = 0; w < WEEK_COUNT; w++) {
    const week: (typeof weeks)[0] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + w * 7 + d);
      const iso = day.toISOString().slice(0, 10);
      const m = day.getMonth();
      if (m !== lastMonth) {
        monthHeaders.push({
          weekIndex: w,
          label:
            ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][
              m
            ] ?? '',
        });
        lastMonth = m;
      }
      week.push({ iso, isGap: gapSet.has(iso), isBusy: busySet.has(iso), isPast: day < now });
    }
    weeks.push(week);
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-max">
        <div className="flex mb-1" style={{ paddingLeft: 20 }}>
          {weeks.map((_, wi) => {
            const hdr = monthHeaders.find((h) => h.weekIndex === wi);
            return (
              <div key={wi} className="w-4 flex-shrink-0">
                {hdr && (
                  <span
                    className="text-[8px] font-mono whitespace-nowrap"
                    style={{ color: '#4a4a58' }}
                  >
                    {hdr.label}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {DAY_LABELS.map((lbl, di) => (
          <div key={di} className="flex items-center mb-px">
            <span
              className="text-[8px] font-mono w-4 flex-shrink-0 text-right pr-1"
              style={{ color: '#4a4a58' }}
            >
              {di % 2 === 0 ? lbl : ''}
            </span>
            {weeks.map((week, wi) => {
              const cell = week[di];
              if (!cell) return <div key={wi} className="w-4 h-3 flex-shrink-0" />;
              return (
                <div
                  key={wi}
                  className="w-3 h-3 flex-shrink-0 rounded-[2px] mx-px"
                  style={{
                    background: cell.isPast
                      ? '#1a1a22'
                      : cell.isGap
                        ? ACCENT_DIM
                        : cell.isBusy
                          ? 'rgba(168,85,247,0.55)'
                          : '#24242c',
                  }}
                  title={cell.iso}
                />
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-4 mt-2 pl-5">
          {[
            { color: ACCENT_DIM, label: 'Pause' },
            { color: 'rgba(168,85,247,0.55)', label: 'Watching' },
            { color: '#24242c', label: 'Inactive' },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-[2px]" style={{ background: color }} />
              <span className="text-[9px] font-mono" style={{ color: '#6b6a68' }}>
                {label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Expanded row detail ──────────────────────────────────────────────────────

const RowDetail: React.FC<{
  rec: PauseRecommendation;
  viewMode: 'month' | 'day';
  onToggleView: () => void;
}> = ({ rec, viewMode, onToggleView }) => (
  <div
    className="px-6 py-5 space-y-4"
    style={{ background: 'rgba(0,0,0,0.25)', borderTop: '1px solid rgba(255,255,255,0.04)' }}
  >
    {/* Timeline toggle header */}
    <div className="flex items-center justify-between">
      <span
        className="text-[10px] font-mono uppercase tracking-[0.12em]"
        style={{ color: '#6b6a68' }}
      >
        Gap timeline
      </span>
      <button
        onClick={onToggleView}
        className="text-[10px] font-mono px-2 py-0.5 rounded transition-colors"
        style={{
          color: '#a5a3a0',
          border: '1px solid #2e2e38',
          background: 'transparent',
        }}
        onMouseEnter={(e) => ((e.target as HTMLButtonElement).style.color = '#f4f3ef')}
        onMouseLeave={(e) => ((e.target as HTMLButtonElement).style.color = '#a5a3a0')}
      >
        {viewMode === 'month' ? 'Daily view' : 'Month view'}
      </button>
    </div>

    {viewMode === 'month' ? (
      <MonthBar allGaps={rec.allGaps} upcomingShows={rec.upcomingShows} />
    ) : (
      <DailyHeatmap allGaps={rec.allGaps} upcomingShows={rec.upcomingShows} />
    )}

    {/* Why pause / back on */}
    {rec.whyPause && (
      <p className="text-xs font-mono" style={{ color: '#6b6a68' }}>
        Resume when <span style={{ color: '#a5a3a0' }}>{rec.whyPause}</span>
      </p>
    )}

    {/* All gaps */}
    {rec.allGaps.length > 1 && (
      <div className="space-y-1">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
          style={{ color: '#4a4a58' }}
        >
          All pause windows
        </p>
        {rec.allGaps.map((g, i) => (
          <div key={i} className="flex items-center justify-between">
            <span className="text-xs font-mono" style={{ color: '#a5a3a0' }}>
              {fmtShort(g.from)} – {fmtShort(g.until)}
            </span>
            <span className="text-xs font-mono" style={{ color: '#6b6a68' }}>
              {g.days}d
            </span>
          </div>
        ))}
      </div>
    )}

    {/* Upcoming shows with real posters */}
    {rec.upcomingShows.length > 0 && (
      <div className="space-y-2.5">
        <p
          className="text-[10px] font-mono uppercase tracking-[0.12em]"
          style={{ color: '#4a4a58' }}
        >
          Shows on this service
        </p>
        {rec.upcomingShows.map((show, i) => (
          <div key={i} className="flex items-center gap-3">
            <Poster title={show.title} posterPath={show.posterPath} />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-0.5">
                <p className="text-sm font-medium truncate" style={{ color: '#f4f3ef' }}>
                  {show.title}
                </p>
                {show.releasePattern !== 'unknown' && (
                  <span
                    className="text-[9px] font-mono px-1.5 py-px rounded flex-shrink-0"
                    style={
                      show.releasePattern === 'binge'
                        ? { background: 'rgba(168,85,247,0.2)', color: '#c084fc' }
                        : { background: 'rgba(59,130,246,0.2)', color: '#93c5fd' }
                    }
                  >
                    {show.releasePattern}
                  </span>
                )}
              </div>
              {show.nextEpisodeName && (
                <p className="text-xs font-mono truncate" style={{ color: '#6b6a68' }}>
                  Next: {show.nextEpisodeName}
                </p>
              )}
            </div>
            <div className="text-right flex-shrink-0">
              {show.nextAirDate && (
                <p className="text-xs font-mono font-medium" style={{ color: ACCENT }}>
                  {fmtShort(show.nextAirDate)}
                </p>
              )}
              {show.releasePattern === 'binge' && (
                <p className="text-[9px] font-mono" style={{ color: '#4a4a58' }}>
                  +14d watch
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

// ─── Table row ────────────────────────────────────────────────────────────────

const PlanRow: React.FC<{ rec: PauseRecommendation }> = ({ rec }) => {
  const [expanded, setExpanded] = useState(false);
  const [viewMode, setViewMode] = useState<'month' | 'day'>('month');
  const hasPause = rec.pauseFrom && rec.pauseUntil;

  const showCount = rec.showCount || rec.upcomingShows.length;
  const showCountLabel =
    showCount === 0 ? 'nothing you track' : `${showCount} show${showCount !== 1 ? 's' : ''}`;

  // Window: "Jun — Aug" with month count below
  const windowLabel = hasPause ? `${fmtMonth(rec.pauseFrom!)} — ${fmtMonth(rec.pauseUntil!)}` : '—';
  const pauseDays = hasPause ? daysBetween(rec.pauseFrom!, rec.pauseUntil!) : 0;
  const pauseMonthsLabel =
    pauseDays >= 28 ? `${Math.round(pauseDays / 30)}mo` : pauseDays > 0 ? `${pauseDays}d` : '';

  // "Why pause" reason line
  const whyPauseShort =
    rec.upcomingShows.length === 0
      ? 'No tracked shows airing'
      : rec.upcomingShows.length === 1
        ? `Between airings${rec.upcomingShows[0]?.releasePattern === 'binge' ? ' (binge)' : ''}`
        : 'Between seasons';

  // "back Jun 25 · Avatar..." second line
  const backLine =
    rec.whyPauseDate && rec.whyPauseShow
      ? `back ${rec.whyPauseDate} · ${rec.whyPauseShow}`
      : rec.whyPause
        ? `back ${rec.whyPause}`
        : null;

  return (
    <>
      <tr
        onClick={() => setExpanded((v) => !v)}
        className="cursor-pointer transition-colors"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
        onMouseEnter={(e) =>
          ((e.currentTarget as HTMLTableRowElement).style.background = 'rgba(255,255,255,0.02)')
        }
        onMouseLeave={(e) =>
          ((e.currentTarget as HTMLTableRowElement).style.background = 'transparent')
        }
      >
        {/* PROVIDER */}
        <td className="py-4 pr-4" style={{ paddingLeft: 0 }}>
          <div className="flex items-center gap-3">
            <ProviderLogo name={rec.serviceName} logoPath={rec.logoPath} />
            <div className="min-w-0">
              <p className="text-sm font-semibold" style={{ color: '#f4f3ef' }}>
                {rec.serviceName}
              </p>
              <p
                className="text-[11px] font-mono truncate max-w-[140px]"
                style={{ color: '#4a4a58' }}
              >
                {showCountLabel}
              </p>
            </div>
          </div>
        </td>

        {/* WHY PAUSE */}
        <td className="py-4 px-4">
          <p className="text-sm" style={{ color: '#a5a3a0' }}>
            {whyPauseShort}
          </p>
          {backLine && (
            <p
              className="text-[11px] font-mono mt-0.5 truncate max-w-[220px]"
              style={{ color: '#4a4a58' }}
            >
              {backLine}
            </p>
          )}
        </td>

        {/* GAP TIMELINE */}
        <td className="py-4 px-4">
          <MonthBar allGaps={rec.allGaps} upcomingShows={rec.upcomingShows} />
        </td>

        {/* WINDOW */}
        <td className="py-4 px-4 text-right">
          <p className="text-sm font-mono whitespace-nowrap" style={{ color: '#f4f3ef' }}>
            {windowLabel}
          </p>
          {pauseMonthsLabel && (
            <p className="text-[11px] font-mono" style={{ color: '#4a4a58' }}>
              {pauseMonthsLabel}
            </p>
          )}
        </td>

        {/* SAVE */}
        <td className="py-4 text-right whitespace-nowrap" style={{ paddingRight: 0 }}>
          <span
            className="text-sm font-mono font-semibold"
            style={{ color: rec.estimatedSavings > 0 ? ACCENT : '#4a4a58' }}
          >
            {rec.estimatedSavings > 0 ? `+$${rec.estimatedSavings.toFixed(2)}` : '—'}
          </span>
          <ChevronRight
            className="inline-block ml-1 w-3 h-3 transition-transform"
            style={{
              color: '#4a4a58',
              transform: expanded ? 'rotate(90deg)' : 'none',
            }}
          />
        </td>
      </tr>

      {expanded && (
        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
          <td colSpan={5} className="p-0">
            <RowDetail
              rec={rec}
              viewMode={viewMode}
              onToggleView={() => setViewMode((v) => (v === 'month' ? 'day' : 'month'))}
            />
          </td>
        </tr>
      )}
    </>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

const Plan: React.FC = () => {
  const { user } = useAuth();
  const [recommendations, setRecommendations] = useState<PauseRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.id) return;
    const load = async () => {
      try {
        setLoading(true);
        const result = await apiRequest(API_ENDPOINTS.users.plan(user.id));
        const recs: PauseRecommendation[] = (result.data?.recommendations ?? []).map((r: any) => ({
          serviceId: r.serviceId,
          serviceName: r.serviceName,
          monthlyPrice: r.monthlyPrice,
          logoPath: r.logoPath ?? null,
          pauseFrom: r.pauseFrom ?? null,
          pauseUntil: r.pauseUntil ?? null,
          allGaps: r.allGaps ?? [],
          estimatedSavings: r.estimatedSavings,
          whyPause: r.whyPause ?? null,
          whyPauseShow: r.whyPauseShow ?? null,
          whyPauseDate: r.whyPauseDate ?? null,
          reason: r.reason,
          showCount: r.showCount ?? 0,
          hasEpisodeData: r.hasEpisodeData ?? false,
          upcomingShows: (r.upcomingShows ?? []).map((s: any) => ({
            title: s.title,
            posterPath: s.posterPath ?? null,
            tmdbId: s.tmdbId ?? null,
            nextEpisodeName: s.nextEpisodeName ?? null,
            nextAirDate: s.nextAirDate ?? null,
            releasePattern: s.releasePattern ?? 'unknown',
            busyFrom: s.busyFrom,
            busyUntil: s.busyUntil,
          })),
        }));
        setRecommendations(recs);
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
        <div
          className="animate-spin rounded-full h-8 w-8 border-b-2"
          style={{ borderColor: ACCENT }}
        />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center text-sm" style={{ color: '#f87171' }}>
        {error}
      </div>
    );
  }

  if (recommendations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4 text-center px-6">
        <Settings className="w-10 h-10" style={{ color: '#2e2e38' }} />
        <div>
          <p className="font-semibold" style={{ color: '#f4f3ef' }}>
            No subscriptions yet
          </p>
          <p className="text-sm mt-1" style={{ color: '#6b6a68' }}>
            Add your subscriptions in Settings to see your pause plan.
          </p>
        </div>
      </div>
    );
  }

  const totalMonthly = recommendations.reduce((sum, r) => sum + r.monthlyPrice, 0);
  const totalSavings = recommendations.reduce((sum, r) => sum + r.estimatedSavings, 0);
  const gapsCount = recommendations.filter((r) => r.pauseFrom).length;
  const trackingCount = recommendations.reduce((sum, r) => sum + r.upcomingShows.length, 0);
  const airingNow = recommendations.reduce(
    (sum, r) =>
      sum +
      r.upcomingShows.filter((s) => {
        const now = new Date();
        return new Date(s.busyFrom) <= now && new Date(s.busyUntil) >= now;
      }).length,
    0
  );

  const firstGap = recommendations.find((r) => r.pauseFrom);
  const lastGap = [...recommendations].reverse().find((r) => r.pauseUntil);
  const savingsRange =
    firstGap && lastGap
      ? `${fmtMonthYear(firstGap.pauseFrom!)} — ${fmtMonthYear(lastGap.pauseUntil!)}`
      : '';

  const now = new Date();
  const seasonLabel = (() => {
    const m = now.getMonth();
    if (m >= 2 && m <= 4) return 'Spring';
    if (m >= 5 && m <= 7) return 'Summer';
    if (m >= 8 && m <= 10) return 'Autumn';
    return 'Winter';
  })();

  return (
    <div className="min-h-screen" style={{ background: '#0a0a0c', color: '#f4f3ef' }}>
      <div className="max-w-5xl mx-auto px-5 py-8 space-y-6">
        {/* ── Header label ──────────────────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <p
            className="text-[11px] font-mono uppercase tracking-[0.12em]"
            style={{ color: '#6b6a68' }}
          >
            Your plan · {seasonLabel} {now.getFullYear()}
          </p>
          <p className="text-[11px] font-mono" style={{ color: '#4a4a58' }}>
            Updated just now
          </p>
        </div>

        {/* ── Stats card ────────────────────────────────────────────────── */}
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: 'linear-gradient(180deg, #15151a, #101013)',
            border: '1px solid #24242c',
          }}
        >
          {/* Stat strip — 4 cells */}
          <div
            className="grid grid-cols-2 md:grid-cols-4"
            style={{ borderBottom: '1px solid #24242c' }}
          >
            {/* Gaps identified */}
            <div
              className="p-5 md:p-7"
              style={{ borderRight: '1px solid #24242c', borderBottom: undefined }}
            >
              <p
                className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
                style={{ color: '#6b6a68' }}
              >
                Gaps identified
              </p>
              <p
                className="text-[52px] leading-none tracking-[-0.02em]"
                style={{ fontFamily: 'Georgia, serif', color: '#f4f3ef' }}
              >
                {gapsCount}
              </p>
              <p className="text-[11px] font-mono mt-2" style={{ color: '#4a4a58' }}>
                across {recommendations.length} provider{recommendations.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Saving potential — accent highlighted */}
            <div
              className="p-5 md:p-7 relative"
              style={{
                borderRight: '1px solid #24242c',
                background: `radial-gradient(80% 120% at 100% 0%, rgba(249,168,212,0.12), transparent 60%)`,
              }}
            >
              <p
                className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
                style={{ color: ACCENT }}
              >
                Saving potential
              </p>
              <p
                className="text-[52px] leading-none tracking-[-0.02em]"
                style={{ fontFamily: 'Georgia, serif', color: ACCENT }}
              >
                ${totalSavings.toFixed(2)}
              </p>
              <p className="text-[11px] font-mono mt-2" style={{ color: '#4a4a58' }}>
                {savingsRange}
              </p>
            </div>

            {/* Active */}
            <div className="p-5 md:p-7" style={{ borderRight: '1px solid #24242c' }}>
              <p
                className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
                style={{ color: '#6b6a68' }}
              >
                Active
              </p>
              <p
                className="text-[52px] leading-none tracking-[-0.02em]"
                style={{ fontFamily: 'Georgia, serif', color: '#f4f3ef' }}
              >
                {recommendations.length}
              </p>
              <p className="text-[11px] font-mono mt-2" style={{ color: '#4a4a58' }}>
                subscriptions · ${totalMonthly.toFixed(0)}/mo
              </p>
            </div>

            {/* Tracking — accent glow top-right */}
            <div
              className="p-5 md:p-7 relative"
              style={{
                background: `radial-gradient(60% 80% at 90% 10%, rgba(249,168,212,0.10), transparent 70%)`,
              }}
            >
              <p
                className="text-[10px] font-mono uppercase tracking-[0.12em] mb-2"
                style={{ color: '#6b6a68' }}
              >
                Tracking
              </p>
              <p
                className="text-[52px] leading-none tracking-[-0.02em]"
                style={{ fontFamily: 'Georgia, serif', color: '#f4f3ef' }}
              >
                {trackingCount}
              </p>
              <p className="text-[11px] font-mono mt-2" style={{ color: '#4a4a58' }}>
                shows{airingNow > 0 ? ` · ${airingNow} airing now` : ''}
              </p>
            </div>
          </div>

          {/* ── Gap table ─────────────────────────────────────────────────── */}
          <div className="px-5 md:px-6 py-1">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid #24242c' }}>
                  {['Provider', 'Why pause', 'Gap timeline', 'Window', 'Save'].map((h, i) => (
                    <th
                      key={h}
                      className={`py-3 text-[10px] font-mono uppercase tracking-[0.1em] font-normal ${i >= 3 ? 'text-right' : 'text-left'}`}
                      style={{
                        color: '#4a4a58',
                        paddingLeft: i === 0 ? 0 : undefined,
                        paddingRight: i === 4 ? 0 : undefined,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recommendations.map((rec) => (
                  <PlanRow key={rec.serviceId} rec={rec} />
                ))}
              </tbody>
            </table>
          </div>

          {/* ── Footer ────────────────────────────────────────────────────── */}
          <div
            className="px-5 md:px-7 py-4 flex flex-wrap items-center justify-between gap-3"
            style={{ borderTop: '1px solid #24242c' }}
          >
            <p className="text-[12px] font-mono" style={{ color: '#4a4a58' }}>
              We'll remind you 24h before each pause starts.
            </p>
            <div className="flex items-center gap-3">
              <button
                className="text-[13px] px-4 h-10 rounded-full transition-colors"
                style={{ border: '1px solid #2e2e38', color: '#a5a3a0', background: 'transparent' }}
              >
                Manage subscriptions
              </button>
              <button
                className="text-[13px] px-5 h-10 rounded-full font-semibold flex items-center gap-2 transition-colors"
                style={{ background: ACCENT, color: '#0a0a0c' }}
              >
                Pause schedule
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-[10px] font-mono pb-2" style={{ color: '#2e2e38' }}>
          Pause windows based on upcoming episode air dates from your watchlist.
        </p>
      </div>
    </div>
  );
};

export default Plan;
