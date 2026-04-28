/* ================================================================
   Container Style Exploration — 5 variants (A–E)
   Shared data + primitives, variant-driven rendering
   ================================================================ */

const CT = {
  bg: '#08080F',
  text: '#f5f4f0',
  text2: 'rgba(245,244,240,0.55)',
  text3: 'rgba(245,244,240,0.30)',
  accent: '#FF3D8B',
  head: "-apple-system, 'SF Pro Display', system-ui, sans-serif",
  display: "-apple-system, 'SF Pro Rounded', system-ui, sans-serif",
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
  { svc: 'netflix', window: 'Jun – Aug', save: 46.47, resumesOn: 'Sep 2' },
  { svc: 'disney', window: 'Oct – Dec', save: 27.98, resumesOn: 'Jan 14' },
  { svc: 'max', window: 'Jul only', save: 16.99, resumesOn: 'Aug 5' },
];
const UPCOMING = [
  { show: 'The Long Dusk', ep: 'S2E4', date: 'May 3', svc: 'max', isNext: true },
  { show: 'Paper Saints', ep: 'S4E7', date: 'May 8', svc: 'netflix', isNext: false },
  { show: 'Velvet Rope', ep: 'S1E9', date: 'May 14', svc: 'prime', isNext: false },
  { show: 'Nightshade Academy', ep: 'S3E1', date: 'May 19', svc: 'disney', isNext: false },
  { show: 'Undersea Signals', ep: 'S2E3', date: 'May 22', svc: 'hulu', isNext: false },
];
const fmtMoney = (n) => '$' + n.toFixed(2);
const totalSave = GAPS.reduce((a, g) => a + g.save, 0);

/* ── Shared primitives ── */
function COrb({ color, size, top, left, right, bottom, opacity = 0.45 }) {
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

function CBadge({ id, size = 44 }) {
  const s = SERVICES.find((x) => x.id === id);
  if (!s) return null;
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <COrb color={s.color} size={size * 1.6} top={-size * 0.3} left={-size * 0.3} opacity={0.4} />
      <div
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.3,
          position: 'relative',
          zIndex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: `${s.color}22`,
          border: `0.5px solid ${s.color}44`,
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
        }}
      >
        <span
          style={{ fontFamily: CT.head, fontWeight: 700, fontSize: size * 0.36, color: s.color }}
        >
          {s.short}
        </span>
      </div>
    </div>
  );
}

/* ── Variant-specific wrappers ── */

/* Section container */
function SectionWrap({ variant, children, style = {} }) {
  if (variant === 'A') return <div style={{ ...style }}>{children}</div>;
  if (variant === 'B') return <div style={{ ...style }}>{children}</div>;
  if (variant === 'C')
    return (
      <div
        style={{
          border: '0.5px solid rgba(255,255,255,0.06)',
          borderRadius: 20,
          overflow: 'hidden',
          ...style,
        }}
      >
        {children}
      </div>
    );
  if (variant === 'D')
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, ...style }}>{children}</div>
    );
  if (variant === 'E') return <div style={{ ...style }}>{children}</div>;
  return <div style={style}>{children}</div>;
}

/* Row wrapper */
function RowWrap({ variant, children, isEven, style = {} }) {
  if (variant === 'D')
    return (
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          borderRadius: 12,
          padding: '0',
          overflow: 'hidden',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          ...style,
        }}
      >
        {children}
      </div>
    );
  if (variant === 'E')
    return (
      <div style={{ background: isEven ? 'rgba(255,255,255,0.02)' : 'transparent', ...style }}>
        {children}
      </div>
    );
  return <div style={style}>{children}</div>;
}

/* Row divider */
function RowDiv({ variant }) {
  if (variant === 'A')
    return (
      <div style={{ position: 'relative', height: '0.5px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.08)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        ></div>
      </div>
    );
  if (variant === 'B' || variant === 'D' || variant === 'E') return null; // no dividers
  if (variant === 'C')
    return (
      <div style={{ position: 'relative', height: '0.5px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255,255,255,0.06)',
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        ></div>
      </div>
    );
  return null;
}

/* Section header */
function SHead({ variant, title, action }) {
  const leftBorder = variant === 'E';
  const topRule = variant === 'B';

  return (
    <div style={{ padding: '0 16px', marginBottom: 12 }}>
      {topRule && (
        <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginBottom: 10 }}></div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          {leftBorder && (
            <div
              style={{
                width: 2,
                height: 18,
                borderRadius: 1,
                background: CT.accent,
                marginRight: 10,
              }}
            ></div>
          )}
          <span
            style={{
              fontFamily: CT.head,
              fontWeight: 700,
              fontSize: 22,
              color: CT.text,
              letterSpacing: -0.3,
            }}
          >
            {title}
          </span>
        </div>
        {action && (
          <div
            style={{
              borderRadius: 999,
              padding: '5px 13px',
              backdropFilter: 'blur(14px)',
              WebkitBackdropFilter: 'blur(14px)',
              background: 'rgba(255,255,255,0.08)',
              border: '0.5px solid rgba(255,255,255,0.18)',
            }}
          >
            <span
              style={{
                fontFamily: CT.mono,
                fontSize: 11,
                color: CT.accent,
                letterSpacing: '0.04em',
              }}
            >
              {action} →
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* Hero card */
function HeroCard({ variant }) {
  const useGlass = variant !== 'A' && variant !== 'B' && variant !== 'E';
  const heroStyle = useGlass
    ? {
        borderRadius: 26,
        overflow: 'hidden',
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(24px) saturate(200%)',
        WebkitBackdropFilter: 'blur(24px) saturate(200%)',
        background: 'rgba(255,255,255,0.07)',
        boxShadow:
          'inset 1px 0 0 rgba(255,255,255,0.12), inset 0 1px 0 rgba(255,255,255,0.12), 0 2px 1px rgba(255,255,255,0.06) inset, 0 -1px 1px rgba(0,0,0,0.4) inset',
        border: '0.5px solid rgba(255,255,255,0.14)',
        padding: '22px 18px 20px',
      }
    : {
        position: 'relative',
        zIndex: 1,
        padding: '22px 18px 20px',
        ...(variant === 'B'
          ? { borderBottom: '1px solid rgba(255,255,255,0.08)', borderRadius: 0, paddingBottom: 24 }
          : {}),
        ...(variant === 'A' ? {} : {}),
        ...(variant === 'E'
          ? { background: 'rgba(255,255,255,0.02)', borderRadius: 26, padding: '22px 18px 20px' }
          : {}),
      };

  const stats = [
    { label: 'GAPS', val: '3' },
    { label: 'ACTIVE', val: '5 subs' },
    { label: 'TRACKING', val: '12 shows' },
    { label: 'MONTHLY', val: '$73' },
  ];

  return (
    <div style={{ padding: '16px 14px 0', position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <COrb color={CT.accent} size={240} top={-60} right={-40} opacity={0.3} />
        <COrb color={'#8b22ff'} size={180} top={40} left={-30} opacity={0.2} />
        {/* Shimmer line for glass variants */}
        <div style={heroStyle}>
          {useGlass && (
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 1,
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.55) 60%, transparent 100%)',
                borderRadius: '26px 26px 0 0',
                pointerEvents: 'none',
                zIndex: 10,
              }}
            ></div>
          )}
          <div
            style={{
              fontFamily: CT.mono,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: CT.accent,
              marginBottom: 10,
            }}
          >
            Your plan · Summer 2026
          </div>
          <div
            style={{
              fontFamily: CT.display,
              fontSize: 56,
              lineHeight: 1,
              letterSpacing: '-0.02em',
              color: CT.text,
              fontWeight: 700,
            }}
          >
            {fmtMoney(totalSave)}
          </div>
          <div
            style={{
              fontFamily: CT.mono,
              fontSize: 13,
              color: CT.text3,
              marginTop: 6,
              marginBottom: 18,
            }}
          >
            saveable Jun – Dec 2026 across {GAPS.length} gaps
          </div>
          {/* Stat pills */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              overflowX: 'auto',
              marginBottom: 18,
              scrollbarWidth: 'none',
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
                  background: 'rgba(0,0,0,0.30)',
                  border: '0.5px solid rgba(255,255,255,0.12)',
                }}
              >
                <span
                  style={{
                    fontFamily: CT.mono,
                    fontSize: 10,
                    letterSpacing: '0.12em',
                    color: CT.text3,
                  }}
                >
                  {s.label}
                </span>
                <span
                  style={{ fontFamily: CT.display, fontSize: 14, fontWeight: 700, color: CT.text }}
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
                background: `radial-gradient(ellipse, ${CT.accent}55 0%, transparent 70%)`,
                filter: 'blur(8px)',
                opacity: 0.55,
                pointerEvents: 'none',
              }}
            ></div>
            <div
              style={{
                borderRadius: 14,
                padding: '16px 0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: `${CT.accent}28`,
                border: `0.5px solid ${CT.accent}55`,
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
              }}
            >
              <span
                style={{
                  fontFamily: CT.head,
                  fontWeight: 600,
                  fontSize: 15,
                  color: CT.text,
                  position: 'relative',
                  zIndex: 1,
                }}
              >
                See pause schedule →
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── A single list row ── */
function ListRow({ item, variant, isEven, isLast, type }) {
  const s = SERVICES.find((x) => x.id === (item.svc || item.id));
  const isGap = type === 'gap';
  const isSub = type === 'sub';
  const isUpcoming = type === 'upcoming';

  const inner = (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 13,
        padding: variant === 'D' ? '14px 14px' : '14px 15px',
        minHeight: 64,
      }}
    >
      <CBadge id={isGap ? item.svc : isSub ? item.id : item.svc} size={44} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: CT.head,
            fontSize: isUpcoming ? 17 : 16,
            fontWeight: isUpcoming ? 500 : 600,
            color: CT.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {isGap ? s.name : isSub ? s.name : item.show}
        </div>
        <div
          style={{
            fontFamily: CT.mono,
            fontSize: isUpcoming ? 13 : 12,
            color: CT.text3,
            marginTop: 2,
          }}
        >
          {isGap ? item.window : isSub ? `${s.shows} airing` : `${item.ep} · ${s.name}`}
        </div>
      </div>
      <div style={{ flexShrink: 0, textAlign: 'right' }}>
        {isGap && (
          <span style={{ fontFamily: CT.display, fontSize: 20, fontWeight: 700, color: CT.accent }}>
            +{fmtMoney(item.save)}
          </span>
        )}
        {isSub && (
          <div>
            <div style={{ fontFamily: CT.display, fontSize: 18, fontWeight: 700, color: CT.text }}>
              {fmtMoney(s.price)}
            </div>
            <div
              style={{
                fontFamily: CT.mono,
                fontSize: 10,
                color: s.renews <= 3 ? CT.accent : CT.text3,
                marginTop: 1,
              }}
            >
              renews {s.renews}d
            </div>
          </div>
        )}
        {isUpcoming && (
          <span
            style={{
              fontFamily: CT.mono,
              fontSize: 15,
              color: item.isNext ? CT.accent : CT.text2,
              fontWeight: item.isNext ? 600 : 400,
            }}
          >
            {item.date}
          </span>
        )}
      </div>
    </div>
  );

  return (
    <React.Fragment>
      <RowWrap variant={variant} isEven={isEven}>
        {inner}
      </RowWrap>
      {!isLast && variant !== 'D' && <RowDiv variant={variant} />}
    </React.Fragment>
  );
}

/* ================================================================
   VARIANT DASHBOARD
   ================================================================ */
function VariantDashboard({ variant }) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        overflow: 'hidden',
        background: CT.bg,
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: 0,
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Greeting */}
        <div style={{ padding: '60px 18px 0' }}>
          <div
            style={{
              fontFamily: CT.mono,
              fontSize: 11,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: CT.text3,
              marginBottom: 4,
            }}
          >
            Apr 26 · Welcome back
          </div>
          <div
            style={{
              fontFamily: CT.head,
              fontSize: 28,
              fontWeight: 700,
              letterSpacing: '-0.02em',
              lineHeight: 1.0,
              color: CT.text,
            }}
          >
            Mira R.
          </div>
        </div>

        <HeroCard variant={variant} />

        {/* Gaps */}
        <div style={{ marginTop: 32 }}>
          <SHead variant={variant} title="Gaps found" action="All" />
          <div style={{ margin: '0 14px' }}>
            <SectionWrap variant={variant}>
              {GAPS.map((g, i) => (
                <ListRow
                  key={g.svc}
                  item={g}
                  variant={variant}
                  isEven={i % 2 === 0}
                  isLast={i === GAPS.length - 1}
                  type="gap"
                />
              ))}
            </SectionWrap>
          </div>
        </div>

        {/* What's next */}
        <div style={{ marginTop: 32 }}>
          <SHead variant={variant} title="What's next" action="My shows" />
          <div style={{ margin: '0 14px' }}>
            <SectionWrap variant={variant}>
              {UPCOMING.map((u, i) => (
                <ListRow
                  key={u.show}
                  item={u}
                  variant={variant}
                  isEven={i % 2 === 0}
                  isLast={i === UPCOMING.length - 1}
                  type="upcoming"
                />
              ))}
            </SectionWrap>
          </div>
        </div>

        {/* Subscriptions */}
        <div style={{ marginTop: 32 }}>
          <SHead variant={variant} title="Subscriptions" action="Manage" />
          <div style={{ margin: '0 14px' }}>
            <SectionWrap variant={variant}>
              {SERVICES.map((s, i) => (
                <ListRow
                  key={s.id}
                  item={s}
                  variant={variant}
                  isEven={i % 2 === 0}
                  isLast={i === SERVICES.length - 1}
                  type="sub"
                />
              ))}
            </SectionWrap>
          </div>
        </div>

        <div style={{ height: 50 }}></div>
      </div>
    </div>
  );
}

/* ================================================================
   CANVAS APP — 5 artboards
   ================================================================ */
const VARIANTS = [
  {
    id: 'A',
    label: 'A — No containers (raw)',
    desc: 'Editorial. Sections separated by spacing and fading hairline dividers only.',
  },
  {
    id: 'B',
    label: 'B — Inset rule only',
    desc: 'Full-width top rule per section. No dividers between rows. Finance-app feel.',
  },
  {
    id: 'C',
    label: 'C — Ghost containers',
    desc: 'Barely-visible border-only containers. No fill, no shadow.',
  },
  {
    id: 'D',
    label: 'D — Floating rows',
    desc: 'Each row is its own glass pill. No outer container. Native iOS feel.',
  },
  {
    id: 'E',
    label: 'E — Section tint strips',
    desc: 'Left accent bar on headers. Alternating subtle row tints.',
  },
];

/* Mount is handled by show-container-exploration.jsx */
Object.assign(window, {
  VARIANTS,
  VariantDashboard,
  CT,
  COrb,
  CBadge,
  SectionWrap,
  RowWrap,
  RowDiv,
  SHead,
  HeroCard,
  ListRow,
});
