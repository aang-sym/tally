/* ================================================================
   Container Style Exploration — Show Detail (5 variants A–E)
   ================================================================ */

/* Reuse tokens from container-exploration.jsx (CT is global) */

const SHOW_D = {
  title: 'Invincible',
  year: '2021–now',
  genres: ['Animation', 'Action', 'Adventure'],
  rating: 8.7,
  ratingCount: '322K',
  status: 'Returning Series',
  totalEpisodes: 32,
  overview:
    "Mark Grayson is a normal teenager except for the fact that his father is the most powerful superhero on the planet. Shortly after his seventeenth birthday, Mark begins to develop powers of his own and enters into his father's tutelage.",
  service: { id: 'prime', name: 'Prime Video', short: 'P', color: '#1399ff', price: 14.99 },
  otherServices: [{ name: 'Paramount+', short: 'P+', color: '#0068ff' }],
  posterBg: '#1a1040',
  posterFg: '#6b8aff',
};

const S_PROGRESS = { currentSeason: 2, currentEpisode: 4 };

const S_SEASONS = [
  { num: 1, year: 2021, eps: [1, 1, 1, 1, 1, 1, 1, 1] }, // all watched
  { num: 2, year: 2023, eps: [1, 1, 1, 0, 0, 0, 0, 0] }, // partial
  { num: 3, year: 2025, eps: [0, 0, 0, 0, 0, 0, 0, 0] },
  { num: 4, year: 2026, eps: [0, 0, 0, 0, 0, 0, 0, 0], airing: true },
];

const S_EPISODES_S2 = [
  { num: 1, title: 'A Lesson for Your Next Life', date: 'Nov 3', w: true },
  { num: 2, title: 'In About Six Hours…', date: 'Nov 10', w: true },
  { num: 3, title: 'This Missive, This Machination!', date: 'Nov 17', w: true },
  { num: 4, title: "It's Been a While", date: 'Nov 24', w: false },
  { num: 5, title: 'This Must Come as a Shock', date: 'Dec 1', w: false },
  { num: 6, title: "It's Not That Simple", date: 'Dec 8', w: false },
  { num: 7, title: "I'm Not Going Anywhere", date: 'Dec 15', w: false },
  { num: 8, title: 'I Thought You Were Stronger', date: 'Dec 22', w: false },
];

const SIMILAR = [
  { title: 'The Boys', bg: '#1a0a0a', fg: '#ff4444', color: '#1399ff', svc: 'Prime' },
  { title: 'Arcane', bg: '#0a1520', fg: '#4488ff', color: '#e50914', svc: 'Netflix' },
  { title: 'Castlevania', bg: '#200a0a', fg: '#cc3333', color: '#e50914', svc: 'Netflix' },
  { title: 'One Punch Man', bg: '#0a1a10', fg: '#ffcc00', color: '#1ce783', svc: 'Hulu' },
];

function sPosterSVG(title, bg, fg) {
  const w = title.split(' ');
  const ini = w.length >= 2 ? w[0][0] + w[w.length - 1][0] : title.slice(0, 2);
  return `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450"><rect fill="${bg}" width="300" height="450"/><text x="150" y="245" fill="${fg}" font-family="serif" font-size="88" font-style="italic" text-anchor="middle" opacity="0.9">${ini.toUpperCase()}</text></svg>`)}`;
}

/* ── Show detail variant screen ── */
function ShowVariant({ variant }) {
  const [expanded, setExpanded] = React.useState(true); // S2 expanded

  /* Variant helpers (reuse from container-exploration) */
  const wrap = (children) => {
    if (variant === 'A') return <div>{children}</div>;
    if (variant === 'B') return <div>{children}</div>;
    if (variant === 'C')
      return (
        <div
          style={{
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            overflow: 'hidden',
          }}
        >
          {children}
        </div>
      );
    if (variant === 'D')
      return <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{children}</div>;
    if (variant === 'E') return <div>{children}</div>;
    return <div>{children}</div>;
  };

  const rowBg = (i) => {
    if (variant === 'D')
      return {
        background: 'rgba(255,255,255,0.04)',
        borderRadius: 12,
        overflow: 'hidden',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
      };
    if (variant === 'E')
      return { background: i % 2 === 0 ? 'rgba(255,255,255,0.02)' : 'transparent' };
    return {};
  };

  const divider = (isLast) => {
    if (isLast || variant === 'B' || variant === 'D' || variant === 'E') return null;
    const opacity = variant === 'A' ? 0.08 : 0.06;
    return (
      <div style={{ position: 'relative', height: '0.5px', overflow: 'hidden' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `rgba(255,255,255,${opacity})`,
            WebkitMaskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
            maskImage:
              'linear-gradient(90deg, transparent 0%, black 15%, black 85%, transparent 100%)',
          }}
        ></div>
      </div>
    );
  };

  const sHead = (title, accent) => {
    const leftBorder = variant === 'E';
    const topRule = variant === 'B';
    return (
      <div style={{ padding: '0 16px', marginBottom: 10 }}>
        {topRule && (
          <div style={{ height: 1, background: 'rgba(255,255,255,0.10)', marginBottom: 10 }}></div>
        )}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          {leftBorder && (
            <div
              style={{
                width: 2,
                height: 16,
                borderRadius: 1,
                background: CT.accent,
                marginRight: 10,
              }}
            ></div>
          )}
          <span
            style={{
              fontFamily: CT.mono,
              fontSize: 10,
              letterSpacing: '0.12em',
              textTransform: 'uppercase',
              color: accent ? CT.accent : CT.text3,
            }}
          >
            {title}
          </span>
        </div>
      </div>
    );
  };

  /* Glass wrapper for insight card — follows variant */
  const insightCard = (children) => {
    const useGlass = variant === 'C' || variant === 'D';
    if (useGlass)
      return (
        <div
          style={{
            borderRadius: 22,
            overflow: 'hidden',
            position: 'relative',
            backdropFilter: 'blur(22px) saturate(200%)',
            WebkitBackdropFilter: 'blur(22px) saturate(200%)',
            background: 'rgba(255,255,255,0.06)',
            boxShadow:
              'inset 1px 0 0 rgba(255,255,255,0.10), inset 0 1px 0 rgba(255,255,255,0.10), 0 2px 1px rgba(255,255,255,0.06) inset',
            border: '0.5px solid rgba(255,255,255,0.14)',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 1,
              background:
                'linear-gradient(90deg, transparent, rgba(255,255,255,0.35) 40%, rgba(255,255,255,0.55) 60%, transparent)',
              pointerEvents: 'none',
              zIndex: 10,
            }}
          ></div>
          {children}
        </div>
      );
    if (variant === 'B')
      return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 20 }}>
          {children}
        </div>
      );
    if (variant === 'E')
      return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 22, overflow: 'hidden' }}>
          {children}
        </div>
      );
    return <div>{children}</div>; // A: raw
  };

  const progressCard = (children) => {
    if (variant === 'C')
      return (
        <div
          style={{
            border: '0.5px solid rgba(255,255,255,0.06)',
            borderRadius: 20,
            overflow: 'hidden',
            padding: 16,
          }}
        >
          {children}
        </div>
      );
    if (variant === 'D')
      return (
        <div
          style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 16,
            padding: 16,
            backdropFilter: 'blur(8px)',
          }}
        >
          {children}
        </div>
      );
    if (variant === 'B')
      return (
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: 16 }}>
          {children}
        </div>
      );
    if (variant === 'E')
      return (
        <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: 16, padding: 16 }}>
          {children}
        </div>
      );
    return <div style={{ padding: '0' }}>{children}</div>; // A
  };

  const watchedCount = S_SEASONS.reduce((a, s) => a + s.eps.filter((e) => e).length, 0);

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
        {/* ── HERO BACKDROP ── */}
        <div
          style={{
            position: 'relative',
            minHeight: 300,
            overflow: 'hidden',
            background: 'linear-gradient(180deg, #0d0820 0%, #1a0a30 50%, #08080F 100%)',
          }}
        >
          <COrb color={SHOW_D.service.color} size={250} top={-50} left={-30} opacity={0.15} />
          {/* Back pill */}
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
          {/* Poster + title */}
          <div
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '60px 16px 16px',
              background: `linear-gradient(to top, ${CT.bg}, transparent)`,
              display: 'flex',
              gap: 14,
              alignItems: 'flex-end',
            }}
          >
            <div
              style={{
                width: 90,
                height: 135,
                borderRadius: 12,
                overflow: 'hidden',
                flexShrink: 0,
                boxShadow: '0 8px 32px rgba(0,0,0,0.6)',
              }}
            >
              <img
                src={sPosterSVG(SHOW_D.title, SHOW_D.posterBg, SHOW_D.posterFg)}
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </div>
            <div style={{ flex: 1, paddingBottom: 4 }}>
              <div
                style={{
                  fontFamily: CT.head,
                  fontSize: 26,
                  fontWeight: 700,
                  letterSpacing: '-0.02em',
                  lineHeight: 1.0,
                  color: CT.text,
                }}
              >
                {SHOW_D.title}
              </div>
              <div style={{ fontFamily: CT.mono, fontSize: 11, color: CT.text3, marginTop: 4 }}>
                {SHOW_D.year} · {SHOW_D.genres.slice(0, 2).join(' · ')}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#f5c518">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z" />
                </svg>
                <span
                  style={{ fontFamily: CT.head, fontSize: 13, fontWeight: 600, color: CT.text }}
                >
                  {SHOW_D.rating}
                </span>
                <span style={{ fontFamily: CT.mono, fontSize: 10, color: CT.text3 }}>
                  {SHOW_D.ratingCount}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* ── TALLY INSIGHT ── */}
        <div style={{ padding: '20px 14px 0' }}>
          {sHead('Tally insight', true)}
          <div style={{ margin: '0 14px 0 0', position: 'relative' }}>
            <COrb color={CT.accent} size={180} top={-30} right={-20} opacity={0.18} />
            {insightCard(
              <div style={{ padding: '18px 16px', position: 'relative', zIndex: 1 }}>
                <div
                  style={{
                    fontFamily: CT.head,
                    fontSize: 17,
                    fontWeight: 700,
                    color: CT.text,
                    lineHeight: 1.2,
                  }}
                >
                  11-week gap starting Aug 2
                </div>
                <div
                  style={{
                    fontFamily: CT.mono,
                    fontSize: 11,
                    color: CT.text3,
                    marginTop: 4,
                    lineHeight: 1.4,
                  }}
                >
                  Safe to pause Prime Video. Save $98.89.
                </div>
                <div style={{ marginTop: 14 }}>
                  <div
                    style={{
                      display: 'inline-flex',
                      borderRadius: 999,
                      padding: '9px 18px',
                      background: `${CT.accent}28`,
                      border: `0.5px solid ${CT.accent}44`,
                      backdropFilter: 'blur(10px)',
                      WebkitBackdropFilter: 'blur(10px)',
                      cursor: 'pointer',
                    }}
                  >
                    <span
                      style={{ fontFamily: CT.head, fontWeight: 600, fontSize: 13, color: CT.text }}
                    >
                      Set pause reminder
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── PROGRESS ── */}
        <div style={{ padding: '24px 14px 0' }}>
          {sHead('Your progress')}
          <div style={{ margin: '0' }}>
            {progressCard(
              <div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    justifyContent: 'space-between',
                    marginBottom: 10,
                    padding: variant === 'A' || variant === 'B' ? '0 2px' : 0,
                  }}
                >
                  <span
                    style={{ fontFamily: CT.head, fontSize: 15, fontWeight: 600, color: CT.text }}
                  >
                    Season 2{' '}
                    <span
                      style={{
                        fontFamily: CT.mono,
                        fontSize: 11,
                        color: CT.text3,
                        fontWeight: 400,
                      }}
                    >
                      E4 of 8
                    </span>
                  </span>
                  <span style={{ fontFamily: CT.mono, fontSize: 11, color: CT.text3 }}>
                    {watchedCount}/32
                  </span>
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {S_SEASONS.map((season) => (
                    <div key={season.num} style={{ flex: 1 }}>
                      <div
                        style={{
                          fontFamily: CT.mono,
                          fontSize: 7,
                          color: CT.text3,
                          marginBottom: 3,
                          textAlign: 'center',
                        }}
                      >
                        S{season.num}
                      </div>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {season.eps.map((w, i) => {
                          const cur = season.num === 2 && i === 3;
                          return (
                            <div
                              key={i}
                              style={{
                                flex: 1,
                                height: 18,
                                borderRadius: 2,
                                background: w
                                  ? CT.accent
                                  : cur
                                    ? `${CT.accent}35`
                                    : 'rgba(255,255,255,0.06)',
                                border: cur && !w ? `0.5px solid ${CT.accent}` : 'none',
                              }}
                            ></div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── SEASONS (S2 expanded) ── */}
        <div style={{ padding: '24px 14px 0' }}>
          {sHead('Seasons & episodes')}
          {wrap(
            <div>
              {S_SEASONS.map((season, si) => {
                const isExp = expanded && season.num === 2;
                const epW = season.eps.filter((e) => e).length;
                const allW = epW === 8;

                const headerRow = (
                  <div
                    onClick={() => setExpanded(season.num === 2 ? !expanded : false)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: variant === 'D' ? '12px 14px' : '12px 15px',
                      minHeight: 48,
                      cursor: 'pointer',
                    }}
                  >
                    <svg
                      width="10"
                      height="10"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={CT.text3}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      style={{
                        flexShrink: 0,
                        transition: 'transform 0.3s',
                        transform: isExp ? 'rotate(90deg)' : 'none',
                      }}
                    >
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                    <div style={{ flex: 1 }}>
                      <span
                        style={{
                          fontFamily: CT.head,
                          fontSize: 14,
                          fontWeight: 600,
                          color: CT.text,
                        }}
                      >
                        Season {season.num}
                      </span>
                      <span
                        style={{
                          fontFamily: CT.mono,
                          fontSize: 10,
                          color: CT.text3,
                          marginLeft: 6,
                        }}
                      >
                        {season.year}
                      </span>
                      {season.airing && (
                        <span
                          style={{
                            fontFamily: CT.mono,
                            fontSize: 8,
                            color: '#1ce783',
                            marginLeft: 6,
                          }}
                        >
                          ● AIRING
                        </span>
                      )}
                    </div>
                    <span
                      style={{
                        fontFamily: CT.mono,
                        fontSize: 10,
                        color: allW ? '#1ce783' : CT.text3,
                      }}
                    >
                      {allW ? '✓' : `${epW}/8`}
                    </span>
                  </div>
                );

                return (
                  <React.Fragment key={season.num}>
                    {si > 0 && variant !== 'D' && divider(false)}
                    <div
                      style={
                        variant === 'D'
                          ? {
                              background: 'rgba(255,255,255,0.04)',
                              borderRadius: 12,
                              overflow: 'hidden',
                            }
                          : {}
                      }
                    >
                      {headerRow}
                      {isExp && (
                        <div>
                          {S_EPISODES_S2.map((ep, ei) => {
                            const cur = ep.num === 4;
                            return (
                              <React.Fragment key={ep.num}>
                                {divider(false)}
                                <div
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 8,
                                    padding: '8px 15px',
                                    minHeight: 40,
                                    background: cur
                                      ? `${CT.accent}0a`
                                      : variant === 'E' && ei % 2 === 0
                                        ? 'rgba(255,255,255,0.015)'
                                        : 'transparent',
                                  }}
                                >
                                  <div
                                    style={{
                                      width: 18,
                                      height: 18,
                                      borderRadius: 5,
                                      flexShrink: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      background: ep.w ? CT.accent : 'transparent',
                                      border: ep.w ? 'none' : '1.5px solid rgba(255,255,255,0.15)',
                                    }}
                                  >
                                    {ep.w && (
                                      <svg
                                        width="10"
                                        height="10"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                        stroke={CT.bg}
                                        strokeWidth="3"
                                      >
                                        <path d="M20 6L9 17l-5-5" />
                                      </svg>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: CT.mono,
                                      fontSize: 10,
                                      color: CT.text3,
                                      width: 22,
                                    }}
                                  >
                                    E{ep.num}
                                  </span>
                                  <div
                                    style={{
                                      flex: 1,
                                      minWidth: 0,
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 5,
                                    }}
                                  >
                                    <span
                                      style={{
                                        fontFamily: CT.head,
                                        fontSize: 13,
                                        color: ep.w ? CT.text3 : CT.text,
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap',
                                      }}
                                    >
                                      {ep.title}
                                    </span>
                                    {cur && (
                                      <span
                                        style={{
                                          fontFamily: CT.mono,
                                          fontSize: 7,
                                          padding: '1px 4px',
                                          borderRadius: 3,
                                          background: CT.accent,
                                          color: CT.bg,
                                          flexShrink: 0,
                                        }}
                                      >
                                        NOW
                                      </span>
                                    )}
                                  </div>
                                  <span
                                    style={{
                                      fontFamily: CT.mono,
                                      fontSize: 9,
                                      color: CT.text3,
                                      flexShrink: 0,
                                    }}
                                  >
                                    {ep.date}
                                  </span>
                                </div>
                              </React.Fragment>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
          )}
        </div>

        {/* ── SIMILAR ── */}
        <div style={{ padding: '24px 0 0' }}>
          <div style={{ padding: '0 14px' }}>{sHead('More like this')}</div>
          <div
            style={{
              display: 'flex',
              gap: 10,
              overflowX: 'auto',
              padding: '0 14px 4px',
              scrollbarWidth: 'none',
            }}
          >
            {SIMILAR.map((s) => (
              <div key={s.title} style={{ width: 90, flexShrink: 0 }}>
                <div style={{ width: 90, height: 135, borderRadius: 10, overflow: 'hidden' }}>
                  <img
                    src={sPosterSVG(s.title, s.bg, s.fg)}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>
                <div
                  style={{
                    fontFamily: CT.head,
                    fontSize: 11,
                    fontWeight: 500,
                    color: CT.text,
                    marginTop: 5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s.title}
                </div>
                <div style={{ fontFamily: CT.mono, fontSize: 8, color: CT.text3 }}>
                  <span style={{ color: s.color }}>{s.svc}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ height: 50 }}></div>
      </div>
    </div>
  );
}

/* ================================================================
   ADD SHOW DETAIL SECTION TO CANVAS
   ================================================================ */
const SHOW_VARIANTS = [
  { id: 'SA', vid: 'A', label: 'A — No containers (raw)' },
  { id: 'SB', vid: 'B', label: 'B — Inset rule only' },
  { id: 'SC', vid: 'C', label: 'C — Ghost containers' },
  { id: 'SD', vid: 'D', label: 'D — Floating rows' },
  { id: 'SE', vid: 'E', label: 'E — Section tint strips' },
];

function ContainerExplorationFull() {
  return (
    <DesignCanvas>
      <DCSection id="dashboard" title="Dashboard — Container Styles">
        {VARIANTS.map((v) => (
          <DCArtboard key={v.id} id={v.id} label={v.label} width={402} height={920}>
            <div
              style={{
                position: 'absolute',
                bottom: 12,
                left: 12,
                right: 12,
                zIndex: 20,
                borderRadius: 12,
                padding: '10px 14px',
                background: 'rgba(8,8,15,0.88)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '0.5px solid rgba(255,255,255,0.12)',
              }}
            >
              <div style={{ fontFamily: CT.mono, fontSize: 10, color: CT.text3, lineHeight: 1.4 }}>
                {v.desc}
              </div>
            </div>
            <IOSDevice dark={true}>
              <VariantDashboard variant={v.id} />
            </IOSDevice>
          </DCArtboard>
        ))}
      </DCSection>
      <DCSection id="show-detail" title="Show Detail — Container Styles">
        {SHOW_VARIANTS.map((v) => (
          <DCArtboard key={v.id} id={v.id} label={v.label} width={402} height={920}>
            <IOSDevice dark={true}>
              <ShowVariant variant={v.vid} />
            </IOSDevice>
          </DCArtboard>
        ))}
      </DCSection>
    </DesignCanvas>
  );
}

/* Mount everything */
const cRootEl = document.getElementById('root');
const cRoot = ReactDOM.createRoot(cRootEl);
cRoot.render(<ContainerExplorationFull />);
