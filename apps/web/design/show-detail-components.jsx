/* ============================================================
   Tally — Show Detail Page Components
   ============================================================ */

/* ---------- Data ---------- */
const SHOW = {
  title: 'Invincible',
  year: '2021–now',
  genres: ['Animation', 'Action', 'Adventure'],
  rating: 8.7,
  ratingCount: '322K',
  status: 'Returning Series',
  seasons: 4,
  episodesPerSeason: 8,
  totalEpisodes: 32,
  overview: "Mark Grayson is a normal teenager except for the fact that his father is the most powerful superhero on the planet. Shortly after his seventeenth birthday, Mark begins to develop powers of his own and enters into his father's tutelage.",
  service: { id: 'prime', name: 'Prime Video', short: 'P', color: '#1399ff', price: 14.99 },
  otherServices: [
    { name: 'Paramount+', short: 'P+', color: '#0068ff' }
  ],
  posterBg: '#1a1040',
  posterFg: '#6b8aff',
  backdropGrad: ['#0d0820', '#1a0a30', '#0a0a0c'],
};

const USER_PROGRESS = {
  currentSeason: 2,
  currentEpisode: 4,
  watchedTotal: 12,
};

const SEASONS_DATA = [
  {
    num: 1, year: 2021, episodes: [
      { num: 1, title: "It's About Time", date: 'Mar 25, 2021', watched: true },
      { num: 2, title: "Here Goes Nothing", date: 'Mar 25, 2021', watched: true },
      { num: 3, title: "Who You Calling Ugly?", date: 'Apr 2, 2021', watched: true },
      { num: 4, title: "Neil Armstrong, Eat Your Heart Out", date: 'Apr 9, 2021', watched: true },
      { num: 5, title: "That Actually Hurt", date: 'Apr 16, 2021', watched: true },
      { num: 6, title: "You Look Kinda Dead", date: 'Apr 23, 2021', watched: true },
      { num: 7, title: "We Need to Talk", date: 'Apr 23, 2021', watched: true },
      { num: 8, title: "Where I Really Come From", date: 'Apr 30, 2021', watched: true },
    ]
  },
  {
    num: 2, year: 2023, episodes: [
      { num: 1, title: "A Lesson for Your Next Life", date: 'Nov 3, 2023', watched: true },
      { num: 2, title: "In About Six Hours I Lose My Virginity", date: 'Nov 10, 2023', watched: true },
      { num: 3, title: "This Missive, This Machination!", date: 'Nov 17, 2023', watched: true },
      { num: 4, title: "It's Been a While", date: 'Nov 24, 2023', watched: false },
      { num: 5, title: "This Must Come as a Shock", date: 'Dec 1, 2023', watched: false },
      { num: 6, title: "It's Not That Simple", date: 'Dec 8, 2023', watched: false },
      { num: 7, title: "I'm Not Going Anywhere", date: 'Dec 15, 2023', watched: false },
      { num: 8, title: "I Thought You Were Stronger", date: 'Dec 22, 2023', watched: false },
    ]
  },
  {
    num: 3, year: 2024, episodes: [
      { num: 1, title: "Together Again", date: 'Feb 6, 2025', watched: false },
      { num: 2, title: "Out of My League", date: 'Feb 13, 2025', watched: false },
      { num: 3, title: "Small Mercies", date: 'Feb 20, 2025', watched: false },
      { num: 4, title: "All That Lies Ahead", date: 'Feb 27, 2025', watched: false },
      { num: 5, title: "A New Chapter", date: 'Mar 6, 2025', watched: false },
      { num: 6, title: "The Hard Truth", date: 'Mar 13, 2025', watched: false },
      { num: 7, title: "Everything in Its Right Place", date: 'Mar 20, 2025', watched: false },
      { num: 8, title: "All Roads Lead Here", date: 'Mar 27, 2025', watched: false },
    ]
  },
  {
    num: 4, year: 2026, airing: true, episodes: [
      { num: 1, title: "Mark of the Viltrumite", date: 'Jun 12, 2026', watched: false },
      { num: 2, title: "Consequences", date: 'Jun 19, 2026', watched: false },
      { num: 3, title: "One Step Closer", date: 'Jun 26, 2026', watched: false },
      { num: 4, title: "Breaking Point", date: 'Jul 3, 2026', watched: false },
      { num: 5, title: "TBA", date: 'Jul 10, 2026', watched: false },
      { num: 6, title: "TBA", date: 'Jul 17, 2026', watched: false },
      { num: 7, title: "TBA", date: 'Jul 24, 2026', watched: false },
      { num: 8, title: "TBA", date: 'Jul 31, 2026', watched: false },
    ]
  },
];

const SIMILAR_SHOWS = [
  { title: 'The Boys', year: 2019, service: 'Prime Video', color: '#1399ff', bg: '#1a0a0a', fg: '#ff4444' },
  { title: 'Arcane', year: 2021, service: 'Netflix', color: '#e50914', bg: '#0a1520', fg: '#4488ff' },
  { title: 'Castlevania', year: 2017, service: 'Netflix', color: '#e50914', bg: '#200a0a', fg: '#cc3333' },
  { title: 'One Punch Man', year: 2015, service: 'Hulu', color: '#1ce783', bg: '#0a1a10', fg: '#ffcc00' },
  { title: 'My Hero Academia', year: 2016, service: 'Hulu', color: '#1ce783', bg: '#0a0a20', fg: '#4466ff' },
];

/* ---------- SVG icons ---------- */
const Icons = {
  star: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01z"/></svg>,
  check: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>,
  lock: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
  chevDown: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>,
  chevRight: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 18l6-6-6-6"/></svg>,
  pause: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>,
  play: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>,
  bell: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  arrow: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 12h14M13 5l7 7-7 7"/></svg>,
  back: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M15 18l-6-6 6-6"/></svg>,
  calendar: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>,
  live: <span className="inline-flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1ce783] animate-pulse"></span><span className="text-[11px] font-mono" style={{color:'#1ce783'}}>AIRING</span></span>,
};

/* ---------- Poster generator (SVG) ---------- */
function posterURL(title, bg, fg) {
  const words = title.split(' ');
  const initials = words.length >= 2
    ? words[0][0] + words[words.length-1][0]
    : title.slice(0,2);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="450" viewBox="0 0 300 450">
    <rect fill="${bg}" width="300" height="450"/>
    <text x="150" y="245" fill="${fg}" font-family="serif" font-size="88" font-style="italic" text-anchor="middle" opacity="0.9">${initials.toUpperCase()}</text>
    <text x="150" y="400" fill="${fg}" font-family="monospace" font-size="14" text-anchor="middle" opacity="0.5">${title}</text>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/* ============================================================
   MAIN APP
   ============================================================ */
function ShowDetailApp() {
  const [auth, setAuth] = React.useState(SHOW_TWEAKS.authState || 'loggedIn');
  const [expandedSeasons, setExpandedSeasons] = React.useState({ 2: true, 4: true });
  const [watchedEps, setWatchedEps] = React.useState(() => {
    const map = {};
    SEASONS_DATA.forEach(s => s.episodes.forEach(e => { map[`${s.num}-${e.num}`] = e.watched; }));
    return map;
  });
  const [trackStatus, setTrackStatus] = React.useState('watching'); // watching | watchlist | completed | dropped | none
  const loggedIn = auth === 'loggedIn';

  // Listen for tweaks
  React.useEffect(() => {
    const handler = () => {
      setAuth(SHOW_TWEAKS.authState || 'loggedIn');
    };
    window.addEventListener('tweaks-updated', handler);
    return () => window.removeEventListener('tweaks-updated', handler);
  }, []);

  const toggleSeason = (num) => {
    setExpandedSeasons(prev => ({ ...prev, [num]: !prev[num] }));
  };

  const toggleEp = (sNum, eNum) => {
    if (!loggedIn) return;
    const key = `${sNum}-${eNum}`;
    setWatchedEps(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const watchedCount = Object.values(watchedEps).filter(Boolean).length;
  const progressPct = Math.round((watchedCount / SHOW.totalEpisodes) * 100);

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      {/* ======== HEADER (simplified) ======== */}
      <header className="fixed top-0 inset-x-0 z-40 hdr-stuck">
        <div className="max-w-[1320px] mx-auto px-5 lg:px-8 h-14 flex items-center gap-4">
          <a href="Tally Home.html" className="flex items-center gap-2 shrink-0 group">
            <span className="tally-mark text-[24px] leading-none">Tally<span style={{color:'var(--accent)'}}>.</span></span>
          </a>
          <div className="flex-1"></div>
          <div className="flex items-center gap-3 text-[13px]">
            {!loggedIn && (
              <>
                <button className="px-3.5 h-8 rounded-full btn-ghost text-[12px]" onClick={() => setAuth('loggedIn')}>Log in</button>
                <button className="px-3.5 h-8 rounded-full btn-primary text-[12px]" onClick={() => setAuth('loggedIn')}>Sign up</button>
              </>
            )}
            {loggedIn && (
              <>
                <button className="px-3.5 h-8 rounded-full btn-ghost text-[12px]" onClick={() => setAuth('loggedOut')}>Sign out</button>
                <div className="avatar text-[11px]">JR</div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ======== BACKDROP ======== */}
      <div className="relative w-full grain" style={{
        height: 'clamp(280px, 42vh, 480px)',
        background: `linear-gradient(180deg, ${SHOW.backdropGrad[0]} 0%, ${SHOW.backdropGrad[1]} 40%, ${SHOW.backdropGrad[2]} 100%)`,
      }}>
        {/* Subtle radial glow */}
        <div className="absolute inset-0" style={{
          background: `radial-gradient(ellipse 70% 80% at 30% 60%, ${SHOW.service.color}18, transparent 70%)`,
        }}></div>
        {/* Title overlay at bottom */}
        <div className="absolute bottom-0 left-0 right-0 px-5 lg:px-8 pb-8 pt-20" style={{
          background: 'linear-gradient(to top, var(--bg), transparent)',
        }}>
          <div className="max-w-[1320px] mx-auto">
            <div className="md:pl-[220px] lg:pl-[280px]">
              <h1 className="font-serif text-[42px] md:text-[56px] lg:text-[68px] leading-[0.95] tracking-[-0.03em]">
                {SHOW.title}
              </h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-3 text-[13px] font-mono text-[var(--text-2)]">
                <span>{SHOW.year}</span>
                <span style={{color:'var(--text-3)'}}>·</span>
                {SHOW.genres.map((g,i) => <span key={g}>{g}</span>).reduce((a,b) => [a, <span key={`d${b.key}`} style={{color:'var(--text-3)'}}>·</span>, b])}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span style={{color:'#f5c518'}}>{Icons.star}</span>
                <span className="text-[14px] font-medium">{SHOW.rating}</span>
                <span className="text-[12px] font-mono text-[var(--text-3)]">{SHOW.ratingCount} ratings</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======== TWO-COLUMN LAYOUT ======== */}
      <div className="max-w-[1320px] mx-auto px-5 lg:px-8 pb-24">
        <div className="flex flex-col md:flex-row gap-8 lg:gap-12 -mt-24 md:-mt-32 relative z-10">

          {/* LEFT — Poster + Actions */}
          <div className="w-[160px] md:w-[200px] lg:w-[240px] shrink-0 md:sticky md:top-20 self-start">
            <div className="poster shadow-2xl" style={{borderRadius:12}}>
              <img src={posterURL(SHOW.title, SHOW.posterBg, SHOW.posterFg)} alt={SHOW.title} />
            </div>

            {/* Status buttons */}
            <div className="mt-4 flex flex-col gap-1.5">
              {['watching','watchlist','completed','dropped'].map(s => {
                const active = trackStatus === s && loggedIn;
                const labels = { watching: 'Watching', watchlist: 'Watchlist', completed: 'Completed', dropped: 'Dropped' };
                const colors = { watching: '#1ce783', watchlist: 'var(--accent)', completed: '#1399ff', dropped: '#ff5555' };
                return (
                  <button key={s}
                    className="flex items-center gap-2 px-3 h-9 rounded-lg text-[12px] font-mono transition-all text-left"
                    style={{
                      background: active ? `${colors[s]}18` : 'transparent',
                      border: `1px solid ${active ? colors[s] + '55' : 'var(--border)'}`,
                      color: active ? colors[s] : 'var(--text-2)',
                    }}
                    onClick={() => {
                      if (!loggedIn) { alert('Log in to track this show'); return; }
                      setTrackStatus(trackStatus === s ? 'none' : s);
                    }}
                  >
                    {active && <span style={{color: colors[s]}}>{Icons.check}</span>}
                    {labels[s]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* RIGHT — Content */}
          <div className="flex-1 min-w-0 pt-2 md:pt-8">

            {/* --- Where to watch --- */}
            <section className="mb-8">
              <div className="label mb-3">Where to watch</div>
              <div className="flex flex-wrap gap-3">
                <div className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--surface)]"
                     style={{borderColor: SHOW.service.color + '44'}}>
                  <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-[15px]"
                        style={{background: SHOW.service.color + '22', color: SHOW.service.color, border: `1px solid ${SHOW.service.color}55`}}>
                    {SHOW.service.short}
                  </span>
                  <div>
                    <div className="text-[14px] font-medium">{SHOW.service.name}</div>
                    <div className="text-[11px] font-mono text-[var(--text-3)]">${SHOW.service.price}/mo · US</div>
                  </div>
                </div>
                {SHOW.otherServices.map(s => (
                  <div key={s.name} className="flex items-center gap-3 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--bg-2)]">
                    <span className="inline-flex items-center justify-center w-10 h-10 rounded-lg font-bold text-[13px]"
                          style={{background: s.color + '18', color: s.color, border: `1px solid ${s.color}44`}}>
                      {s.short}
                    </span>
                    <div>
                      <div className="text-[14px] text-[var(--text-2)]">{s.name}</div>
                      <div className="text-[11px] font-mono text-[var(--text-3)]">Also available</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* --- Tally Insight --- */}
            <TallyInsight loggedIn={loggedIn} setAuth={setAuth} />

            {/* --- Progress (logged-in) --- */}
            {loggedIn ? (
              <section className="mb-8">
                <div className="label mb-3">Your progress</div>
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5 md:p-6">
                  <div className="flex items-baseline justify-between mb-4">
                    <div>
                      <span className="text-[18px] font-serif">Season {USER_PROGRESS.currentSeason}</span>
                      <span className="text-[14px] text-[var(--text-2)] ml-2">Episode {USER_PROGRESS.currentEpisode} of 8</span>
                    </div>
                    <div className="text-[12px] font-mono text-[var(--text-3)]">{watchedCount} of {SHOW.totalEpisodes} total</div>
                  </div>

                  {/* Season blocks visualization */}
                  <div className="flex gap-2 md:gap-3">
                    {SEASONS_DATA.map(season => (
                      <div key={season.num} className="flex-1 min-w-0">
                        <div className="text-[10px] font-mono text-[var(--text-3)] mb-1.5 text-center">S{season.num}</div>
                        <div className="flex gap-[3px]">
                          {season.episodes.map(ep => {
                            const key = `${season.num}-${ep.num}`;
                            const watched = watchedEps[key];
                            const isCurrent = season.num === USER_PROGRESS.currentSeason && ep.num === USER_PROGRESS.currentEpisode;
                            return (
                              <div key={key}
                                className="flex-1 rounded-sm cursor-pointer transition-colors"
                                style={{
                                  height: 28,
                                  background: watched
                                    ? 'var(--accent)'
                                    : isCurrent
                                      ? 'oklch(0.84 0.16 var(--accent-h) / 0.35)'
                                      : 'var(--surface)',
                                  border: isCurrent && !watched ? '1px solid var(--accent)' : '1px solid transparent',
                                  boxShadow: isCurrent ? '0 0 8px var(--accent-glow)' : 'none',
                                }}
                                title={`S${season.num}E${ep.num} — ${ep.title}`}
                                onClick={() => toggleEp(season.num, ep.num)}
                              />
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center gap-4 mt-4 text-[11px] font-mono text-[var(--text-3)]">
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:'var(--accent)'}}></span> Watched</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:'var(--surface)', border:'1px solid var(--accent)'}}></span> Current</span>
                    <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm" style={{background:'var(--surface)'}}></span> Unwatched</span>
                  </div>

                  {/* Quick actions */}
                  <div className="flex flex-wrap gap-2 mt-5 pt-4 border-t border-[var(--border)]">
                    <button className="flex items-center gap-1.5 px-3 h-8 rounded-full btn-ghost text-[12px] font-mono"
                            onClick={() => toggleEp(USER_PROGRESS.currentSeason, USER_PROGRESS.currentEpisode)}>
                      {Icons.check} Mark S{USER_PROGRESS.currentSeason}E{USER_PROGRESS.currentEpisode} as watched
                    </button>
                    <button className="flex items-center gap-1.5 px-3 h-8 rounded-full text-[12px] font-mono"
                            style={{color:'var(--accent)'}}>
                      Next: S{USER_PROGRESS.currentSeason}E{USER_PROGRESS.currentEpisode + 1} {Icons.arrow}
                    </button>
                  </div>
                </div>
              </section>
            ) : (
              <section className="mb-8">
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-6 text-center">
                  <div className="text-[var(--text-3)] mb-3">{Icons.lock}</div>
                  <div className="text-[14px] text-[var(--text-2)] mb-3">Log in to track where you're up to</div>
                  <button className="px-4 h-9 rounded-full btn-primary text-[12px]" onClick={() => setAuth('loggedIn')}>
                    Log in to track progress
                  </button>
                </div>
              </section>
            )}

            {/* --- Seasons & Episodes --- */}
            <section className="mb-8">
              <div className="label mb-3">Seasons & episodes</div>
              <div className="rounded-2xl border border-[var(--border)] overflow-hidden">
                {SEASONS_DATA.map((season, si) => {
                  const expanded = expandedSeasons[season.num];
                  const seasonWatched = season.episodes.every(e => watchedEps[`${season.num}-${e.num}`]);
                  const inProgress = season.episodes.some(e => watchedEps[`${season.num}-${e.num}`]) && !seasonWatched;
                  const epWatchedCount = season.episodes.filter(e => watchedEps[`${season.num}-${e.num}`]).length;

                  return (
                    <div key={season.num} className={si > 0 ? 'border-t border-[var(--border)]' : ''}>
                      {/* Season header */}
                      <button
                        className="w-full flex items-center gap-3 px-5 py-4 text-left hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                        onClick={() => toggleSeason(season.num)}
                      >
                        <span className="transition-transform" style={{transform: expanded ? 'rotate(90deg)' : 'none'}}>
                          {Icons.chevRight}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-medium">Season {season.num}</span>
                            <span className="text-[12px] font-mono text-[var(--text-3)]">{season.episodes.length} episodes · {season.year}</span>
                            {season.airing && Icons.live}
                          </div>
                        </div>
                        <div className="text-[12px] font-mono shrink-0">
                          {seasonWatched && <span style={{color:'#1ce783'}}>Watched ✓</span>}
                          {inProgress && <span className="text-[var(--text-2)]">In progress ({epWatchedCount}/8)</span>}
                        </div>
                      </button>

                      {/* Episodes (expanded) */}
                      {expanded && (
                        <div className="bg-[var(--bg)]">
                          {season.episodes.map(ep => {
                            const key = `${season.num}-${ep.num}`;
                            const watched = watchedEps[key];
                            const isCurrent = season.num === USER_PROGRESS.currentSeason && ep.num === USER_PROGRESS.currentEpisode && loggedIn;

                            return (
                              <div key={key}
                                className="flex items-center gap-3 px-5 py-3 border-t border-[var(--border)] hover:bg-[rgba(255,255,255,0.02)] transition-colors"
                                style={isCurrent ? {background: 'oklch(0.84 0.16 var(--accent-h) / 0.06)'} : {}}
                              >
                                {/* Checkbox or lock */}
                                {loggedIn ? (
                                  <button
                                    className="w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors"
                                    style={{
                                      background: watched ? 'var(--accent)' : 'transparent',
                                      border: watched ? 'none' : '1.5px solid var(--border-2)',
                                      color: watched ? '#0a0a0c' : 'transparent',
                                    }}
                                    onClick={() => toggleEp(season.num, ep.num)}
                                  >
                                    {watched && Icons.check}
                                  </button>
                                ) : (
                                  <span className="w-6 h-6 flex items-center justify-center shrink-0 text-[var(--text-3)]">
                                    {Icons.lock}
                                  </span>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-[var(--text-3)] w-6 shrink-0">E{ep.num}</span>
                                    <span className={`text-[13px] truncate ${watched ? 'text-[var(--text-3)]' : ''}`}>{ep.title}</span>
                                    {isCurrent && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded" style={{background:'var(--accent)', color:'#0a0a0c'}}>NOW</span>}
                                  </div>
                                </div>

                                <div className="text-[11px] font-mono text-[var(--text-3)] shrink-0">{ep.date}</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>

            {/* --- About --- */}
            <section className="mb-8">
              <div className="label mb-3">About</div>
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--bg-2)] p-5 md:p-6">
                <p className="text-[14px] leading-relaxed text-[var(--text-2)]" style={{textWrap:'pretty'}}>
                  {SHOW.overview}
                </p>
                <div className="flex flex-wrap gap-2 mt-4">
                  {SHOW.genres.map(g => (
                    <span key={g} className="chip">{g}</span>
                  ))}
                  <span className="chip">{SHOW.status}</span>
                </div>
              </div>
            </section>

            {/* --- More like this --- */}
            <section className="mb-8">
              <div className="label mb-3">More like this</div>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 md:gap-4">
                {SIMILAR_SHOWS.map(s => (
                  <div key={s.title} className="group cursor-pointer">
                    <div className="poster">
                      <img src={posterURL(s.title, s.bg, s.fg)} alt={s.title} />
                    </div>
                    <div className="mt-2 px-0.5">
                      <div className="text-[12px] font-medium truncate">{s.title}</div>
                      <div className="text-[10px] font-mono text-[var(--text-3)]">{s.year} · <span style={{color: s.color}}>{s.service}</span></div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   TALLY INSIGHT CARD
   ============================================================ */
function TallyInsight({ loggedIn, setAuth }) {
  if (loggedIn) {
    return (
      <section className="mb-8">
        <div className="label mb-3" style={{color:'var(--accent)'}}>Tally insight</div>
        <div className="rounded-2xl overflow-hidden relative"
             style={{
               background: `radial-gradient(80% 120% at 100% 0%, oklch(0.84 0.16 var(--accent-h) / 0.15), transparent 60%),
                            linear-gradient(180deg, #15151a, #101013)`,
               border: '1px solid var(--border)',
             }}>
          {/* Glow */}
          <div className="absolute -top-16 -right-16 w-[280px] h-[280px] rounded-full pointer-events-none"
               style={{background: 'radial-gradient(closest-side, var(--accent-glow), transparent 70%)'}}></div>

          <div className="relative p-6 md:p-8">
            <div className="flex items-start gap-4">
              {/* Pause icon */}
              <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                   style={{background:'oklch(0.84 0.16 var(--accent-h) / 0.15)', color:'var(--accent)'}}>
                {Icons.pause}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-[24px] md:text-[30px] leading-[1.1] tracking-[-0.02em]">
                  11-week gap starting August 2
                </div>
                <p className="text-[13px] text-[var(--text-2)] mt-2 leading-relaxed">
                  No new Invincible episodes between seasons. Safe to pause Prime Video.
                </p>
              </div>
            </div>

            {/* Saving highlight */}
            <div className="mt-6 flex flex-wrap items-end gap-6 md:gap-10">
              <div>
                <div className="text-[11px] font-mono text-[var(--text-3)] uppercase tracking-widest mb-1">You save</div>
                <div className="font-serif text-[44px] md:text-[56px] leading-none tracking-[-0.02em]" style={{color:'var(--accent)'}}>
                  $98.89
                </div>
                <div className="text-[11px] font-mono text-[var(--text-3)] mt-1">if you pause Aug 2 → Oct 14</div>
              </div>
              <div className="flex-1"></div>

              {/* Timeline mini-bar */}
              <div className="hidden sm:block">
                <div className="text-[10px] font-mono text-[var(--text-3)] mb-1.5 flex justify-between" style={{width:180}}>
                  <span>Jun</span><span>Aug</span><span>Oct</span><span>Dec</span>
                </div>
                <div className="flex gap-[2px]" style={{width:180}}>
                  {Array.from({length:12}).map((_,i) => (
                    <div key={i} className="flex-1 h-5 rounded-sm" style={{
                      background: (i >= 1 && i <= 3)
                        ? 'var(--accent)'
                        : (i >= 7 && i <= 9)
                          ? 'oklch(0.84 0.16 var(--accent-h) / 0.5)'
                          : 'var(--surface)',
                    }}></div>
                  ))}
                </div>
                <div className="text-[9px] font-mono text-[var(--text-3)] mt-1 flex gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:'var(--accent)'}}></span>Airing</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:'oklch(0.84 0.16 var(--accent-h) / 0.5)'}}></span>Safe to pause</span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap gap-3 mt-6 pt-5 border-t border-[var(--border)]">
              <button className="btn-primary px-5 h-11 rounded-full text-[13px] inline-flex items-center gap-2">
                {Icons.bell} Set pause reminder
              </button>
              <button className="btn-ghost px-4 h-11 rounded-full text-[13px] inline-flex items-center gap-2">
                Add to pause schedule {Icons.arrow}
              </button>
            </div>
          </div>
        </div>
      </section>
    );
  }

  // Logged-out: frosted/blurred teaser
  return (
    <section className="mb-8">
      <div className="label mb-3">Tally insight</div>
      <div className="rounded-2xl overflow-hidden relative border border-[var(--border)]"
           style={{background:'var(--bg-2)'}}>
        {/* Blurred content behind */}
        <div className="p-6 md:p-8" style={{filter:'blur(6px)', opacity: 0.5, pointerEvents:'none', userSelect:'none'}}>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[var(--surface)]"></div>
            <div>
              <div className="font-serif text-[24px] leading-[1.1]">11-week gap starting August</div>
              <div className="text-[13px] text-[var(--text-3)] mt-2">No new episodes between seasons. Safe to pause.</div>
            </div>
          </div>
          <div className="mt-6">
            <div className="font-serif text-[48px]" style={{color:'var(--accent)'}}>$98</div>
          </div>
        </div>

        {/* Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center"
             style={{background:'rgba(10,10,12,0.55)', backdropFilter:'blur(2px)'}}>
          <div className="text-[14px] text-[var(--text)] mb-1 font-medium text-center px-4">
            There's a saving opportunity on Prime Video
          </div>
          <div className="text-[12px] text-[var(--text-3)] font-mono mb-4 text-center px-4">
            Log in to see your pause windows and savings
          </div>
          <button className="btn-primary px-5 h-10 rounded-full text-[13px] inline-flex items-center gap-2"
                  onClick={() => setAuth('loggedIn')}>
            Log in to unlock {Icons.arrow}
          </button>
        </div>
      </div>
    </section>
  );
}

/* ============================================================
   TWEAKS PANEL
   ============================================================ */
function TweaksPanel() {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const handler = (e) => {
      if (e.data?.type === '__activate_edit_mode') setVisible(true);
      if (e.data?.type === '__deactivate_edit_mode') setVisible(false);
    };
    window.addEventListener('message', handler);
    window.parent.postMessage({ type: '__edit_mode_available' }, '*');
    return () => window.removeEventListener('message', handler);
  }, []);

  const update = (key, val) => {
    SHOW_TWEAKS[key] = val;
    window.parent.postMessage({ type: '__edit_mode_set_keys', edits: { [key]: val } }, '*');
    window.dispatchEvent(new Event('tweaks-updated'));
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 tweak-panel rounded-2xl p-4 w-[240px] shadow-2xl"
         style={{fontSize:13}}>
      <div className="font-mono text-[11px] text-[var(--text-3)] uppercase tracking-widest mb-3">Tweaks</div>

      <div className="space-y-3">
        <div>
          <div className="text-[11px] text-[var(--text-3)] mb-1">Auth state</div>
          <div className="flex gap-1">
            {['loggedIn','loggedOut'].map(v => (
              <button key={v}
                className="flex-1 px-2 py-1.5 rounded-md text-[11px] font-mono transition-colors"
                style={{
                  background: SHOW_TWEAKS.authState === v ? 'var(--accent)' : 'var(--surface)',
                  color: SHOW_TWEAKS.authState === v ? '#0a0a0c' : 'var(--text-2)',
                }}
                onClick={() => update('authState', v)}
              >{v === 'loggedIn' ? 'Signed in' : 'Guest'}</button>
            ))}
          </div>
        </div>

        <div>
          <div className="text-[11px] text-[var(--text-3)] mb-1">Accent hue · {SHOW_TWEAKS.accentHue}°</div>
          <input type="range" min="0" max="360" step="5" value={SHOW_TWEAKS.accentHue}
            className="w-full accent-[var(--accent)]"
            onChange={e => {
              const v = Number(e.target.value);
              document.documentElement.style.setProperty('--accent-h', v);
              update('accentHue', v);
            }}
          />
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   MOUNT
   ============================================================ */
function App() {
  return (
    <>
      <ShowDetailApp />
      <TweaksPanel />
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);

Object.assign(window, { ShowDetailApp, TallyInsight, TweaksPanel, App });
