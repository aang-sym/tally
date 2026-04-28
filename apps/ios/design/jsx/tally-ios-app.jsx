/* ================================================================
   Tally iOS 26 — Analytical Dashboard Redesign
   Expandable rows, stat pills, 2-col sub grid
   ================================================================ */

const T = {
  bg: '#08080F',
  surface: '#0f0f16',
  border: 'rgba(255,255,255,0.08)',
  text: '#f5f4f0',
  text2: 'rgba(245,244,240,0.55)',
  text3: 'rgba(245,244,240,0.30)',
  accent: '#FF3D8B',
  display: "-apple-system, 'SF Pro Rounded', 'SF Pro Display', system-ui, sans-serif",
  head: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
  mono: "'SF Mono', 'Geist Mono', ui-monospace, monospace",
};

const SERVICES = [
  {
    id: 'netflix',
    name: 'Netflix',
    short: 'N',
    color: '#ff2d2d',
    price: 15.49,
    shows: 3,
    renews: 2,
  },
  {
    id: 'disney',
    name: 'Disney+',
    short: 'D+',
    color: '#2b8fff',
    price: 13.99,
    shows: 2,
    renews: 8,
  },
  {
    id: 'prime',
    name: 'Prime Video',
    short: 'P',
    color: '#29aaff',
    price: 14.99,
    shows: 4,
    renews: 14,
  },
  { id: 'max', name: 'Max', short: 'M', color: '#a67bff', price: 16.99, shows: 2, renews: 1 },
  { id: 'hulu', name: 'Hulu', short: 'H', color: '#1ddf83', price: 17.99, shows: 1, renews: 5 },
];

const GAPS = [
  {
    svc: 'netflix',
    reason: 'Between seasons',
    detail: 'The Long Dusk S2',
    window: 'Jun – Aug',
    gapMonths: [5, 6, 7],
    save: 46.47,
    resumesOn: 'Sep 2',
  },
  {
    svc: 'disney',
    reason: 'No tracked shows',
    detail: '',
    window: 'Oct – Dec',
    gapMonths: [9, 10, 11],
    save: 27.98,
    resumesOn: 'Jan 14',
  },
  {
    svc: 'max',
    reason: 'Mid-season break',
    detail: 'Velvet Rope S1',
    window: 'Jul only',
    gapMonths: [6],
    save: 16.99,
    resumesOn: 'Aug 5',
  },
];

const UPCOMING = [
  { show: 'The Long Dusk', ep: 'S2E4', date: 'May 3', svc: 'max', isNext: true },
  { show: 'Paper Saints', ep: 'S4E7', date: 'May 8', svc: 'netflix', isNext: false },
  { show: 'Velvet Rope', ep: 'S1E9', date: 'May 14', svc: 'prime', isNext: false },
  { show: 'Nightshade Academy', ep: 'S3E1', date: 'May 19', svc: 'disney', isNext: false },
  { show: 'Undersea Signals', ep: 'S2E3', date: 'May 22', svc: 'hulu', isNext: false },
];

const fmtMoney = (n) => '$' + n.toFixed(2);

/* ── Glass primitive ── */
function Glass({
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

function Orb({ color, size, top, left, right, bottom, opacity = 0.45 }) {
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

function GlassBadge({ id, size = 44 }) {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <Orb color={s.color} size={size * 1.8} top={-size * 0.4} left={-size * 0.4} opacity={0.5} />
      <Glass
        radius={size * 0.3}
        tint={`${s.color}28`}
        blur={12}
        style={{
          width: size,
          height: size,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <span
          style={{ fontFamily: T.head, fontWeight: 700, fontSize: size * 0.36, color: s.color }}
        >
          {s.short}
        </span>
      </Glass>
    </div>
  );
}

function FadeSep() {
  return (
    <div style={{ position: 'relative', height: '0.5px', margin: '0 0px', overflow: 'hidden' }}>
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

function SectionHead({ title, action }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 16px',
        marginBottom: 12,
      }}
    >
      <span
        style={{
          fontFamily: T.head,
          fontWeight: 700,
          fontSize: 22,
          color: T.text,
          letterSpacing: -0.3,
        }}
      >
        {title}
      </span>
      {action && (
        <div
          style={{
            borderRadius: 999,
            overflow: 'hidden',
            backdropFilter: 'blur(14px) saturate(180%)',
            WebkitBackdropFilter: 'blur(14px) saturate(180%)',
            background: 'rgba(255,255,255,0.08)',
            border: '0.5px solid rgba(255,255,255,0.18)',
            padding: '5px 13px',
          }}
        >
          <span
            style={{ fontFamily: T.mono, fontSize: 11, color: T.accent, letterSpacing: '0.04em' }}
          >
            {action} →
          </span>
        </div>
      )}
    </div>
  );
}

/* Month timeline bar */
function MonthBar({ gapMonths }) {
  const ABBR = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D'];
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, width: '100%' }}>
      {ABBR.map((m, i) => {
        const on = gapMonths.includes(i);
        return (
          <div
            key={i}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <div
              style={{
                height: 20,
                borderRadius: 3,
                width: '100%',
                position: 'relative',
                overflow: 'hidden',
                background: on ? `${T.accent}35` : 'rgba(255,255,255,0.06)',
                border: on ? `0.5px solid ${T.accent}55` : '0.5px solid rgba(255,255,255,0.08)',
              }}
            >
              {on && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background:
                      'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.15) 50%, transparent 100%)',
                    animation: 'shimmerSweep 2.2s ease-in-out infinite',
                  }}
                ></div>
              )}
            </div>
            <div style={{ fontFamily: T.mono, fontSize: 7, color: T.text3 }}>{m}</div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================
   EXPANDABLE GAP ROW
   ================================================================ */
function GapRow({ gap, expanded, onToggle, isLast }) {
  const s = SERVICES.find((x) => x.id === gap.svc);
  return (
    <div style={{ position: 'relative' }}>
      {/* Brand glow behind expanded row */}
      {expanded && (
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: 18,
            background: `radial-gradient(ellipse at 30% 40%, ${s.color}18 0%, transparent 70%)`,
            pointerEvents: 'none',
            transition: 'opacity 0.3s',
          }}
        ></div>
      )}

      {/* Collapsed: single scannable row */}
      <div
        onClick={onToggle}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 13,
          padding: '14px 15px',
          minHeight: 64,
          cursor: 'pointer',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <GlassBadge id={gap.svc} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: T.head, fontSize: 16, fontWeight: 600, color: T.text }}>
            {s.name}
          </div>
          <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3, marginTop: 2 }}>
            {gap.window}
          </div>
        </div>
        <div
          style={{
            fontFamily: T.display,
            fontSize: 20,
            fontWeight: 700,
            color: T.accent,
            flexShrink: 0,
          }}
        >
          +{fmtMoney(gap.save)}
        </div>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke={T.text3}
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            flexShrink: 0,
            transition: 'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transform: expanded ? 'rotate(180deg)' : 'none',
          }}
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {/* Expanded detail — spring animated */}
      <div
        style={{
          maxHeight: expanded ? 200 : 0,
          opacity: expanded ? 1 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.25s ease',
          position: 'relative',
          zIndex: 1,
        }}
      >
        <div style={{ padding: '0 15px 16px' }}>
          <MonthBar gapMonths={gap.gapMonths} />
          <div
            style={{
              fontFamily: T.mono,
              fontSize: 12,
              color: T.text3,
              marginTop: 10,
              lineHeight: 1.5,
            }}
          >
            {gap.reason}
            {gap.detail ? ` · ${gap.detail}` : ''} · back {gap.resumesOn}
          </div>
          <div
            style={{
              marginTop: 12,
              display: 'inline-flex',
              alignItems: 'center',
              borderRadius: 999,
              overflow: 'hidden',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              background: `${T.accent}22`,
              border: `0.5px solid ${T.accent}44`,
              padding: '7px 16px',
              cursor: 'pointer',
            }}
          >
            <span
              style={{ fontFamily: T.mono, fontSize: 12, color: T.accent, letterSpacing: '0.02em' }}
            >
              Pause this →
            </span>
          </div>
        </div>
      </div>

      {!isLast && <FadeSep />}
    </div>
  );
}

/* ================================================================
   HOME SCREEN
   ================================================================ */
function HomeScreen({ active }) {
  if (!active) return null;
  const totalSave = GAPS.reduce((a, g) => a + g.save, 0);
  const [expandedGap, setExpandedGap] = React.useState(null);

  const stats = [
    { label: 'GAPS', val: '3' },
    { label: 'ACTIVE', val: '5 subs' },
    { label: 'TRACKING', val: '12 shows' },
    { label: 'MONTHLY', val: '$73' },
  ];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Greeting — 60pt clearance for Dynamic Island */}
      <div style={{ padding: '60px 18px 0' }}>
        <div
          style={{
            fontFamily: T.mono,
            fontSize: 11,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: T.text3,
            marginBottom: 4,
          }}
        >
          Apr 26 · Welcome back
        </div>
        <div
          style={{
            fontFamily: T.head,
            fontSize: 28,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            lineHeight: 1.0,
            color: T.text,
          }}
        >
          Mira R.
        </div>
      </div>

      {/* ── HERO CARD ── */}
      <div style={{ padding: '16px 14px 0', position: 'relative' }}>
        <div style={{ position: 'relative' }}>
          <Orb color={T.accent} size={240} top={-60} right={-40} opacity={0.3} />
          <Orb color={'#8b22ff'} size={180} top={40} left={-30} opacity={0.2} />

          <Glass
            tint="rgba(255,255,255,0.07)"
            blur={24}
            radius={26}
            style={{
              padding: '22px 18px 20px',
              position: 'relative',
              zIndex: 1,
              boxShadow: [
                '0 2px 1px rgba(255,255,255,0.06) inset',
                '0 -1px 1px rgba(0,0,0,0.4) inset',
                'inset 1px 0 0 rgba(255,255,255,0.12)',
                'inset 0 1px 0 rgba(255,255,255,0.12)',
              ].join(', '),
            }}
          >
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 10,
                letterSpacing: '0.12em',
                textTransform: 'uppercase',
                color: T.accent,
                marginBottom: 10,
              }}
            >
              Your plan · Summer 2026
            </div>

            {/* Display-scale savings number */}
            <div
              style={{
                fontFamily: T.display,
                fontSize: 56,
                lineHeight: 1,
                letterSpacing: '-0.02em',
                color: T.text,
                fontWeight: 700,
              }}
            >
              {fmtMoney(totalSave)}
            </div>
            <div
              style={{
                fontFamily: T.mono,
                fontSize: 13,
                color: T.text3,
                marginTop: 6,
                marginBottom: 18,
              }}
            >
              saveable Jun – Dec 2026 across {GAPS.length} gaps
            </div>

            {/* Horizontal scrollable stat pills */}
            <div
              style={{
                display: 'flex',
                gap: 8,
                overflowX: 'auto',
                marginBottom: 18,
                scrollbarWidth: 'none',
                WebkitOverflowScrolling: 'touch',
                /* fade hint at right edge */
                WebkitMaskImage: 'linear-gradient(90deg, black 0%, black 85%, transparent 100%)',
                maskImage: 'linear-gradient(90deg, black 0%, black 85%, transparent 100%)',
              }}
            >
              {stats.map((s) => (
                <div
                  key={s.label}
                  style={{
                    flexShrink: 0,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 7,
                    borderRadius: 999,
                    padding: '8px 14px',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    background: 'rgba(0,0,0,0.30)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                  }}
                >
                  <span
                    style={{
                      fontFamily: T.mono,
                      fontSize: 10,
                      letterSpacing: '0.12em',
                      color: T.text3,
                    }}
                  >
                    {s.label}
                  </span>
                  <span
                    style={{ fontFamily: T.display, fontSize: 14, fontWeight: 700, color: T.text }}
                  >
                    {s.val}
                  </span>
                </div>
              ))}
            </div>

            {/* CTA */}
            <div style={{ position: 'relative' }}>
              <div
                style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: 28,
                  background: `radial-gradient(ellipse, ${T.accent}55 0%, transparent 70%)`,
                  filter: 'blur(8px)',
                  opacity: 0.55,
                  pointerEvents: 'none',
                }}
              ></div>
              <Glass
                tint={`${T.accent}30`}
                blur={14}
                radius={14}
                style={{
                  padding: '16px 0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  border: `0.5px solid ${T.accent}55`,
                }}
              >
                <span
                  style={{
                    fontFamily: T.head,
                    fontWeight: 600,
                    fontSize: 15,
                    color: T.text,
                    position: 'relative',
                    zIndex: 1,
                  }}
                >
                  See pause schedule →
                </span>
              </Glass>
            </div>
          </Glass>
        </div>
      </div>

      {/* ── GAPS — EXPANDABLE ROWS ── */}
      <div style={{ marginTop: 32 }}>
        <SectionHead title="Gaps found" action="All" />
        <div style={{ margin: '0 14px' }}>
          <Glass
            tint="rgba(255,255,255,0.05)"
            blur={20}
            radius={22}
            shimmer={false}
            style={{ overflow: 'hidden' }}
          >
            {GAPS.map((g, i) => (
              <GapRow
                key={g.svc}
                gap={g}
                expanded={expandedGap === g.svc}
                onToggle={() => setExpandedGap(expandedGap === g.svc ? null : g.svc)}
                isLast={i === GAPS.length - 1}
              />
            ))}
          </Glass>
        </div>
      </div>

      {/* ── WHAT'S NEXT ── */}
      <div style={{ marginTop: 32 }}>
        <SectionHead title="What's next" action="My shows" />
        <div style={{ margin: '0 14px' }}>
          <Glass
            tint="rgba(255,255,255,0.05)"
            blur={20}
            radius={22}
            shimmer={false}
            style={{ overflow: 'hidden' }}
          >
            {UPCOMING.map((u, i) => {
              const s = SERVICES.find((x) => x.id === u.svc);
              return (
                <React.Fragment key={u.show}>
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 13,
                      padding: '12px 15px',
                      minHeight: 64,
                    }}
                  >
                    <GlassBadge id={u.svc} size={44} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontFamily: T.head,
                          fontSize: 17,
                          fontWeight: 500,
                          color: T.text,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {u.show}
                      </div>
                      <div
                        style={{ fontFamily: T.mono, fontSize: 13, color: T.text3, marginTop: 3 }}
                      >
                        {u.ep} · {s.name}
                      </div>
                    </div>
                    <div
                      style={{
                        fontFamily: T.mono,
                        fontSize: 15,
                        flexShrink: 0,
                        textAlign: 'right',
                        color: u.isNext ? T.accent : T.text2,
                        fontWeight: u.isNext ? 600 : 400,
                      }}
                    >
                      {u.date}
                    </div>
                  </div>
                  {i < UPCOMING.length - 1 && <FadeSep />}
                </React.Fragment>
              );
            })}
          </Glass>
        </div>
      </div>

      {/* ── SUBSCRIPTIONS — 2-COL GRID ── */}
      <div style={{ marginTop: 32 }}>
        <SectionHead title="Subscriptions" action="Manage" />
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, margin: '0 14px' }}>
          {SERVICES.map((s) => {
            const urgent = s.renews <= 3;
            return (
              <div key={s.id} style={{ position: 'relative' }}>
                <Orb color={s.color} size={80} top={-20} right={-14} opacity={0.25} />
                <Glass
                  tint="rgba(255,255,255,0.06)"
                  blur={18}
                  radius={20}
                  style={{
                    padding: '14px',
                    position: 'relative',
                    zIndex: 1,
                    minHeight: 130,
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: [
                      '0 2px 1px rgba(255,255,255,0.06) inset',
                      '0 -1px 1px rgba(0,0,0,0.4) inset',
                      'inset 0 1px 0 rgba(255,255,255,0.10)',
                    ].join(', '),
                  }}
                >
                  {/* Top row: avatar + price */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: 12,
                    }}
                  >
                    <GlassBadge id={s.id} size={36} />
                    <div
                      style={{
                        fontFamily: T.display,
                        fontSize: 18,
                        fontWeight: 700,
                        color: T.text,
                      }}
                    >
                      {fmtMoney(s.price)}
                    </div>
                  </div>
                  {/* Service name */}
                  <div
                    style={{
                      fontFamily: T.head,
                      fontSize: 17,
                      fontWeight: 600,
                      color: T.text,
                      marginBottom: 4,
                    }}
                  >
                    {s.name}
                  </div>
                  {/* Footer: shows + renew */}
                  <div style={{ marginTop: 'auto' }}>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
                      {s.shows} airing
                    </span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}> · </span>
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: 11,
                        color: urgent ? T.accent : T.text3,
                        fontWeight: urgent ? 600 : 400,
                      }}
                    >
                      renews {s.renews}d
                    </span>
                  </div>
                </Glass>
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom clearance for floating tab bar */}
      <div style={{ height: 110 }}></div>
    </div>
  );
}

/* ================================================================
   SEARCH SCREEN
   ================================================================ */
function SearchScreen({ active }) {
  if (!active) return null;
  const [q, setQ] = React.useState('');
  const allShows = [
    'The Long Dusk',
    'Paper Saints',
    'Velvet Rope',
    'Nightshade Academy',
    'Undersea Signals',
    'Glass Almanac',
    'The Correspondent',
    'Borrowed Light',
  ];
  const results =
    q.length > 1 ? allShows.filter((s) => s.toLowerCase().includes(q.toLowerCase())) : [];

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '60px 18px 12px' }}>
        <div
          style={{
            fontFamily: T.head,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: T.text,
            marginBottom: 16,
          }}
        >
          Search
        </div>
        <Glass
          tint="rgba(255,255,255,0.07)"
          blur={14}
          radius={14}
          shimmer={false}
          style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 14px' }}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke={T.text3}
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
          </svg>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for a show…"
            style={{
              background: 'none',
              border: 'none',
              outline: 'none',
              color: T.text,
              fontFamily: T.head,
              fontSize: 15,
              flex: 1,
            }}
          />
          {q && (
            <button
              onClick={() => setQ('')}
              style={{
                background: 'rgba(255,255,255,0.15)',
                border: 'none',
                color: T.text3,
                borderRadius: '50%',
                width: 18,
                height: 18,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
              }}
            >
              ×
            </button>
          )}
        </Glass>
      </div>
      <div style={{ padding: '0 14px' }}>
        {results.length > 0 ? (
          <Glass
            tint="rgba(255,255,255,0.05)"
            blur={20}
            radius={22}
            shimmer={false}
            style={{ overflow: 'hidden' }}
          >
            {results.map((show, i) => (
              <React.Fragment key={show}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '16px 15px',
                    gap: 13,
                    minHeight: 64,
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      background: 'rgba(255,255,255,0.07)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      flexShrink: 0,
                    }}
                  ></div>
                  <div style={{ flex: 1, fontFamily: T.head, fontSize: 17, color: T.text }}>
                    {show}
                  </div>
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={T.text3}
                    strokeWidth="2"
                  >
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </div>
                {i < results.length - 1 && <FadeSep />}
              </React.Fragment>
            ))}
          </Glass>
        ) : (
          <>
            <div
              style={{
                fontFamily: T.head,
                fontWeight: 600,
                fontSize: 22,
                color: T.text,
                marginBottom: 14,
              }}
            >
              Trending
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {allShows.map((s) => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  style={{
                    fontFamily: T.mono,
                    fontSize: 12,
                    padding: '7px 14px',
                    borderRadius: 999,
                    cursor: 'pointer',
                    background: 'rgba(255,255,255,0.07)',
                    border: '0.5px solid rgba(255,255,255,0.12)',
                    color: T.text2,
                  }}
                >
                  {s}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
      <div style={{ height: 110 }}></div>
    </div>
  );
}

/* ================================================================
   WATCHLIST SCREEN
   ================================================================ */
function WatchlistScreen({ active }) {
  if (!active) return null;
  const [filter, setFilter] = React.useState('all');
  const myShows = [
    { title: 'The Long Dusk', svc: 'max', ep: 'S2E4', status: 'watching', next: 'May 3' },
    { title: 'Paper Saints', svc: 'netflix', ep: 'S4E7', status: 'watching', next: 'May 8' },
    { title: 'Velvet Rope', svc: 'prime', ep: 'S1E9', status: 'watching', next: 'May 14' },
    { title: 'Nightshade Academy', svc: 'disney', ep: 'S3E1', status: 'watchlist', next: 'May 19' },
    { title: 'Undersea Signals', svc: 'hulu', ep: 'S2E3', status: 'watching', next: 'May 22' },
    { title: 'Glass Almanac', svc: 'prime', ep: 'S1E6', status: 'completed', next: '—' },
    { title: 'Static, Ohio', svc: 'netflix', ep: 'S2E2', status: 'dropped', next: '—' },
  ];
  const statusColor = {
    watching: '#1ddf83',
    watchlist: T.accent,
    completed: '#29aaff',
    dropped: '#ff5555',
  };
  const filters = ['all', 'watching', 'watchlist', 'completed', 'dropped'];
  const filtered = filter === 'all' ? myShows : myShows.filter((s) => s.status === filter);

  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '60px 18px 0' }}>
        <div
          style={{
            fontFamily: T.head,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: T.text,
          }}
        >
          Watchlist
        </div>
        <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3, marginTop: 5 }}>
          12 shows tracked
        </div>
      </div>
      <div
        style={{
          display: 'flex',
          gap: 7,
          overflowX: 'auto',
          padding: '14px 14px',
          scrollbarWidth: 'none',
        }}
      >
        {filters.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              fontFamily: T.mono,
              fontSize: 11,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              padding: '6px 14px',
              borderRadius: 999,
              cursor: 'pointer',
              flexShrink: 0,
              background: filter === f ? T.accent : 'rgba(255,255,255,0.07)',
              color: filter === f ? '#08080F' : T.text2,
              border: filter === f ? 'none' : '0.5px solid rgba(255,255,255,0.12)',
              fontWeight: filter === f ? 700 : 400,
            }}
          >
            {f}
          </button>
        ))}
      </div>
      <div style={{ padding: '0 14px' }}>
        <Glass
          tint="rgba(255,255,255,0.05)"
          blur={20}
          radius={22}
          shimmer={false}
          style={{ overflow: 'hidden' }}
        >
          {filtered.map((show, i) => (
            <React.Fragment key={show.title}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 13,
                  padding: '12px 15px',
                  minHeight: 64,
                }}
              >
                <GlassBadge id={show.svc} size={44} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontFamily: T.head,
                      fontSize: 17,
                      fontWeight: 500,
                      color: T.text,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {show.title}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 4 }}>
                    <span
                      style={{
                        fontFamily: T.mono,
                        fontSize: 10,
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        color: statusColor[show.status],
                        padding: '2px 7px',
                        borderRadius: 999,
                        background: statusColor[show.status] + '1e',
                        border: `0.5px solid ${statusColor[show.status]}44`,
                      }}
                    >
                      {show.status}
                    </span>
                    <span style={{ fontFamily: T.mono, fontSize: 11, color: T.text3 }}>
                      {show.ep}
                    </span>
                  </div>
                </div>
                {show.next !== '—' && (
                  <div
                    style={{
                      fontFamily: T.mono,
                      fontSize: 13,
                      color: T.text2,
                      flexShrink: 0,
                      textAlign: 'right',
                    }}
                  >
                    <div>{show.next}</div>
                    <div style={{ fontSize: 10, color: T.text3, marginTop: 2 }}>next ep</div>
                  </div>
                )}
              </div>
              {i < filtered.length - 1 && <FadeSep />}
            </React.Fragment>
          ))}
        </Glass>
      </div>
      <div style={{ height: 110 }}></div>
    </div>
  );
}

/* ================================================================
   SETTINGS SCREEN
   ================================================================ */
function SettingsScreen({ active }) {
  if (!active) return null;
  const rows = [
    { label: 'Notifications', detail: 'On' },
    { label: 'Pause reminders', detail: '24h before' },
    { label: 'Currency', detail: 'USD' },
    { label: 'Connected accounts', detail: '2' },
    { label: 'Privacy', detail: null },
    { label: 'About Tally', detail: 'v2.1' },
  ];
  return (
    <div
      style={{
        flex: 1,
        overflowY: 'auto',
        background: T.bg,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '60px 18px 0' }}>
        <div
          style={{
            fontFamily: T.head,
            fontSize: 34,
            fontWeight: 700,
            letterSpacing: '-0.02em',
            color: T.text,
          }}
        >
          Settings
        </div>
      </div>
      <div style={{ margin: '20px 14px 0', position: 'relative' }}>
        <Orb color={T.accent} size={160} top={-40} right={-20} opacity={0.2} />
        <Glass
          tint="rgba(255,255,255,0.06)"
          blur={20}
          radius={22}
          style={{ padding: '18px', position: 'relative', zIndex: 1 }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: 26,
                flexShrink: 0,
                background: `linear-gradient(135deg, ${T.accent}55, #8b22ff55)`,
                border: '0.5px solid rgba(255,255,255,0.14)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ fontFamily: T.head, fontWeight: 700, fontSize: 22, color: T.text }}>
                M
              </span>
            </div>
            <div>
              <div style={{ fontFamily: T.head, fontWeight: 600, fontSize: 17, color: T.text }}>
                Mira R.
              </div>
              <div style={{ fontFamily: T.mono, fontSize: 12, color: T.text3, marginTop: 3 }}>
                mira@example.com
              </div>
            </div>
          </div>
        </Glass>
      </div>
      <div style={{ margin: '22px 14px 0' }}>
        <Glass
          tint="rgba(255,255,255,0.05)"
          blur={20}
          radius={22}
          shimmer={false}
          style={{ overflow: 'hidden' }}
        >
          {rows.map((r, i) => (
            <React.Fragment key={r.label}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '16px 15px',
                  minHeight: 56,
                }}
              >
                <div style={{ flex: 1, fontFamily: T.head, fontSize: 17, color: T.text }}>
                  {r.label}
                </div>
                {r.detail && (
                  <span
                    style={{ fontFamily: T.mono, fontSize: 13, color: T.text3, marginRight: 8 }}
                  >
                    {r.detail}
                  </span>
                )}
                <svg width="8" height="14" viewBox="0 0 8 14" fill="none">
                  <path
                    d="M1 1l6 6-6 6"
                    stroke="rgba(245,244,240,0.25)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              {i < rows.length - 1 && <FadeSep />}
            </React.Fragment>
          ))}
        </Glass>
      </div>
      <div style={{ height: 110 }}></div>
    </div>
  );
}

/* ================================================================
   FLOATING LIQUID GLASS TAB BAR
   ================================================================ */
function FloatingTabBar({ activeTab, setActiveTab }) {
  const tabs = [
    {
      label: 'Dashboard',
      icon: (a) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={a ? T.accent : 'none'}
          stroke={a ? T.accent : 'rgba(255,255,255,0.4)'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z" />
        </svg>
      ),
    },
    {
      label: 'Search',
      icon: (a) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={a ? T.accent : 'rgba(255,255,255,0.4)'}
          strokeWidth="1.8"
          strokeLinecap="round"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
      ),
    },
    {
      label: 'Watchlist',
      icon: (a) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={a ? T.accent : 'none'}
          stroke={a ? T.accent : 'rgba(255,255,255,0.4)'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Settings',
      icon: (a) => (
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={a ? T.accent : 'rgba(255,255,255,0.4)'}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
  ];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 46,
        left: 0,
        right: 0,
        display: 'flex',
        justifyContent: 'center',
        zIndex: 55,
        pointerEvents: 'none',
      }}
    >
      <div
        style={{
          pointerEvents: 'all',
          position: 'relative',
          borderRadius: 9999,
          overflow: 'hidden',
          backdropFilter: 'blur(32px) saturate(200%)',
          WebkitBackdropFilter: 'blur(32px) saturate(200%)',
          background: 'rgba(14,12,20,0.72)',
          border: '0.5px solid rgba(255,255,255,0.18)',
          boxShadow:
            '0 8px 32px rgba(0,0,0,0.55), 0 2px 8px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -0.5px 0 rgba(255,255,255,0.06)',
          display: 'flex',
          alignItems: 'center',
          padding: '8px 10px',
          gap: 4,
        }}
      >
        {tabs.map((tab, i) => {
          const a = activeTab === i;
          return (
            <button
              key={tab.label}
              onClick={() => setActiveTab(i)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 3,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '6px 14px',
                borderRadius: 9999,
                position: 'relative',
              }}
            >
              {a && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: 9999,
                    background: `${T.accent}22`,
                    border: `0.5px solid ${T.accent}44`,
                    backdropFilter: 'blur(8px)',
                    WebkitBackdropFilter: 'blur(8px)',
                  }}
                ></div>
              )}
              {a && (
                <div
                  style={{
                    position: 'absolute',
                    top: 4,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: 36,
                    height: 28,
                    borderRadius: '50%',
                    background: `radial-gradient(ellipse, ${T.accent}55 0%, transparent 70%)`,
                    filter: 'blur(6px)',
                    pointerEvents: 'none',
                  }}
                ></div>
              )}
              <div style={{ position: 'relative', zIndex: 1 }}>{tab.icon(a)}</div>
              <span
                style={{
                  fontFamily: T.mono,
                  fontSize: 10,
                  color: a ? T.accent : 'rgba(255,255,255,0.40)',
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ================================================================
   MAIN APP
   ================================================================ */
function TallyiOS26() {
  const [activeTab, setActiveTab] = React.useState(0);
  return (
    <IOSDevice dark={true}>
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          background: T.bg,
        }}
      >
        <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
          <HomeScreen active={activeTab === 0} />
          <SearchScreen active={activeTab === 1} />
          <WatchlistScreen active={activeTab === 2} />
          <SettingsScreen active={activeTab === 3} />
        </div>
        <FloatingTabBar activeTab={activeTab} setActiveTab={setActiveTab} />
      </div>
    </IOSDevice>
  );
}

const iosRoot = ReactDOM.createRoot(document.getElementById('root'));
iosRoot.render(<TallyiOS26 />);
