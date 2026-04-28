/* ================================================================
   Tally — Show Detail (iOS 26)
   Adapted from desktop Show Detail for mobile
   ================================================================ */

const ST = {
  bg: '#08080F',
  surface: '#0f0f16',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f0',
  text2: 'rgba(245,244,240,0.55)',
  text3: 'rgba(245,244,240,0.30)',
  accent: '#FF3D8B',
  head: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
  display: "-apple-system, 'SF Pro Rounded', system-ui, sans-serif",
  mono: "'SF Mono', 'Geist Mono', ui-monospace, monospace",
};

/* ── Data (same as desktop) ── */
const SHOW = {
  title: 'Invincible',
  year: '2021–now',
  genres: ['Animation', 'Action', 'Adventure'],
  rating: 8.7,
  ratingCount: '322K',
  status: 'Returning Series',
  seasons: 4,
  totalEpisodes: 32,
  overview:
    "Mark Grayson is a normal teenager except for the fact that his father is the most powerful superhero on the planet. Shortly after his seventeenth birthday, Mark begins to develop powers of his own and enters into his father's tutelage.",
  service: { id: 'prime', name: 'Prime Video', short: 'P', color: '#1399ff', price: 14.99 },
  otherServices: [{ name: 'Paramount+', short: 'P+', color: '#0068ff' }],
  posterBg: '#1a1040',
  posterFg: '#6b8aff',
};

const USER_PROGRESS = { currentSeason: 2, currentEpisode: 4, watchedTotal: 12 };

const SEASONS_DATA = [
  {
    num: 1,
    year: 2021,
    episodes: [
      { num: 1, title: "It's About Time", date: 'Mar 25, 2021', watched: true },
      { num: 2, title: 'Here Goes Nothing', date: 'Mar 25, 2021', watched: true },
      { num: 3, title: 'Who You Calling Ugly?', date: 'Apr 2, 2021', watched: true },
      { num: 4, title: 'Neil Armstrong, Eat Your Heart Out', date: 'Apr 9, 2021', watched: true },
      { num: 5, title: 'That Actually Hurt', date: 'Apr 16, 2021', watched: true },
      { num: 6, title: 'You Look Kinda Dead', date: 'Apr 23, 2021', watched: true },
      { num: 7, title: 'We Need to Talk', date: 'Apr 23, 2021', watched: true },
      { num: 8, title: 'Where I Really Come From', date: 'Apr 30, 2021', watched: true },
    ],
  },
  {
    num: 2,
    year: 2023,
    episodes: [
      { num: 1, title: 'A Lesson for Your Next Life', date: 'Nov 3, 2023', watched: true },
      {
        num: 2,
        title: 'In About Six Hours I Lose My Virginity',
        date: 'Nov 10, 2023',
        watched: true,
      },
      { num: 3, title: 'This Missive, This Machination!', date: 'Nov 17, 2023', watched: true },
      { num: 4, title: "It's Been a While", date: 'Nov 24, 2023', watched: false },
      { num: 5, title: 'This Must Come as a Shock', date: 'Dec 1, 2023', watched: false },
      { num: 6, title: "It's Not That Simple", date: 'Dec 8, 2023', watched: false },
      { num: 7, title: "I'm Not Going Anywhere", date: 'Dec 15, 2023', watched: false },
      { num: 8, title: 'I Thought You Were Stronger', date: 'Dec 22, 2023', watched: false },
    ],
  },
  {
    num: 3,
    year: 2024,
    episodes: [
      { num: 1, title: 'Together Again', date: 'Feb 6, 2025', watched: false },
      { num: 2, title: 'Out of My League', date: 'Feb 13, 2025', watched: false },
      { num: 3, title: 'Small Mercies', date: 'Feb 20, 2025', watched: false },
      { num: 4, title: 'All That Lies Ahead', date: 'Feb 27, 2025', watched: false },
      { num: 5, title: 'A New Chapter', date: 'Mar 6, 2025', watched: false },
      { num: 6, title: 'The Hard Truth', date: 'Mar 13, 2025', watched: false },
      { num: 7, title: 'Everything in Its Right Place', date: 'Mar 20, 2025', watched: false },
      { num: 8, title: 'All Roads Lead Here', date: 'Mar 27, 2025', watched: false },
    ],
  },
  {
    num: 4,
    year: 2026,
    airing: true,
    episodes: [
      { num: 1, title: 'Mark of the Viltrumite', date: 'Jun 12, 2026', watched: false },
      { num: 2, title: 'Consequences', date: 'Jun 19, 2026', watched: false },
      { num: 3, title: 'One Step Closer', date: 'Jun 26, 2026', watched: false },
      { num: 4, title: 'Breaking Point', date: 'Jul 3, 2026', watched: false },
      { num: 5, title: 'TBA', date: 'Jul 10, 2026', watched: false },
      { num: 6, title: 'TBA', date: 'Jul 17, 2026', watched: false },
      { num: 7, title: 'TBA', date: 'Jul 24, 2026', watched: false },
      { num: 8, title: 'TBA', date: 'Jul 31, 2026', watched: false },
    ],
  },
];

const SIMILAR_SHOWS = [
  {
    title: 'The Boys',
    year: 2019,
    service: 'Prime Video',
    color: '#1399ff',
    bg: '#1a0a0a',
    fg: '#ff4444',
  },
  {
    title: 'Arcane',
    year: 2021,
    service: 'Netflix',
    color: '#e50914',
    bg: '#0a1520',
    fg: '#4488ff',
  },
  {
    title: 'Castlevania',
    year: 2017,
    service: 'Netflix',
    color: '#e50914',
    bg: '#200a0a',
    fg: '#cc3333',
  },
  {
    title: 'One Punch Man',
    year: 2015,
    service: 'Hulu',
    color: '#1ce783',
    bg: '#0a1a10',
    fg: '#ffcc00',
  },
  {
    title: 'My Hero Academia',
    year: 2016,
    service: 'Hulu',
    color: '#1ce783',
    bg: '#0a0a20',
    fg: '#4466ff',
  },
];

/* ── Primitives ── */
function SGlass({
  children,
  style = {},
  tint = 'rgba(255,255,255,0.06)',
  blur = 18,
  shimmer = true,
  radius = 22,
}) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: radius,
        overflow: 'hidden',
        backdropFilter: `blur(${blur}px) saturate(200%)`,
        WebkitBackdropFilter: `blur(${blur}px) saturate(200%)`,
        background: tint,
        boxShadow: '0 2px 1px rgba(255,255,255,0.06) inset, 0 -1px 1px rgba(0,0,0,0.4) inset',
        border: '0.5px solid rgba(255,255,255,0.14)',
        ...style,
      }}
    >
      {shimmer && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 1,
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.55) 60%, transparent 100%)',
            borderRadius: `${radius}px ${radius}px 0 0`,
            pointerEvents: 'none',
            zIndex: 10,
          }}
        ></div>
      )}
      {children}
    </div>
  );
}

function SOrb({ color, size, top, left, right, bottom, opacity = 0.45 }) {
  return (
    <div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: '50%',
        background: `radial-gradient(closest-side, ${color}, transparent 70%)`,
        opacity,
        top,
        left,
        right,
        bottom,
        pointerEvents: 'none',
        filter: 'blur(2px)',
      }}
    ></div>
  );
}

function SFadeSep() {
  return (
    <div style={{ position: 'relative', height: '0.5px', overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255,255,255,0.10)',
          WebkitMaskImage:
            'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
          maskImage:
            'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
        }}
      ></div>
    </div>
  );
}

function SSectionLabel({ children, accent }) {
  return (
    <div
      style={{
        fontFamily: ST.mono,
        fontSize: 10,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: accent ? ST.accent : ST.text3,
        marginBottom: 10,
        padding: '0 16px',
      }}
    >
      {children}
    </div>
  );
}

function posterSVG(title, bg, fg) {
  const w = title.split(' ');
  const ini = w.length >= 2 ? w[0][0] + w[w.length - 1][0] : title.slice(0, 2);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect fill="${bg}" width="300" height="450"/><text x="150" y="245" fill="${fg}" font-family="serif" font-size="88" font-style="italic" text-anchor="middle" opacity="0.9">${ini.toUpperCase()}</text><text x="150" y="400" fill="${fg}" font-family="monospace" font-size="14" text-anchor="middle" opacity="0.5">${title}</text></svg>`)}`;
}

/* ================================================================
   SHOW DETAIL SCREEN
   ================================================================ */
function ShowDetailScreen() {
  const [expandedSeason, setExpandedSeason] = React.useState(2);
  const [watchedEps, setWatchedEps] = React.useState(() => {
    const map = {};
    SEASONS_DATA.forEach((s) =>
      s.episodes.forEach((e) => {
        map[`${s.num}-${e.num}`] = e.watched;
      })
    );
    return map;
  });
  const [trackStatus, setTrackStatus] = React.useState('watching');

  const toggleEp = (sNum, eNum) => {
    const key = `${sNum}-${eNum}`;
    setWatchedEps((prev) => ({ ...prev, [key]: !prev[key] }));
  };
  const watchedCount = Object.values(watchedEps).filter(Boolean).length;

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: ST.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ── HERO BACKDROP ── */}
      <div
        style={{
          position: 'relative',
          minHeight: 340,
          overflow: 'hidden',
          background: `linear-gradient(180deg, #0d0820 0%, #1a0a30 50%, ${ST.bg} 100%)`,
        }}
      >
        {/* Glow */}
        <SOrb color={SHOW.service.color} size={300} top={-60} left={-40} opacity={0.18} />
        <SOrb color="#8b22ff" size={200} top={80} right={-40} opacity={0.15} />

        {/* Back button — glass pill */}
        <div style={{ position: 'absolute', top: 56, left: 14, zIndex: 20 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              background: 'rgba(0,0,0,0.35)',
              border: '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="rgba(255,255,255,0.8)"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </div>
        </div>

        {/* Status tracking pill — top right */}
        <div style={{ position: 'absolute', top: 56, right: 14, zIndex: 20 }}>
          <div
            style={{
              borderRadius: 9999,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '7px 14px',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              background: trackStatus === 'watching' ? `${ST.accent}22` : 'rgba(0,0,0,0.35)',
              border:
                trackStatus === 'watching'
                  ? `0.5px solid ${ST.accent}44`
                  : '0.5px solid rgba(255,255,255,0.18)',
              cursor: 'pointer',
            }}
            onClick={() => setTrackStatus(trackStatus === 'watching' ? 'none' : 'watching')}
          >
            {trackStatus === 'watching' && (
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ST.accent}
                strokeWidth="3"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            <span
              style={{
                fontFamily: ST.mono,
                fontSize: 11,
                color: trackStatus === 'watching' ? ST.accent : 'rgba(255,255,255,0.6)',
              }}
            >
              {trackStatus === 'watching' ? 'Watching' : 'Track'}
            </span>
          </div>
        </div>

        {/* Poster + title lockup at bottom */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '60px 16px 16px',
            background: `linear-gradient(to top, ${ST.bg}, transparent)`,
            display: 'flex',
            gap: 14,
            alignItems: 'flex-end',
          }}
        >
          {/* Poster */}
          <div
            style={{
              width: 100,
              height: 150,
              borderRadius: 12,
              overflow: 'hidden',
              flexShrink: 0,
              boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
            }}
          >
            <img
              src={posterSVG(SHOW.title, SHOW.posterBg, SHOW.posterFg)}
              alt=""
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>

          {/* Title + meta */}
          <div style={{ flex: 1, minWidth: 0, paddingBottom: 4 }}>
            <div
              style={{
                fontFamily: ST.head,
                fontSize: 28,
                fontWeight: 700,
                letterSpacing: '-0.02em',
                lineHeight: 1.0,
                color: ST.text,
              }}
            >
              {SHOW.title}
            </div>
            <div
              style={{
                fontFamily: ST.mono,
                fontSize: 12,
                color: ST.text3,
                marginTop: 5,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                flexWrap: 'wrap',
              }}
            >
              <span>{SHOW.year}</span>
              <span style={{ color: ST.text3 }}>·</span>
              {SHOW.genres
                .slice(0, 2)
                .map((g) => <span key={g}>{g}</span>)
                .reduce((a, b) => [
                  a,
                  <span key={'d' + b.key} style={{ color: ST.text3 }}>
                    {' '}
                    ·{' '}
                  </span>,
                  b,
                ])}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#f5c518">
                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
              </svg>
              <span style={{ fontFamily: ST.head, fontSize: 14, fontWeight: 600, color: ST.text }}>
                {SHOW.rating}
              </span>
              <span style={{ fontFamily: ST.mono, fontSize: 11, color: ST.text3 }}>
                {SHOW.ratingCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── WHERE TO WATCH ── */}
      <div style={{ padding: '18px 14px 0' }}>
        <div style={{ display: 'flex', gap: 10 }}>
          {[SHOW.service, ...SHOW.otherServices].map((s, i) => (
            <SGlass
              key={s.name}
              tint={i === 0 ? `${s.color}12` : 'rgba(255,255,255,0.04)'}
              blur={16}
              radius={16}
              shimmer={i === 0}
              style={{
                flex: 1,
                padding: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                border: i === 0 ? `0.5px solid ${s.color}44` : '0.5px solid rgba(255,255,255,0.10)',
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: `${s.color}22`,
                  border: `0.5px solid ${s.color}55`,
                  fontFamily: ST.head,
                  fontWeight: 700,
                  fontSize: 13,
                  color: s.color,
                }}
              >
                {s.short}
              </div>
              <div>
                <div style={{ fontFamily: ST.head, fontSize: 14, fontWeight: 600, color: ST.text }}>
                  {s.name}
                </div>
                <div style={{ fontFamily: ST.mono, fontSize: 10, color: ST.text3, marginTop: 1 }}>
                  {s.price ? `$${s.price}/mo` : 'Also available'}
                </div>
              </div>
            </SGlass>
          ))}
        </div>
      </div>

      {/* ── TALLY INSIGHT ── */}
      <div style={{ padding: '20px 14px 0' }}>
        <SSectionLabel accent>Tally insight</SSectionLabel>
        <div style={{ position: 'relative' }}>
          <SOrb color={ST.accent} size={200} top={-40} right={-30} opacity={0.2} />
          <SGlass
            tint="rgba(255,255,255,0.06)"
            blur={22}
            radius={22}
            style={{
              padding: '18px 16px',
              position: 'relative',
              zIndex: 1,
              boxShadow:
                'inset 1px 0 0 rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 1px rgba(255,255,255,0.06) inset, 0 -1px 1px rgba(0,0,0,0.4) inset',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  flexShrink: 0,
                  background: `${ST.accent}18`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke={ST.accent}
                  strokeWidth="2"
                >
                  <rect x="6" y="4" width="4" height="16" />
                  <rect x="14" y="4" width="4" height="16" />
                </svg>
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontFamily: ST.head,
                    fontSize: 18,
                    fontWeight: 700,
                    color: ST.text,
                    lineHeight: 1.2,
                  }}
                >
                  11-week gap starting Aug 2
                </div>
                <div
                  style={{
                    fontFamily: ST.mono,
                    fontSize: 12,
                    color: ST.text3,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  No new episodes between seasons. Safe to pause Prime Video.
                </div>
              </div>
            </div>

            {/* Savings */}
            <div
              style={{
                marginTop: 16,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: ST.mono,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    textTransform: 'uppercase',
                    color: ST.text3,
                    marginBottom: 3,
                  }}
                >
                  You save
                </div>
                <div
                  style={{
                    fontFamily: ST.display,
                    fontSize: 42,
                    fontWeight: 700,
                    lineHeight: 1,
                    letterSpacing: '-0.02em',
                    color: ST.accent,
                  }}
                >
                  $98.89
                </div>
                <div style={{ fontFamily: ST.mono, fontSize: 10, color: ST.text3, marginTop: 3 }}>
                  if you pause Aug 2 → Oct 14
                </div>
              </div>
              {/* Mini timeline */}
              <div style={{ width: 100 }}>
                <div style={{ display: 'flex', gap: 1.5 }}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: 16,
                        borderRadius: 2,
                        background:
                          i >= 1 && i <= 3
                            ? ST.accent
                            : i >= 7 && i <= 9
                              ? `${ST.accent}55`
                              : 'rgba(255,255,255,0.06)',
                      }}
                    ></div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                  <span style={{ fontFamily: ST.mono, fontSize: 7, color: ST.text3 }}>Jun</span>
                  <span style={{ fontFamily: ST.mono, fontSize: 7, color: ST.text3 }}>Dec</span>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div style={{ marginTop: 16 }}>
              <div style={{ position: 'relative' }}>
                <div
                  style={{
                    position: 'absolute',
                    inset: -6,
                    borderRadius: 20,
                    background: `radial-gradient(ellipse, ${ST.accent}44 0%, transparent 70%)`,
                    filter: 'blur(6px)',
                    opacity: 0.5,
                    pointerEvents: 'none',
                  }}
                ></div>
                <SGlass
                  tint={`${ST.accent}28`}
                  blur={14}
                  radius={12}
                  style={{
                    padding: '13px 0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: `0.5px solid ${ST.accent}44`,
                  }}
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ST.text}
                    strokeWidth="2"
                    style={{ marginRight: 7 }}
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                  <span
                    style={{
                      fontFamily: ST.head,
                      fontWeight: 600,
                      fontSize: 14,
                      color: ST.text,
                      position: 'relative',
                      zIndex: 1,
                    }}
                  >
                    Set pause reminder
                  </span>
                </SGlass>
              </div>
            </div>
          </SGlass>
        </div>
      </div>

      {/* ── PROGRESS ── */}
      <div style={{ padding: '24px 14px 0' }}>
        <SSectionLabel>Your progress</SSectionLabel>
        <SGlass
          tint="rgba(255,255,255,0.05)"
          blur={18}
          radius={20}
          shimmer={false}
          style={{ padding: '16px' }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'baseline',
              justifyContent: 'space-between',
              marginBottom: 12,
            }}
          >
            <div>
              <span style={{ fontFamily: ST.head, fontSize: 16, fontWeight: 600, color: ST.text }}>
                Season {USER_PROGRESS.currentSeason}
              </span>
              <span style={{ fontFamily: ST.mono, fontSize: 12, color: ST.text3, marginLeft: 6 }}>
                E{USER_PROGRESS.currentEpisode} of 8
              </span>
            </div>
            <span style={{ fontFamily: ST.mono, fontSize: 11, color: ST.text3 }}>
              {watchedCount}/{SHOW.totalEpisodes}
            </span>
          </div>

          {/* Season block viz */}
          <div style={{ display: 'flex', gap: 8 }}>
            {SEASONS_DATA.map((season) => (
              <div key={season.num} style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontFamily: ST.mono,
                    fontSize: 8,
                    color: ST.text3,
                    marginBottom: 4,
                    textAlign: 'center',
                  }}
                >
                  S{season.num}
                </div>
                <div style={{ display: 'flex', gap: 2 }}>
                  {season.episodes.map((ep) => {
                    const key = `${season.num}-${ep.num}`;
                    const w = watchedEps[key];
                    const cur =
                      season.num === USER_PROGRESS.currentSeason &&
                      ep.num === USER_PROGRESS.currentEpisode;
                    return (
                      <div
                        key={key}
                        style={{
                          flex: 1,
                          height: 22,
                          borderRadius: 3,
                          background: w
                            ? ST.accent
                            : cur
                              ? `${ST.accent}35`
                              : 'rgba(255,255,255,0.06)',
                          border: cur && !w ? `0.5px solid ${ST.accent}` : 'none',
                          boxShadow: cur ? `0 0 6px ${ST.accent}44` : 'none',
                          cursor: 'pointer',
                        }}
                        onClick={() => toggleEp(season.num, ep.num)}
                      ></div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Quick action */}
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              onClick={() => toggleEp(USER_PROGRESS.currentSeason, USER_PROGRESS.currentEpisode)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: 999,
                cursor: 'pointer',
                background: 'rgba(255,255,255,0.06)',
                border: '0.5px solid rgba(255,255,255,0.12)',
              }}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke={ST.text2}
                strokeWidth="3"
              >
                <path d="M20 6L9 17l-5-5" />
              </svg>
              <span style={{ fontFamily: ST.mono, fontSize: 11, color: ST.text2 }}>Mark S2E4</span>
            </div>
            <span style={{ fontFamily: ST.mono, fontSize: 11, color: ST.accent }}>
              Next: S2E5 →
            </span>
          </div>
        </SGlass>
      </div>

      {/* ── SEASONS & EPISODES ── */}
      <div style={{ padding: '24px 14px 0' }}>
        <SSectionLabel>Seasons & episodes</SSectionLabel>
        <SGlass
          tint="rgba(255,255,255,0.05)"
          blur={18}
          radius={20}
          shimmer={false}
          style={{ overflow: 'hidden' }}
        >
          {SEASONS_DATA.map((season, si) => {
            const expanded = expandedSeason === season.num;
            const epW = season.episodes.filter((e) => watchedEps[`${season.num}-${e.num}`]).length;
            const allW = epW === season.episodes.length;

            return (
              <React.Fragment key={season.num}>
                {si > 0 && <SFadeSep />}
                {/* Season header */}
                <div
                  onClick={() => setExpandedSeason(expanded ? null : season.num)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '14px 15px',
                    cursor: 'pointer',
                    minHeight: 52,
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={ST.text3}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    style={{
                      flexShrink: 0,
                      transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                      transform: expanded ? 'rotate(90deg)' : 'none',
                    }}
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span
                        style={{
                          fontFamily: ST.head,
                          fontSize: 15,
                          fontWeight: 600,
                          color: ST.text,
                        }}
                      >
                        Season {season.num}
                      </span>
                      <span style={{ fontFamily: ST.mono, fontSize: 11, color: ST.text3 }}>
                        {season.year}
                      </span>
                      {season.airing && (
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                          <span
                            style={{
                              width: 6,
                              height: 6,
                              borderRadius: '50%',
                              background: '#1ce783',
                              display: 'inline-block',
                            }}
                          ></span>
                          <span style={{ fontFamily: ST.mono, fontSize: 9, color: '#1ce783' }}>
                            AIRING
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <span
                    style={{
                      fontFamily: ST.mono,
                      fontSize: 11,
                      color: allW ? '#1ce783' : ST.text3,
                      flexShrink: 0,
                    }}
                  >
                    {allW ? '✓' : `${epW}/8`}
                  </span>
                </div>

                {/* Episodes */}
                <div
                  style={{
                    maxHeight: expanded ? 600 : 0,
                    opacity: expanded ? 1 : 0,
                    overflow: 'hidden',
                    transition:
                      'max-height 0.4s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease',
                  }}
                >
                  {season.episodes.map((ep) => {
                    const key = `${season.num}-${ep.num}`;
                    const w = watchedEps[key];
                    const cur =
                      season.num === USER_PROGRESS.currentSeason &&
                      ep.num === USER_PROGRESS.currentEpisode;
                    return (
                      <div
                        key={key}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          padding: '10px 15px',
                          minHeight: 48,
                          background: cur ? `${ST.accent}0a` : 'transparent',
                        }}
                      >
                        {/* Checkbox */}
                        <div
                          onClick={() => toggleEp(season.num, ep.num)}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            flexShrink: 0,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            background: w ? ST.accent : 'transparent',
                            border: w ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                          }}
                        >
                          {w && (
                            <svg
                              width="12"
                              height="12"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke={ST.bg}
                              strokeWidth="3"
                            >
                              <path d="M20 6L9 17l-5-5" />
                            </svg>
                          )}
                        </div>
                        <span
                          style={{
                            fontFamily: ST.mono,
                            fontSize: 11,
                            color: ST.text3,
                            width: 26,
                            flexShrink: 0,
                          }}
                        >
                          E{ep.num}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontFamily: ST.head,
                              fontSize: 14,
                              color: w ? ST.text3 : ST.text,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 6,
                            }}
                          >
                            {ep.title}
                            {cur && (
                              <span
                                style={{
                                  fontFamily: ST.mono,
                                  fontSize: 8,
                                  padding: '1px 5px',
                                  borderRadius: 3,
                                  background: ST.accent,
                                  color: ST.bg,
                                  flexShrink: 0,
                                }}
                              >
                                NOW
                              </span>
                            )}
                          </div>
                        </div>
                        <span
                          style={{
                            fontFamily: ST.mono,
                            fontSize: 10,
                            color: ST.text3,
                            flexShrink: 0,
                          }}
                        >
                          {ep.date.split(', ')[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </React.Fragment>
            );
          })}
        </SGlass>
      </div>

      {/* ── ABOUT ── */}
      <div style={{ padding: '24px 14px 0' }}>
        <SSectionLabel>About</SSectionLabel>
        <SGlass
          tint="rgba(255,255,255,0.05)"
          blur={18}
          radius={20}
          shimmer={false}
          style={{ padding: '16px' }}
        >
          <div
            style={{
              fontFamily: ST.head,
              fontSize: 14,
              lineHeight: 1.6,
              color: ST.text2,
              textWrap: 'pretty',
            }}
          >
            {SHOW.overview}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
            {[...SHOW.genres, SHOW.status].map((g) => (
              <span
                key={g}
                style={{
                  fontFamily: ST.mono,
                  fontSize: 10,
                  padding: '3px 9px',
                  borderRadius: 999,
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.10)',
                  color: ST.text2,
                }}
              >
                {g}
              </span>
            ))}
          </div>
        </SGlass>
      </div>

      {/* ── MORE LIKE THIS ── */}
      <div style={{ padding: '24px 0 0' }}>
        <div style={{ padding: '0 14px' }}>
          <SSectionLabel>More like this</SSectionLabel>
        </div>
        <div
          style={{
            display: 'flex',
            gap: 10,
            overflowX: 'auto',
            padding: '0 14px 4px',
            scrollbarWidth: 'none',
          }}
        >
          {SIMILAR_SHOWS.map((s) => (
            <div key={s.title} style={{ width: 110, flexShrink: 0 }}>
              <div
                style={{
                  width: 110,
                  height: 165,
                  borderRadius: 12,
                  overflow: 'hidden',
                  background: s.bg,
                }}
              >
                <img
                  src={posterSVG(s.title, s.bg, s.fg)}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
              <div style={{ marginTop: 6, padding: '0 2px' }}>
                <div
                  style={{
                    fontFamily: ST.head,
                    fontSize: 12,
                    fontWeight: 500,
                    color: ST.text,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontFamily: ST.mono, fontSize: 9, color: ST.text3, marginTop: 2 }}>
                  {s.year} · <span style={{ color: s.color }}>{s.service}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ height: 50 }}></div>
    </div>
  );
}

/* ── Mount ── */
function ShowiOSApp() {
  return (
    <IOSDevice dark={true}>
      <div
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: ST.bg,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        <ShowDetailScreen />
      </div>
    </IOSDevice>
  );
}

const showRoot = ReactDOM.createRoot(document.getElementById('root'));
showRoot.render(<ShowiOSApp />);
