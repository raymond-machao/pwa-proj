// Shared vocabulary for every preview style.
//
// Retained UI formats:
// 1. Classic (🍁 經典時間軸 / 原版)
// 2. Schedule (⏱ 緊湊時刻表 / Timetable Rail)
// 3. Ticket (🎫 票根登機證 / Ticket Stub)
// 4. Trip Hub (🎛 旅程儀表板 / Trip Hub)
// 5. Traveler's Booklet (📖 日式旅行手帳 / Traveler's Booklet)

export const STYLE_ROOT_CLASS = theme => theme;

// Category colours coordinated with each UI format's aesthetic
const CLASSIC_PALETTE = ["#b54a14", "#d97706", "#2563eb", "#7c3aed", "#059669", "#dc2626", "#ea580c", "#475569"];
const SCHEDULE_PALETTE = ["#0f172a", "#0284c7", "#2563eb", "#0d9488", "#b45309", "#dc2626", "#475569", "#1e293b"];
const TICKET_PALETTE = ["#0284c7", "#0f172a", "#2563eb", "#059669", "#d97706", "#dc2626", "#475569", "#334155"];
const HUB_PALETTE = ["#2563eb", "#0f172a", "#059669", "#d97706", "#7c3aed", "#dc2626", "#ea580c", "#475569"];
const BOOKLET_PALETTE = ["#b91c1c", "#2c241d", "#d97706", "#059669", "#475569", "#dc2626", "#ea580c", "#78350f"];
const RAIL_PALETTE = ["#0284c7", "#09090b", "#059669", "#d97706", "#7c3aed", "#dc2626", "#ea580c", "#71717a"];
const STORY_PALETTE = ["#c2410c", "#1c1917", "#059669", "#d97706", "#7c3aed", "#dc2626", "#ea580c", "#78716c"];

export function previewExpensePalette(theme) {
  if (theme === "schedule") return SCHEDULE_PALETTE;
  if (theme === "ticket") return TICKET_PALETTE;
  if (theme === "hub") return HUB_PALETTE;
  if (theme === "booklet") return BOOKLET_PALETTE;
  if (theme === "rail") return RAIL_PALETTE;
  if (theme === "story") return STORY_PALETTE;
  return CLASSIC_PALETTE;
}

// --- The UI Formats ---------------------------------------------------------

const CLASSIC = `
.classic .feature-nav{border-top:1px solid #ead8c9}
.classic .hero-meta{margin:0 0 4px}
.classic .hero-subline{display:inline;margin:0;color:#7b6754;font-size:12.5px}
.classic .hero-note{display:inline;margin:0;color:#7b6754;font-size:12.5px}
.classic .hero-note:not(:empty):before{content:" · "}
.classic .timeline-step{position:relative;display:flex;flex-direction:column}
.classic .flight-middle{position:relative!important;z-index:2!important}
.classic .flight-middle::before{display:none!important}
.classic .timeline-step:last-child:has(.flight-stop)::before{content:""!important;position:absolute!important;left:12px!important;top:12px!important;bottom:16px!important;width:2px!important;background:#e5bc98!important;z-index:1!important}
`;

// 1b. Compact Base Generator
function buildCompactThemeCss(themeId, legCss, customTabNavCss = "") {
  const tabNavCss = customTabNavCss || `
.${themeId} .subnav-itinerary .day-tab{display:inline-flex!important;align-items:center!important;justify-content:center!important;padding:4px 9px!important;border-radius:999px!important;min-width:auto!important;height:24px!important}
.${themeId} .subnav-itinerary .day-tab-num{display:none!important}
.${themeId} .subnav-itinerary .day-tab > .day-tab-num:only-child{display:inline-block!important}
.${themeId} .subnav-itinerary .day-tab-date{display:inline-block!important;font-size:11.5px!important;font-weight:700!important;color:inherit!important;opacity:1!important;line-height:1!important}
`;
  return `
.${themeId} body{background:#faf6f0}
.${themeId} .hero{padding:12px 6px 10px;background:#faf6f0;border-bottom:1px solid #e6d4c2}
.${themeId} .hero h1{font-size:26px;font-weight:850;letter-spacing:-.02em;line-height:1.22;margin:0 0 5px;color:#231912}
.${themeId} .hero-meta{margin:0 0 8px}
.${themeId} .hero-subline{font-size:13.5px;color:#6e5847;font-weight:600;margin:0 0 3px;line-height:1.35}
.${themeId} .hero-dest-sep{color:#d1b8a1;margin:0 4px}
.${themeId} .hero-dest{color:#6e5847;font-weight:600}
.${themeId} .hero-note{font-size:13px;color:#876e5a;margin:0 0 5px;line-height:1.4;overflow-wrap:anywhere}
${tabNavCss}
.${themeId} .feature-nav{border-top:1px solid #ead8c9}
.${themeId} .feature-nav .nav-btn-tab{color:#7b6754}
.${themeId} .feature-nav .nav-btn-tab.active{color:#b54a14}
.${themeId} .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.${themeId} .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.${themeId} .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.${themeId} .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-icon{height:20px;margin-bottom:2px}
.${themeId} .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1}
.${themeId} .feature-nav .nav-btn-itinerary.active{color:#b54a14}
.${themeId} .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:750}
.${themeId} .feature-nav .nav-btn-itinerary:not(.active){color:#7b6754}
.${themeId} .feature-page[id^="itinerary-"] .day-head{display:none!important}
.${themeId} .feature-page[id^="itinerary-"] .day{margin-top:8px;padding:12px 14px 14px}
.${themeId} .trip-map-canvas{aspect-ratio:auto;height:145px!important;max-height:145px!important}
.${themeId} .trip-map-shell{margin:6px -2px 10px;padding:4px 2px 6px}
.${themeId} .leg .leg-icon,.${themeId} .flight-middle .leg-icon{display:inline-block!important;margin-right:3px}
${legCss}
`;
}

// Tab navigation bar (Connected Folder Tabs)
const TAB_NAV_CSS = `
.tab .hero, .timeline .hero, .default .hero{padding:12px 6px 0!important;border-bottom:2px solid #dec5ae!important}
.tab .subnav-itinerary, .timeline .subnav-itinerary, .default .subnav-itinerary{padding:4px 2px 0!important;margin-bottom:0!important;gap:4px!important;align-items:flex-end!important}
.tab .subnav-itinerary .day-tab, .timeline .subnav-itinerary .day-tab, .default .subnav-itinerary .day-tab{display:inline-flex!important;flex-direction:column!important;align-items:center!important;justify-content:center!important;padding:3px 8px 3px!important;border-radius:7px 7px 0 0!important;border:1.5px solid #dec5ae!important;border-bottom:2px solid #dec5ae!important;margin-bottom:-2px!important;background:#f3eae0!important;color:#7b6754!important;height:32px!important;min-width:44px!important;box-sizing:border-box!important;transition:all .12s ease}
.tab .subnav-itinerary .day-tab-num, .timeline .subnav-itinerary .day-tab-num, .default .subnav-itinerary .day-tab-num{display:block!important;font-size:11.5px!important;font-weight:700!important;line-height:1.15!important;color:inherit!important}
.tab .subnav-itinerary .day-tab-date, .timeline .subnav-itinerary .day-tab-date, .default .subnav-itinerary .day-tab-date{display:block!important;font-size:9.5px!important;font-weight:600!important;line-height:1.1!important;color:#8c7662!important;opacity:1!important}
.tab .subnav-itinerary .day-tab > .day-tab-num:only-child, .timeline .subnav-itinerary .day-tab > .day-tab-num:only-child, .default .subnav-itinerary .day-tab > .day-tab-num:only-child{display:inline-block!important;font-size:12px!important}
.tab .subnav-itinerary .day-tab.active, .timeline .subnav-itinerary .day-tab.active, .default .subnav-itinerary .day-tab.active{background:#b54a14!important;border-color:#b54a14!important;border-bottom:2px solid #b54a14!important;color:#fff!important;height:32px!important;box-shadow:0 -2px 6px rgba(181,74,20,.18)!important;position:relative!important;z-index:2!important}
.tab .subnav-itinerary .day-tab.active .day-tab-date, .timeline .subnav-itinerary .day-tab.active .day-tab-date, .default .subnav-itinerary .day-tab.active .day-tab-date{color:#fce4ce!important}
.tab .subnav-itinerary .day-tab:not(.active):hover, .timeline .subnav-itinerary .day-tab:not(.active):hover, .default .subnav-itinerary .day-tab:not(.active):hover{background:#ede0d2!important}
`;

// 1b. Compact Tabs (📑 簡約頁籤 / Connected Folder Tabs)
const COMPACT_LEG_CSS = `
.compact .timeline-step, .tab .timeline-step{position:relative;display:flex;flex-direction:column}
.compact .leg, .tab .leg,
.compact .flight-middle, .tab .flight-middle{
  display:inline-flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  row-gap:2px!important;
  column-gap:4px!important;
  margin:17px 0 17px 34px!important;
  padding:3px 10px!important;
  background:#f6eee5!important;
  border:1px solid #e5d3c2!important;
  border-radius:14px!important;
  max-width:calc(100% - 40px)!important;
  box-sizing:border-box!important;
  box-shadow:0 1px 2px rgba(60,30,10,.05)!important;
  font-size:11.5px!important;
  position:relative!important;
  z-index:2!important;
}
.compact .flight-middle::before, .tab .flight-middle::before{display:none!important}
.compact .leg a.leg-mode, .tab .leg a.leg-mode,
.compact .flight-middle a, .tab .flight-middle a{font-weight:700!important;color:#b54a14!important;text-decoration:none!important}
.compact .leg span.leg-mode, .tab .leg span.leg-mode,
.compact .flight-middle, .tab .flight-middle{font-weight:700!important;color:#8a6042!important;text-decoration:none!important}
.compact .leg .leg-rest, .tab .leg .leg-rest,
.compact .flight-middle .flight-duration, .tab .flight-middle .flight-duration{color:#7a614e!important;font-weight:500!important}
.compact .leg:hover, .tab .leg:hover,
.compact .flight-middle:hover, .tab .flight-middle:hover{background:#ede0d2!important}

.compact .timeline-step:not(:last-child)::before, .tab .timeline-step:not(:last-child)::before{
  content:""!important;
  position:absolute!important;
  left:12px!important;
  top:12px!important;
  bottom:-16px!important;
  width:2px!important;
  background:#e5bc98!important;
  z-index:1!important;
}
.compact .timeline-step:last-child:has(.flight-stop)::before, .tab .timeline-step:last-child:has(.flight-stop)::before{
  content:""!important;
  position:absolute!important;
  left:12px!important;
  top:12px!important;
  bottom:16px!important;
  width:2px!important;
  background:#e5bc98!important;
  z-index:1!important;
}
.compact .timeline-step .stop, .tab .timeline-step .stop{padding:0!important;align-items:start!important}
.compact .timeline-step .stop .marker, .tab .timeline-step .stop .marker{position:relative!important;z-index:2!important}
.compact .timeline-step .detail, .tab .timeline-step .detail{margin-top:3px!important}
.compact .timeline-step .detail p, .tab .timeline-step .detail p{margin:0 0 3px 0!important}
.compact .timeline-step .detail p:last-child, .tab .timeline-step .detail p:last-child{margin-bottom:0!important}
.compact .flight-stop, .tab .flight-stop{padding-top:0!important;position:relative!important;z-index:2!important}
.compact .flight-line, .tab .flight-line{padding:0!important;align-items:center!important}
.compact .flight-number, .tab .flight-number{position:relative!important;z-index:2!important}
`;

const TAB = buildCompactThemeCss("tab", COMPACT_LEG_CSS, TAB_NAV_CSS);

// 1c. Timeline Tab (⏱ 雙欄時刻頁籤 / Two-Column Timeline Tab)
const TIMELINE_LEG_CSS = `
.timeline .timeline-step{position:relative;display:flex;flex-direction:column}
.timeline .leg, .timeline .flight-middle{
  display:inline-flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  row-gap:2px!important;
  column-gap:4px!important;
  margin:17px 0 17px 42px;
  padding:3px 10px;
  background:#f6eee5;
  border:1px solid #e5d3c2;
  border-radius:14px;
  width:fit-content!important;
  max-width:calc(100% - 48px);
  box-sizing:border-box;
  box-shadow:0 1px 2px rgba(60,30,10,.05);
  font-size:11.5px;
  position:relative;
  z-index:2;
}
.timeline .flight-middle::before{display:none}
.timeline .leg a.leg-mode, .timeline .flight-middle a{font-weight:700;color:#b54a14;text-decoration:none}
.timeline .leg span.leg-mode, .timeline .flight-middle{font-weight:700;color:#8a6042;text-decoration:none}
.timeline .leg .leg-rest, .timeline .flight-middle .flight-duration{color:#7a614e;font-weight:500}
.timeline .leg:hover, .timeline .flight-middle:hover{background:#ede0d2}

.timeline .timeline-step:not(:last-child)::before{
  content:"";
  position:absolute;
  left:53px;
  top:12px;
  bottom:-16px;
  width:2px;
  background:#e5bc98;
  z-index:1;
}

.timeline .timeline-step:last-child:has(.flight-stop)::before{
  content:"";
  position:absolute;
  left:53px;
  top:12px;
  bottom:16px;
  width:2px;
  background:#e5bc98;
  z-index:1;
}
`;

const TIMELINE_STOP_CSS = `
.timeline .itinerary-card-scroll{padding:12px 14px 16px 8px}
.timeline .timeline-step .stop{display:grid;grid-template-columns:36px 24px 1fr;column-gap:6px;row-gap:2px;padding:0;align-items:center}
.timeline .timeline-step .stop-main,.timeline .timeline-step .stop-top{display:contents}
.timeline .timeline-step .stop .marker{grid-column:2;grid-row:1;width:24px;height:24px;border-radius:50%;background:#fce4ce;color:#b54a14;display:grid;place-items:center;font-size:11.5px;font-weight:700;align-self:center;margin:0;position:relative;z-index:2}
.timeline .timeline-step .stop time{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;align-self:center;line-height:1.15;font-size:12.5px;font-weight:750;color:#746354;font-variant-numeric:tabular-nums;white-space:normal;text-align:right}
.timeline .timeline-step .stop time:not(:has(.time-end)){font-size:12.5px;font-weight:750;color:#746354}
.timeline .timeline-step .stop time .time-sep{display:none}
.timeline .timeline-step .stop time .time-start{display:block;font-size:12.5px;font-weight:750;color:#746354}
.timeline .timeline-step .stop time .time-end{display:block;font-size:10.5px;font-weight:600;color:#9c8470}
.timeline .timeline-step .place-title-wrap{grid-column:3;grid-row:1;align-self:center}
.timeline .timeline-step .detail{grid-column:3;grid-row:2;margin-top:3px}
.timeline .timeline-step .detail p{margin:0 0 3px 0;line-height:1.35}
.timeline .timeline-step .detail p:last-child{margin-bottom:0}

/* Flight stop layout */
.timeline .flight-stop{padding-top:0;position:relative;z-index:2}
.timeline .flight-line{display:grid;grid-template-columns:36px 24px 1fr;column-gap:6px;align-items:center;padding:0}
.timeline .flight-airport{display:contents}
.timeline .flight-airport time{grid-column:1;grid-row:1;display:block;font-size:12.5px;font-weight:750;color:#746354;font-variant-numeric:tabular-nums;text-align:right;align-self:center}
.timeline .flight-number{grid-column:2;grid-row:1;width:24px;height:24px;border-radius:50%;background:#fce4ce;color:#b54a14;display:grid;place-items:center;font-size:11.5px;font-weight:700;align-self:center;margin:0;position:relative;z-index:2}
.timeline .flight-airport span{grid-column:3;grid-row:1;font-size:14.5px;font-weight:600;align-self:center}
.timeline .flight-detail{margin:8px 0 6px 66px}
`;

const TIMELINE = buildCompactThemeCss("timeline", TIMELINE_LEG_CSS, TAB_NAV_CSS) + "\n" + TIMELINE_STOP_CSS;

// 1d. Default (⏱ 雙欄時刻標準重構版 / Two-Column Timeline Standard Clean)
const DEFAULT_LEG_CSS = `
.default .timeline-step{position:relative;display:flex;flex-direction:column}
.default .leg, .default .flight-middle{
  display:inline-flex!important;
  flex-wrap:wrap!important;
  align-items:center!important;
  row-gap:2px!important;
  column-gap:4px!important;
  margin:17px 0 17px 42px;
  padding:3px 10px;
  background:#f6eee5;
  border:1px solid #e5d3c2;
  border-radius:14px;
  width:fit-content!important;
  max-width:calc(100% - 48px);
  box-sizing:border-box;
  box-shadow:0 1px 2px rgba(60,30,10,.05);
  font-size:11.5px;
  position:relative;
  z-index:2;
}
.default .flight-middle::before{display:none}
.default .leg a.leg-mode, .default .flight-middle a{font-weight:700;color:#b54a14;text-decoration:none}
.default .leg span.leg-mode, .default .flight-middle{font-weight:700;color:#8a6042;text-decoration:none}
.default .leg .leg-rest, .default .flight-middle .flight-duration{color:#7a614e;font-weight:500}
.default .leg:hover, .default .flight-middle:hover{background:#ede0d2}

/* Continuous vertical line on z-index: 1 (capsules with z-index: 2 sit cleanly on top) */
.default .timeline-step:not(:last-child)::before{
  content:"";
  position:absolute;
  left:53px;
  top:12px;
  bottom:-16px;
  width:2px;
  background:#e5bc98;
  z-index:1;
}

/* For last step containing a flight: connect departure to arrival airport behind the flight capsule */
.default .timeline-step:last-child:has(.flight-stop)::before{
  content:"";
  position:absolute;
  left:53px;
  top:12px;
  bottom:16px;
  width:2px;
  background:#e5bc98;
  z-index:1;
}
`;

const DEFAULT_STOP_CSS = `
.default .itinerary-card-scroll{padding:12px 14px 16px 8px}
.default .timeline-step .stop{display:grid;grid-template-columns:36px 24px 1fr;column-gap:6px;row-gap:2px;padding:0;align-items:center}
.default .timeline-step .stop-main,.default .timeline-step .stop-top{display:contents}
.default .timeline-step .stop .marker{grid-column:2;grid-row:1;width:24px;height:24px;border-radius:50%;background:#fce4ce;color:#b54a14;display:grid;place-items:center;font-size:11.5px;font-weight:700;align-self:center;margin:0;position:relative;z-index:2}
.default .timeline-step .stop time{grid-column:1;grid-row:1;display:flex;flex-direction:column;align-items:flex-end;justify-content:center;align-self:center;line-height:1.15;font-size:12.5px;font-weight:750;color:#746354;font-variant-numeric:tabular-nums;white-space:normal;text-align:right}
.default .timeline-step .stop time:not(:has(.time-end)){font-size:12.5px;font-weight:750;color:#746354}
.default .timeline-step .stop time .time-sep{display:none}
.default .timeline-step .stop time .time-start{display:block;font-size:12.5px;font-weight:750;color:#746354}
.default .timeline-step .stop time .time-end{display:block;font-size:10.5px;font-weight:600;color:#9c8470}
.default .timeline-step .place-title-wrap{grid-column:3;grid-row:1;align-self:center}
.default .timeline-step .detail{grid-column:3;grid-row:2;margin-top:3px}
.default .timeline-step .detail p{margin:0 0 3px 0;line-height:1.35}
.default .timeline-step .detail p:last-child{margin-bottom:0}

/* Flight stop layout */
.default .flight-stop{padding-top:0;position:relative;z-index:2}
.default .flight-line{display:grid;grid-template-columns:36px 24px 1fr;column-gap:6px;align-items:center;padding:0}
.default .flight-airport{display:contents}
.default .flight-airport time{grid-column:1;grid-row:1;display:block;font-size:12.5px;font-weight:750;color:#746354;font-variant-numeric:tabular-nums;text-align:right;align-self:center}
.default .flight-number{grid-column:2;grid-row:1;width:24px;height:24px;border-radius:50%;background:#fce4ce;color:#b54a14;display:grid;place-items:center;font-size:11.5px;font-weight:700;align-self:center;margin:0;position:relative;z-index:2}
.default .flight-airport span{grid-column:3;grid-row:1;font-size:14.5px;font-weight:600;align-self:center}
.default .flight-detail{margin:8px 0 6px 66px}
`;

const DEFAULT = buildCompactThemeCss("default", DEFAULT_LEG_CSS, TAB_NAV_CSS) + "\n" + DEFAULT_STOP_CSS;

// Retired format fallbacks
const COMPACT = TAB;
const DASH = TAB;
const STRIPE = TAB;

// 2. Schedule (⏱ 緊湊時刻表 / Timetable Rail)
const SCHEDULE = `
:root{--ink:#0f172a;--ink-dim:#64748b;--accent:#0f172a;--accent-soft:#f1f5f9;--link:#0284c7;--on-accent:#fff;--rule-strong:#0f172a;--chip-bg:#fff;--chip-rule:#e2e8f0;--hero-bg:#fff;--tab-radius:8px;--tab-h:44px;--marker-radius:50%;--map-radius:12px;--sheet-bg:#fff;--sheet-raised:#fff;--sheet-sunken:#f8fafc;--sheet-rule:#e2e8f0}
.schedule body{background:#f8fafc;color:var(--ink)}
.schedule .hero{background:var(--hero-bg);border-bottom:2px solid #0f172a;padding:12px 16px 10px}
.schedule .hero h1{font-size:22px;font-weight:800;letter-spacing:-.02em}
.schedule .hero p{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.schedule .day{margin-top:14px;padding:16px;border:1px solid #e2e8f0;border-radius:12px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.schedule .day-head{border-bottom:2px solid #0f172a;padding-bottom:8px;margin-bottom:12px}
.schedule .day-head span{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink-dim);font-weight:700}
.schedule .day h2{font-size:18px;font-weight:800;margin-top:2px}
.schedule .timeline-step{position:relative;display:flex;flex-direction:column}
.schedule .timeline-step:not(:last-child)::before{left:10px;top:11px;bottom:-10px;width:2px;background:#94a3b8;z-index:1}
.schedule .timeline-step:last-child:has(.flight-stop)::before{content:""!important;position:absolute!important;left:10px!important;top:11px!important;bottom:14px!important;width:2px!important;background:#94a3b8!important;z-index:1!important}
.schedule .stop{grid-template-columns:22px 1fr;gap:12px;padding:7px 0;border-bottom:1px solid #f1f5f9;align-items:start}
.schedule .stop:last-child{border-bottom:0}
.schedule .marker,.schedule .flight-number{border-radius:50%;width:22px;height:22px;background:#0f172a;color:#fff;font-size:11px;font-weight:700;position:relative;z-index:2}
.schedule .flight-stop{position:relative;z-index:2}
.schedule .flight-line{grid-template-columns:22px 1fr;gap:12px;align-items:center}
.schedule .flight-middle::before{display:none!important}
.schedule .flight-middle{padding-left:34px;color:#0f172a;font-weight:600;font-size:11.5px;position:relative!important;z-index:2!important}
.schedule .flight-middle span,.schedule .flight-middle .flight-duration{color:var(--ink-dim)}
.schedule .stop h3{font-size:15px;font-weight:700;letter-spacing:-.01em}
.schedule .stop time{font-size:13px;font-weight:700;color:#0f172a;font-variant-numeric:tabular-nums}
.schedule .detail,.schedule .note-body{font-size:12.5px;color:var(--ink-dim)}
.schedule .route,.schedule .detail a{color:var(--link);font-weight:600}
.schedule .leg{margin:8px 0 8px 34px;padding:3px 8px;background:#f1f5f9;border-radius:6px;font-size:11.5px;font-weight:600;color:#475569;display:inline-flex;align-items:center;gap:6px;position:relative!important;z-index:2!important}
.schedule .leg-mode{color:#0f172a;font-weight:700}
.schedule .day-tab{border-radius:8px;border:1px solid #e2e8f0;background:#fff;color:var(--ink-dim)}
.schedule .day-tab.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.schedule .trip-map-shell{border-radius:12px;border:1px solid #e2e8f0;background:#fff;padding:6px;margin:10px 0 14px}
.schedule .trip-map-canvas{border-radius:8px;border:1px solid #e2e8f0}
.schedule .map-scope-switch,.schedule .trip-map-tab,.schedule .trip-map-overview{border-radius:6px;border-color:#e2e8f0;background:#fff;color:var(--ink-dim)}
.schedule .map-scope-switch button.active,.schedule .trip-map-tab.active,.schedule .trip-map-overview.active{background:#0f172a;color:#fff;border-color:#0f172a}
.schedule .count-badge{border-radius:6px;background:#f1f5f9;color:#0f172a;border-color:#e2e8f0;font-variant-numeric:tabular-nums;font-weight:700}
.schedule .day-action{background:#f1f5f9;border-color:#e2e8f0;color:#0f172a;border-radius:8px}
.schedule .feature-nav{background:#fff;border-top:1px solid #e2e8f0}
.schedule .feature-nav .nav-btn-tab{color:#64748b}
.schedule .feature-nav .nav-btn-tab.active{color:#0f172a}
.schedule .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.schedule .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.schedule .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.schedule .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1}
.schedule .feature-nav .nav-btn-itinerary.active{color:#0f172a}
.schedule .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:750}
.schedule .feature-nav .nav-btn-itinerary:not(.active){color:#64748b}
.schedule .fab-expense{background:rgba(255,255,255,0.45)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(15,23,42,0.22)!important;color:#0f172a!important;box-shadow:0 3px 10px rgba(0,0,0,0.08)!important;border-radius:50%!important;opacity:0.65;transition:opacity .2s ease,background .2s ease,transform .15s ease}
.schedule .fab-expense:hover,.schedule .fab-expense:active{opacity:1;background:rgba(15,23,42,0.88)!important;color:#fff!important}
.schedule .expense-page-head h2{color:#0f172a;font-weight:800}
.schedule .tcard{border-radius:8px;border:1px solid #e2e8f0;background:#fff;padding:10px 12px}
.schedule .tcard b{color:#0f172a;font-weight:800;font-variant-numeric:tabular-nums}
.schedule .cur-pill{border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#64748b}
.schedule .cur-pill.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.schedule .efilter-select-wrap select{border-radius:6px;border:1px solid #e2e8f0;color:#0f172a}
.schedule .chart-box,.schedule .settlement-container,.schedule .eday{border-radius:8px;border:1px solid #e2e8f0;background:#fff}
.schedule .chart-header,.schedule .block-header strong{border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:700}
.schedule .daily-fill{background:#0f172a;border-radius:2px}
.schedule .settle-person-card,.schedule .transfer-card{border-radius:6px;border:1px solid #e2e8f0;background:#f8fafc}
.schedule .transfer-amt{color:#0f172a;font-weight:700}
.schedule .eday summary{background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:700;color:#0f172a}
.schedule .eday summary b,.schedule .rrow-primary{color:#0f172a;font-weight:700;font-variant-numeric:tabular-nums}
.schedule .rrow{border-top:1px solid #f1f5f9;padding:7px 10px}
.schedule .rrow-cat{background:#f1f5f9;color:#475569;border-radius:4px}
.schedule .expense-sheet{border-radius:12px;border:1px solid #e2e8f0}
.schedule .expense-title{border-bottom:1px solid #e2e8f0}
.schedule .expense-title h2{color:#0f172a;font-weight:800}
.schedule .expense-cat-btn,.schedule .expense-payer-btn{border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#0f172a}
.schedule .expense-cat-btn.active,.schedule .expense-payer-btn.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.schedule .currency-input-row{border-radius:6px;border:1px solid #e2e8f0}
.schedule .currency-input-row:focus-within{border-color:#0f172a}
.schedule .currency-tag{background:#f8fafc;border-right:1px solid #e2e8f0;color:#0f172a}
.schedule .expense-description,.schedule .expense-time,.schedule .select-wrap select{border-radius:6px;border:1px solid #e2e8f0}
.schedule .expense-save{border-radius:8px;background:#0f172a}
.schedule .packing-cards-wrap .day,.schedule #notes-zh .day,.schedule #notes-en .day,.schedule .ref-cards-wrap .day{border:1px solid #e2e8f0;border-radius:8px}
.schedule .pack-item input{accent-color:#0f172a}
.schedule .transit-modal-sheet{border-radius:12px;border:1px solid #e2e8f0}
.schedule .transit-endpoint{border-radius:6px;border:1px solid #e2e8f0}
.schedule .tstep-duration{background:#f1f5f9;color:#0f172a;border-radius:4px}
.schedule .transit-modal-btn-close{border-radius:6px;border:1px solid #e2e8f0}
.schedule .itinerary-scroll-indicator,.schedule .safari-scroll-indicator{background:rgba(15,23,42,.35)}
`;

// 3. Ticket Stub (🎫 票根登機證 / Ticket Stub)
const TICKET = `
:root{--ink:#0f172a;--ink-dim:#526071;--accent:#0284c7;--accent-soft:#e0f2fe;--link:#0369a1;--on-accent:#fff;--rule-strong:rgba(15,23,42,.25);--chip-bg:#fff;--chip-rule:#cbd5e1;--hero-bg:#fff;--tab-radius:6px;--tab-h:44px;--marker-radius:4px;--map-radius:8px;--sheet-bg:#fff;--sheet-raised:#fff;--sheet-sunken:#f8fafc;--sheet-rule:#cbd5e1}
.ticket body{background:#f1f5f9;color:var(--ink)}
.ticket .hero{background:var(--hero-bg);border-bottom:2px dashed #94a3b8;padding:12px 16px 10px}
.ticket .hero h1{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:20px;font-weight:800;letter-spacing:-.01em}
.ticket .hero p{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--ink-dim)}
.ticket .day{margin-top:14px;padding:16px;border:1px solid #cbd5e1;border-radius:10px;background:#fff;box-shadow:0 2px 8px rgba(15,23,42,.06);position:relative}
.ticket .day-head{border-bottom:2px dashed #94a3b8;padding-bottom:10px;margin-bottom:14px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .day-head span{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:var(--accent);font-weight:700}
.ticket .day h2{font-size:18px;font-weight:800;letter-spacing:-.02em}
.ticket .timeline-step{position:relative;display:flex;flex-direction:column}
.ticket .marker,.ticket .flight-number{border-radius:4px;background:#0f172a;color:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11px;font-weight:700;position:relative;z-index:2}
.ticket .flight-stop{position:relative;z-index:2}
.ticket .flight-line{grid-template-columns:26px 1fr;gap:12px;align-items:center}
.ticket .flight-middle::before{display:none!important}
.ticket .flight-middle{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:var(--accent);padding-left:38px;position:relative!important;z-index:2!important}
.ticket .flight-middle span,.ticket .flight-middle .flight-duration{color:var(--ink-dim)}
.ticket .timeline-step:not(:last-child)::before{left:12px;top:12px;bottom:-12px;width:0;border-left:2px dashed #cbd5e1;background:none;z-index:1}
.ticket .timeline-step:last-child:has(.flight-stop)::before{content:""!important;position:absolute!important;left:12px!important;top:12px!important;bottom:16px!important;width:0!important;border-left:2px dashed #cbd5e1!important;background:none!important;z-index:1!important}
.ticket .stop{align-items:start}
.ticket .stop h3{font-size:15px;font-weight:700}
.ticket .stop time,.ticket .flight-airport time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;font-weight:700;color:var(--accent)}
.ticket .detail,.ticket .note-body{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;color:var(--ink-dim);letter-spacing:.01em}
.ticket .route,.ticket .detail a{color:var(--link);text-decoration:underline}
.ticket .leg{border-top:1px dashed #cbd5e1;border-bottom:1px dashed #cbd5e1;background:#f8fafc;padding:6px 12px;margin:8px 0;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;display:flex;justify-content:space-between;align-items:center;position:relative!important;z-index:2!important}
.ticket .leg-mode{color:var(--accent);font-weight:700}
.ticket .leg-rest,.ticket .leg-plan{color:#64748b;font-size:11px}
.ticket .day-tab{border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:var(--ink-dim);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .day-tab.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.ticket .trip-map-shell{border-radius:8px;border:1px solid #cbd5e1;background:#fff;padding:6px;margin:10px 0 14px}
.ticket .trip-map-canvas{border-radius:6px;border:1px solid #cbd5e1}
.ticket .trip-map-title{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase}
.ticket .trip-map-tab,.ticket .trip-map-overview{border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:var(--ink);font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .trip-map-tab.active,.ticket .trip-map-overview.active{background:#0f172a;color:#fff;border-color:#0f172a}
.ticket .map-scope-switch{border-radius:4px;border:1px solid #cbd5e1;background:#fff}
.ticket .map-scope-switch button.active{background:var(--accent)}
.ticket .count-badge{border-radius:4px;background:#f1f5f9;color:#0f172a;border-color:#cbd5e1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700}
.ticket .day-action{border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:#0f172a}
.ticket .feature-nav{background:#fff;border-top:2px dashed #94a3b8}
.ticket .feature-nav .nav-btn-tab{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#64748b}
.ticket .feature-nav .nav-btn-tab.active{color:var(--accent)}
.ticket .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.ticket .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.ticket .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.ticket .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .feature-nav .nav-btn-itinerary.active{color:var(--accent)}
.ticket .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:750}
.ticket .feature-nav .nav-btn-itinerary:not(.active){color:#64748b}
.ticket .fab-expense{border-radius:8px!important;background:rgba(255,255,255,0.45)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px dashed rgba(15,23,42,0.35)!important;color:#0f172a!important;box-shadow:0 3px 10px rgba(0,0,0,0.08)!important;opacity:0.65;transition:opacity .2s ease,background .2s ease,transform .15s ease}
.ticket .fab-expense:hover,.ticket .fab-expense:active{opacity:1;background:#0f172a!important;color:#fff!important}
.ticket .expense-page-head h2{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:18px;font-weight:800;letter-spacing:.05em;text-transform:uppercase}
.ticket .tcard{background:#fff;border:1px solid #cbd5e1;border-left:4px solid #0f172a;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .tcard b{color:#0284c7;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700}
.ticket .cur-pill{border-radius:4px;border:1px solid #cbd5e1;background:#fff;color:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .cur-pill.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.ticket .efilter-select-wrap select{border-radius:4px;border:1px solid #cbd5e1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .chart-box,.ticket .settlement-container,.ticket .eday{background:#fff;border:1px solid #cbd5e1;border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .chart-header,.ticket .block-header strong{border-bottom:2px dashed #94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:#0f172a}
.ticket .daily-fill{background:#0f172a;border-radius:2px}
.ticket .settle-person-card,.ticket .transfer-card{background:#f8fafc;border:1px dashed #cbd5e1;border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .transfer-amt{color:#0284c7;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700}
.ticket .eday summary{background:#f8fafc;border-bottom:1px dashed #cbd5e1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700}
.ticket .eday summary b,.ticket .rrow-primary{color:#0284c7;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-weight:700}
.ticket .rrow{border-top:1px dashed #cbd5e1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .rrow-cat{background:#f1f5f9;border:1px solid #cbd5e1;border-radius:3px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#0f172a}
.ticket .expense-sheet{border-radius:8px;border:2px dashed #94a3b8;background:#fff;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .expense-title{border-bottom:2px dashed #94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .expense-title h2{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:#0f172a}
.ticket .sec-label{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em;color:#526071}
.ticket .expense-cat-btn,.ticket .expense-payer-btn{border-radius:4px;border:1px solid #cbd5e1;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#fff;color:#0f172a}
.ticket .expense-cat-btn.active,.ticket .expense-payer-btn.active{background:#0f172a!important;color:#fff!important;border-color:#0f172a!important}
.ticket .currency-input-row{border-radius:4px;border:1px solid #cbd5e1}
.ticket .currency-input-row:focus-within{border-color:#0284c7}
.ticket .currency-tag{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#f1f5f9;border-right:1px solid #cbd5e1;color:#0f172a}
.ticket .currency-val,.ticket .expense-description,.ticket .expense-time,.ticket .select-wrap select{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border-radius:4px;border:1px solid #cbd5e1}
.ticket .expense-description:focus,.ticket .expense-time:focus,.ticket .select-wrap select:focus{border-color:#0284c7}
.ticket .expense-save{border-radius:6px;background:#0f172a;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;text-transform:uppercase;letter-spacing:.08em}
.ticket .expense-delete-btn{border-radius:6px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .packing-cards-wrap .day,.ticket #notes-zh .day,.ticket #notes-en .day,.ticket .ref-cards-wrap .day{border:1px solid #cbd5e1;border-radius:8px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .pack-item input{accent-color:#0f172a}
.ticket .pack-item span{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;color:#0f172a}
.ticket .transit-modal-sheet{border-radius:8px;border:2px dashed #94a3b8;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace}
.ticket .transit-endpoint,.ticket .transit-modal-step{border-radius:4px;border:1px dashed #cbd5e1}
.ticket .tstep-duration{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;background:#e0f2fe;color:#0284c7;border-radius:3px}
.ticket .transit-modal-btn-close{border-radius:4px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;border:1px solid #cbd5e1}
.ticket .itinerary-scroll-indicator,.ticket .safari-scroll-indicator{background:rgba(15,23,42,.3)}
`;

// 4. Trip Hub (🎛 旅程儀表板 / Trip Hub)
// Overhauled across ALL pages: Modern all-in-one command center.
// - Itinerary: Independent floating Bento cards & floating transit capsules.
// - Packing: Progress-tracked checklist cards with pill items.
// - Notes: Alert memo cards with urgency accent borders.
// - Expenses: Modern Fintech stat widgets & split cards.
const HUB = `
:root{--ink:#0f172a;--ink-dim:#64748b;--accent:#2563eb;--accent-soft:#eff6ff;--link:#2563eb;--on-accent:#fff;--rule-strong:#e2e8f0;--chip-bg:#fff;--chip-rule:#e2e8f0;--hero-bg:#fff;--tab-radius:10px;--tab-h:44px;--marker-radius:8px;--map-radius:14px;--sheet-bg:#fff;--sheet-raised:#fff;--sheet-sunken:#f8fafc;--sheet-rule:#e2e8f0}
.hub body{background:#f1f5f9;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif}
.hub .hero{background:var(--hero-bg);border:1px solid #e2e8f0;border-radius:14px;margin:8px 12px 12px;padding:14px 16px 12px;box-shadow:0 2px 8px rgba(15,23,42,.04);position:relative;top:auto}
.hub .hero h1{font-size:20px;font-weight:800;letter-spacing:-.02em;color:#0f172a}
.hub .hero p{font-size:11.5px;font-weight:600;color:#64748b;margin-bottom:8px}
.hub .day-tab{border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;font-weight:700;padding:4px 10px}
.hub .day-tab.active{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important}
.hub .day-tab.active .day-tab-date{color:#bfdbfe!important}
/* Itinerary: Independent Bento Cards */
.hub .day{margin-top:10px;padding:10px;border:1px dashed #cbd5e1;border-radius:16px;background:rgba(255,255,255,0.45);box-shadow:none}
.hub .day-head{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:10px;box-shadow:0 1px 3px rgba(0,0,0,.03);display:flex;justify-content:space-between;align-items:center}
.hub .day-head span{font-size:11.5px;font-weight:750;color:#2563eb;letter-spacing:.04em}
.hub .day h2{font-size:16.5px;font-weight:800;color:#0f172a;margin-top:2px}
.hub .timeline-step:not(:last-child)::before{display:none!important}
.hub .stop{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin-bottom:0;box-shadow:0 2px 6px rgba(0,0,0,.03);grid-template-columns:22px 1fr;gap:10px}
.hub .marker,.hub .flight-number{border-radius:6px;width:22px;height:22px;background:#0f172a;color:#fff;font-size:11px;font-weight:750}
.hub .stop h3{font-size:15px;font-weight:750;color:#0f172a}
.hub .stop time{font-size:12px;font-weight:750;color:#2563eb;background:#eff6ff;padding:2px 8px;border-radius:999px}
.hub .kind{display:inline-block;padding:1px 7px;border-radius:999px;background:#eff6ff;color:#2563eb;font-size:10.5px;font-weight:700;margin-top:2px}
.hub .detail,.hub .note-body{font-size:12.5px;color:#475569}
.hub .leg{margin:6px auto 10px auto;padding:4px 14px;background:#fff;border:1px solid #e2e8f0;border-radius:999px;font-size:11.5px;font-weight:600;color:#475569;width:fit-content;box-shadow:0 1px 3px rgba(0,0,0,.03);display:flex;align-items:center;justify-content:center;gap:6px}
.hub .leg-mode{color:#2563eb;font-weight:750;text-decoration:none}
.hub .flight-stop{background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;box-shadow:0 2px 6px rgba(0,0,0,.03)}
.hub .flight-line{grid-template-columns:22px 1fr;gap:10px}
.hub .flight-middle::before{display:none!important}
.hub .flight-middle{padding-left:32px;color:#2563eb;font-weight:700;font-size:12px}
.hub .trip-map-shell{border-radius:14px;border:1px solid #e2e8f0;background:#fff;padding:6px;margin:8px 0 12px}
.hub .trip-map-canvas{border-radius:10px;border:1px solid #e2e8f0}
.hub .map-scope-switch,.hub .trip-map-tab,.hub .trip-map-overview{border-radius:6px;border-color:#e2e8f0;background:#fff;color:var(--ink-dim)}
.hub .map-scope-switch button.active,.hub .trip-map-tab.active,.hub .trip-map-overview.active{background:#2563eb;color:#fff;border-color:#2563eb}
.hub .count-badge{border-radius:999px;background:#eff6ff;color:#2563eb;border-color:#bfdbfe;font-weight:750}
.hub .day-action{background:#fff;border-color:#e2e8f0;color:#2563eb;border-radius:8px}
.hub .feature-nav{background:#fff;border-top:1px solid #e2e8f0}
.hub .feature-nav .nav-btn-tab{color:#64748b}
.hub .feature-nav .nav-btn-tab.active{color:#2563eb}
.hub .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.hub .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.hub .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.hub .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1}
.hub .feature-nav .nav-btn-itinerary.active{color:#2563eb}
.hub .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:750}
.hub .feature-nav .nav-btn-itinerary:not(.active){color:#64748b}
.hub .fab-expense{background:rgba(255,255,255,0.6)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(37,99,235,0.25)!important;color:#2563eb!important;box-shadow:0 3px 10px rgba(0,0,0,0.08)!important;border-radius:50%!important;opacity:0.65}
.hub .fab-expense:hover,.hub .fab-expense:active{opacity:1;background:#2563eb!important;color:#fff!important}
.hub .packing-cards-wrap .day{background:#fff;border:1px solid #e2e8f0;border-radius:14px;box-shadow:0 2px 8px rgba(0,0,0,.03);padding:14px 16px;margin-bottom:12px}
.hub .pack-items{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.hub .pack-item{background:#f8fafc;border:1px solid #f1f5f9;border-radius:8px;padding:9px 12px;margin:0;display:flex;align-items:center;gap:10px;font-weight:600;color:#1e293b}
.hub .pack-item input{accent-color:#2563eb;width:17px;height:17px}
.hub #notes-zh .day,.hub #notes-en .day{background:#fff;border:1px solid #e2e8f0;border-left:4px solid #2563eb;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.03);padding:14px 16px;margin-bottom:12px}
.hub .expense-page-head h2{color:#0f172a;font-weight:800}
.hub .tcard{border-radius:12px;border:1px solid #e2e8f0;border-top:3.5px solid #2563eb;background:#fff;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.hub .tcard b{color:#2563eb;font-weight:800;font-size:21px}
.hub .cur-pill{border-radius:999px;border:1px solid #e2e8f0;background:#f8fafc;color:#475569;padding:4px 12px}
.hub .cur-pill.active{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important}
.hub .chart-box,.hub .settlement-container,.hub .eday{border-radius:12px;border:1px solid #e2e8f0;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.hub .chart-header,.hub .block-header strong{border-bottom:1px solid #e2e8f0;color:#0f172a;font-weight:750}
.hub .daily-fill{background:#2563eb;border-radius:2px}
.hub .settle-person-card,.hub .transfer-card{border-radius:8px;border:1px solid #e2e8f0;background:#f8fafc}
.hub .transfer-amt{color:#2563eb;font-weight:800}
.hub .eday summary{background:#f8fafc;border-bottom:1px solid #e2e8f0;font-weight:750}
.hub .eday summary b,.hub .rrow-primary{color:#2563eb;font-weight:800}
.hub .rrow{border-top:1px solid #f1f5f9;padding:9px 12px}
.hub .rrow-cat{background:#eff6ff;color:#2563eb;border-radius:999px;padding:2px 8px}
.hub .expense-sheet{border-radius:14px;border:1px solid #e2e8f0}
.hub .expense-cat-btn,.hub .expense-payer-btn{border-radius:8px;border:1px solid #e2e8f0}
.hub .expense-cat-btn.active,.hub .expense-payer-btn.active{background:#2563eb!important;color:#fff!important;border-color:#2563eb!important}
.hub .currency-input-row{border-radius:8px;border:1px solid #e2e8f0}
.hub .expense-save{border-radius:8px;background:#2563eb}
.hub .itinerary-scroll-indicator,.hub .safari-scroll-indicator{background:rgba(37,99,235,.35)}
`;

// 5. Traveler's Booklet (📖 日式旅行手帳 / Traveler's Booklet)
// Overhauled across ALL pages: Authentic Japanese pocket guidebook (旅のしおり).
// - Warm handcrafted paper texture background (#fcfaf6), cinnabar red stamp accents.
// - Itinerary: Ruled notebook dashed timeline, red circular stamp markers.
// - Packing: Lined stationery sheet with pencil checkmark rows.
// - Notes: Parchment memo sticky notes.
// - Expenses: Handcrafted expense ledger with stamp markers.
const BOOKLET = `
:root{--ink:#2c241d;--ink-dim:#685848;--accent:#b91c1c;--accent-soft:#fef2f2;--link:#1d4ed8;--on-accent:#fff;--rule-strong:#2c241d;--chip-bg:#fffdfa;--chip-rule:#d4c7b5;--hero-bg:#f7f1e7;--tab-radius:4px;--tab-h:44px;--marker-radius:50%;--map-radius:8px;--sheet-bg:#fffdfa;--sheet-raised:#fffdfa;--sheet-sunken:#f7f1e7;--sheet-rule:#d4c7b5}
.booklet body{background:#fcfaf6;color:var(--ink);font-family:"PingFang SC","Hiragino Sans GB","Microsoft YaHei",Georgia,serif}
.booklet .hero{background:var(--hero-bg);border:1.5px solid #2c241d;border-radius:8px;margin:8px 12px 10px;padding:14px 16px;box-shadow:2px 3px 0 rgba(44,36,29,.12)}
.booklet .hero h1{font-size:20px;font-weight:800;letter-spacing:-.01em;color:#2c241d}
.booklet .hero p{font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#685848}
.booklet .day-tab{border-radius:4px;border:1.5px solid #2c241d;background:#fffdfa;color:#2c241d;font-weight:700;box-shadow:1px 2px 0 rgba(44,36,29,.1)}
.booklet .day-tab.active{background:#b91c1c!important;color:#fff!important;border-color:#b91c1c!important}
.booklet .day-tab.active .day-tab-date{color:#fee2e2!important}
.booklet .day{margin-top:12px;padding:14px;border:1.5px solid #2c241d;border-radius:8px;background:#fffdfa;box-shadow:2px 3px 0 rgba(44,36,29,.12)}
.booklet .day-head{border-bottom:2px solid #2c241d;padding-bottom:8px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center}
.booklet .day-head span{font-size:11.5px;letter-spacing:.08em;color:#b91c1c;font-weight:800}
.booklet .day h2{font-size:17px;font-weight:800;color:#2c241d;margin-top:2px}
.booklet .timeline-step:not(:last-child)::before{left:11px;width:0;border-left:1.5px dashed #a89f91;background:none}
.booklet .stop{grid-template-columns:24px 1fr;gap:12px;padding:8px 0;border-bottom:1px dashed #e8dfd3}
.booklet .stop:last-child{border-bottom:0}
/* Red Cinnabar Stamp Marker */
.booklet .marker,.booklet .flight-number{border-radius:50%;width:24px;height:24px;background:#fffdfa;border:2px solid #b91c1c;color:#b91c1c;font-size:11px;font-weight:800;box-shadow:0 0 0 1px rgba(185,28,28,.15)}
.booklet .stop h3{font-size:15px;font-weight:750;color:#2c241d}
.booklet .stop time{font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:12.5px;font-weight:800;color:#b91c1c}
.booklet .kind{display:inline-block;padding:1px 6px;border-radius:3px;background:#f7f1e7;border:1px solid #d4c7b5;color:#685848;font-size:10.5px;font-weight:700;margin-top:2px}
.booklet .detail,.booklet .note-body{font-size:12.5px;color:#5a4939;line-height:1.45}
.booklet .leg{margin:6px 0 8px 36px;padding:3px 10px;background:#f7f1e7;border:1px solid #d4c7b5;border-radius:4px;font-size:11.5px;font-weight:600;color:#2c241d;display:inline-flex;align-items:center;gap:6px}
.booklet .leg-mode{color:#b91c1c;font-weight:750;text-decoration:none}
.booklet .flight-stop{background:#f7f1e7;border:1px solid #d4c7b5;border-radius:6px;padding:10px 12px;margin:6px 0 8px}
.booklet .flight-line{grid-template-columns:24px 1fr;gap:12px}
.booklet .flight-middle::before{display:none!important}
.booklet .flight-middle{padding-left:36px;color:#b91c1c;font-weight:750;font-size:12px}
.booklet .trip-map-shell{border-radius:8px;border:1.5px solid #2c241d;background:#fffdfa;padding:6px;margin:8px 0 12px}
.booklet .trip-map-canvas{border-radius:6px;border:1px solid #d4c7b5}
.booklet .map-scope-switch,.booklet .trip-map-tab,.booklet .trip-map-overview{border-radius:4px;border:1px solid #2c241d;background:#fffdfa;color:#2c241d}
.booklet .map-scope-switch button.active,.booklet .trip-map-tab.active,.booklet .trip-map-overview.active{background:#2c241d;color:#fff}
.booklet .count-badge{border-radius:4px;background:#fee2e2;color:#991b1b;border:1px solid #f87171;font-weight:750}
.booklet .day-action{background:#f7f1e7;border:1px solid #2c241d;color:#2c241d;border-radius:4px}
.booklet .feature-nav{background:#fffdfa;border-top:2px solid #2c241d}
.booklet .feature-nav .nav-btn-tab{color:#685848}
.booklet .feature-nav .nav-btn-tab.active{color:#b91c1c}
.booklet .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.booklet .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.booklet .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.booklet .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:700;color:inherit;margin-top:0;line-height:1.1}
.booklet .feature-nav .nav-btn-itinerary.active{color:#b91c1c}
.booklet .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:800}
.booklet .feature-nav .nav-btn-itinerary:not(.active){color:#685848}
.booklet .fab-expense{background:rgba(255,253,250,0.6)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(185,28,28,0.3)!important;color:#b91c1c!important;box-shadow:0 3px 10px rgba(44,36,29,0.1)!important;border-radius:6px!important;opacity:0.65}
.booklet .fab-expense:hover,.booklet .fab-expense:active{opacity:1;background:#b91c1c!important;color:#fff!important}
.booklet .packing-cards-wrap .day{background:#fffdfa;border:1.5px solid #2c241d;border-radius:8px;box-shadow:2px 3px 0 rgba(44,36,29,.12);padding:14px;margin-bottom:12px}
.booklet .pack-items{display:flex;flex-direction:column;gap:4px;margin-top:8px}
.booklet .pack-item{border-bottom:1px dashed #d4c7b5;padding:8px 4px;margin:0;font-size:13.5px;color:#2c241d;font-weight:600}
.booklet .pack-item input{accent-color:#b91c1c}
.booklet #notes-zh .day,.booklet #notes-en .day{background:#fffdfa;border:1.5px solid #2c241d;border-radius:8px;box-shadow:2px 3px 0 rgba(44,36,29,.12);padding:14px;margin-bottom:12px}
.booklet .expense-page-head h2{color:#2c241d;font-weight:800}
.booklet .tcard{border-radius:6px;border:1.5px solid #2c241d;background:#fffdfa;padding:12px 14px;box-shadow:2px 2px 0 rgba(44,36,29,.12)}
.booklet .tcard b{color:#b91c1c;font-weight:800;font-family:ui-monospace,monospace;font-size:20px}
.booklet .cur-pill{border-radius:4px;border:1px solid #2c241d;background:#fffdfa;color:#2c241d;font-weight:700}
.booklet .cur-pill.active{background:#2c241d!important;color:#fff!important}
.booklet .chart-box,.booklet .settlement-container,.booklet .eday{border-radius:6px;border:1.5px solid #2c241d;background:#fffdfa;box-shadow:2px 2px 0 rgba(44,36,29,.12)}
.booklet .chart-header,.booklet .block-header strong{border-bottom:1.5px solid #d4c7b5;color:#2c241d;font-weight:800}
.booklet .daily-fill{background:#b91c1c;border-radius:2px}
.booklet .settle-person-card,.booklet .transfer-card{border-radius:4px;border:1px dashed #2c241d;background:#f7f1e7}
.booklet .transfer-amt{color:#b91c1c;font-weight:800}
.booklet .eday summary{background:#f7f1e7;border-bottom:1px solid #d4c7b5;font-weight:750;color:#2c241d}
.booklet .eday summary b,.booklet .rrow-primary{color:#b91c1c;font-weight:800}
.booklet .rrow{border-top:1px dashed #d4c7b5;padding:8px 10px}
.booklet .rrow-cat{background:#f7f1e7;color:#685848;border:1px solid #d4c7b5;border-radius:3px}
.booklet .expense-sheet{border-radius:8px;border:2px solid #2c241d;background:#fffdfa}
.booklet .expense-cat-btn,.booklet .expense-payer-btn{border-radius:4px;border:1px solid #2c241d;background:#fffdfa;color:#2c241d}
.booklet .expense-cat-btn.active,.booklet .expense-payer-btn.active{background:#b91c1c!important;color:#fff!important;border-color:#b91c1c!important}
.booklet .currency-input-row{border-radius:4px;border:1px solid #2c241d}
.booklet .expense-save{border-radius:6px;background:#2c241d}
.booklet .itinerary-scroll-indicator,.booklet .safari-scroll-indicator{background:rgba(44,36,29,.35)}
`;


// 6. Precision Rail (🧭 精確時刻軌道 / Precision Rail)
const RAIL = `
:root{--ink:#18181b;--ink-dim:#71717a;--accent:#0284c7;--accent-soft:#f0f9ff;--link:#0284c7;--on-accent:#fff;--rule-strong:#e4e4e7;--chip-bg:#fff;--chip-rule:#e4e4e7;--hero-bg:#fff;--tab-radius:6px;--tab-h:44px;--marker-radius:4px;--map-radius:8px;--sheet-bg:#fff;--sheet-raised:#fff;--sheet-sunken:#fafafa;--sheet-rule:#e4e4e7}
.rail body{background:#f4f4f5;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"SF Pro Text",sans-serif}
.rail .hero{background:#fff;border-bottom:1.5px solid #27272a;padding:12px 16px 10px}
.rail .hero h1{font-size:20px;font-weight:800;letter-spacing:-.02em;color:#09090b}
.rail .hero p{font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#71717a}
.rail .day-tab{border-radius:6px;border:1px solid #d4d4d8;background:#fff;color:#52525b;font-weight:650;padding:3px 9px}
.rail .day-tab.active{background:#09090b!important;color:#fff!important;border-color:#09090b!important}
.rail .day-tab.active .day-tab-date{color:#a1a1aa!important}

/* Itinerary: Strict Dual-Column Grid */
.rail .day{margin-top:12px;padding:12px;border:1px solid #d4d4d8;border-radius:10px;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.04)}
.rail .day-head{border-bottom:1.5px solid #09090b;padding-bottom:8px;margin-bottom:14px;display:flex;justify-content:space-between;align-items:flex-end}
.rail .day-head span{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:700;color:#0284c7}
.rail .day h2{font-size:16px;font-weight:800;color:#09090b;margin-top:2px}

/* Remove default continuous timeline vertical bar */
.rail .timeline-step:not(:last-child)::before{display:none!important}

/* The Stop: Fixed 54px Time/Index Rail Column on left, Content Card on right */
.rail .stop{display:grid;grid-template-columns:54px 1fr;gap:12px;padding:8px 0;align-items:start}
.rail .marker{border-radius:4px;width:24px;height:20px;background:#09090b;color:#fff;font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:11px;font-weight:800;line-height:1;margin-bottom:3px}
.rail .stop > div:first-child{display:flex;flex-direction:column;align-items:center;padding-top:2px}

/* We use CSS grid inside stop to anchor Time to the left rail under the marker */
.rail .stop-top{display:flex;flex-direction:column;align-items:flex-start;gap:2px;min-width:0}
.rail .stop time{display:block;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;font-weight:750;color:#0284c7;background:#f0f9ff;border:1px solid #bae6fd;padding:1px 5px;border-radius:4px;margin-top:4px;white-space:nowrap}
.rail .stop h3{font-size:15px;font-weight:750;color:#09090b;line-height:1.3;letter-spacing:-.01em;overflow-wrap:anywhere}
.rail .kind{display:inline-block;padding:1px 6px;border-radius:3px;background:#f4f4f5;color:#52525b;font-size:10.5px;font-weight:650;margin-top:2px}
.rail .detail{margin-top:4px;padding:6px 10px;background:#f8fafc;border-left:2.5px solid #0284c7;border-radius:0 6px 6px 0;font-size:12px;color:#475569;line-height:1.45}
.rail .detail p{margin:2px 0}

/* Transit Leg: Clean Horizontal Connect Card */
.rail .leg{margin:6px 0 10px 66px;padding:5px 12px;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:6px;font-size:11.5px;font-weight:600;color:#52525b;display:flex;align-items:center;gap:8px}
.rail .leg-mode{color:#0284c7;font-weight:750;text-decoration:none}
.rail .leg-rest{color:#71717a;font-family:ui-monospace,monospace;font-size:11px}
.rail .leg-plan{color:#09090b}

/* Flight stop */
.rail .flight-stop{background:#f8fafc;border:1px solid #e4e4e7;border-radius:8px;padding:10px 12px;margin:6px 0 10px 66px}
.rail .flight-line{grid-template-columns:22px 1fr;gap:10px}
.rail .flight-number{border-radius:4px;width:22px;height:20px;background:#09090b;color:#fff;font-family:ui-monospace,monospace;font-size:11px;font-weight:750}
.rail .flight-middle{padding-left:32px;color:#0284c7;font-weight:700;font-size:12px}
.rail .flight-middle::before{display:none!important}

/* Map Shell */
.rail .trip-map-shell{border-radius:10px;border:1px solid #d4d4d8;background:#fff;padding:6px;margin:8px 0 12px}
.rail .trip-map-canvas{border-radius:6px;border:1px solid #e4e4e7}
.rail .map-scope-switch,.rail .trip-map-tab,.rail .trip-map-overview{border-radius:4px;border-color:#d4d4d8;background:#fff;color:#52525b}
.rail .map-scope-switch button.active,.rail .trip-map-tab.active,.rail .trip-map-overview.active{background:#09090b;color:#fff;border-color:#09090b}
.rail .count-badge{border-radius:4px;background:#f4f4f5;color:#09090b;border-color:#d4d4d8;font-family:ui-monospace,monospace;font-weight:700}
.rail .day-action{background:#f4f4f5;border-color:#d4d4d8;color:#09090b;border-radius:6px}

/* Bottom Feature Nav */
.rail .feature-nav{background:#fff;border-top:1.5px solid #27272a}
.rail .feature-nav .nav-btn-tab{color:#71717a}
.rail .feature-nav .nav-btn-tab.active{color:#09090b}
.rail .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.rail .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.rail .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.rail .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1}
.rail .feature-nav .nav-btn-itinerary.active{color:#09090b}
.rail .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:800}
.rail .feature-nav .nav-btn-itinerary:not(.active){color:#71717a}

.rail .fab-expense{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(9,9,11,0.25)!important;color:#09090b!important;box-shadow:0 3px 10px rgba(0,0,0,0.08)!important;border-radius:8px!important;opacity:0.65}
.rail .fab-expense:hover,.rail .fab-expense:active{opacity:1;background:#09090b!important;color:#fff!important}

/* Checklist: Structured Kanban Status Cards */
.rail .packing-cards-wrap .day{background:#fff;border:1px solid #d4d4d8;border-radius:8px;padding:12px 14px;margin-bottom:12px;box-shadow:0 1px 3px rgba(0,0,0,.03)}
.rail .pack-items{display:flex;flex-direction:column;gap:5px;margin-top:8px}
.rail .pack-item{background:#f8fafc;border:1px solid #f1f5f9;border-left:3px solid #0284c7;border-radius:4px;padding:8px 10px;margin:0;font-size:13px;font-weight:600;color:#18181b}
.rail .pack-item input{accent-color:#0284c7;width:16px;height:16px}

/* Notes: Clean Directive Cards */
.rail #notes-zh .day,.rail #notes-en .day{background:#fff;border:1px solid #d4d4d8;border-left:4px solid #09090b;border-radius:8px;padding:12px 14px;margin-bottom:12px}

/* Expenses: Financial Ledger Grid */
.rail .expense-page-head h2{color:#09090b;font-weight:800}
.rail .tcard{border-radius:6px;border:1px solid #d4d4d8;border-left:4px solid #0284c7;background:#fff;padding:10px 12px}
.rail .tcard b{color:#09090b;font-weight:800;font-family:ui-monospace,monospace;font-size:20px}
.rail .cur-pill{border-radius:4px;border:1px solid #d4d4d8;background:#fff;color:#52525b;font-family:ui-monospace,monospace}
.rail .cur-pill.active{background:#09090b!important;color:#fff!important}
.rail .chart-box,.rail .settlement-container,.rail .eday{border-radius:8px;border:1px solid #d4d4d8;background:#fff}
.rail .chart-header,.rail .block-header strong{border-bottom:1px solid #e4e4e7;color:#09090b;font-weight:750}
.rail .daily-fill{background:#0284c7;border-radius:2px}
.rail .settle-person-card,.rail .transfer-card{border-radius:6px;border:1px solid #e4e4e7;background:#f8fafc}
.rail .transfer-amt{color:#0284c7;font-weight:750;font-family:ui-monospace,monospace}
.rail .eday summary{background:#f8fafc;border-bottom:1px solid #e4e4e7;font-weight:700;color:#09090b}
.rail .eday summary b,.rail .rrow-primary{color:#0284c7;font-weight:750;font-family:ui-monospace,monospace}
.rail .rrow{border-top:1px solid #f1f5f9;padding:8px 10px}
.rail .rrow-cat{background:#f1f5f9;color:#52525b;border-radius:3px;font-size:10.5px}
.rail .expense-sheet{border-radius:8px;border:1px solid #d4d4d8}
.rail .expense-cat-btn,.rail .expense-payer-btn{border-radius:4px;border:1px solid #d4d4d8}
.rail .expense-cat-btn.active,.rail .expense-payer-btn.active{background:#09090b!important;color:#fff!important;border-color:#09090b!important}
.rail .currency-input-row{border-radius:4px;border:1px solid #d4d4d8}
.rail .expense-save{border-radius:6px;background:#09090b}
.rail .itinerary-scroll-indicator,.rail .safari-scroll-indicator{background:rgba(9,9,11,.35)}
`;

// 7. Magazine Story (📰 沉浸旅行誌 / Magazine Story)
const STORY = `
:root{--ink:#1c1917;--ink-dim:#78716c;--accent:#c2410c;--accent-soft:#fff7ed;--link:#c2410c;--on-accent:#fff;--rule-strong:#e7e5e4;--chip-bg:#fff;--chip-rule:#e7e5e4;--hero-bg:#fff;--tab-radius:999px;--tab-h:44px;--marker-radius:8px;--map-radius:16px;--sheet-bg:#fff;--sheet-raised:#fff;--sheet-sunken:#fafaf9;--sheet-rule:#e7e5e4}
.story body{background:#fafaf9;color:var(--ink);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Serif TC",Georgia,serif}
.story .hero{background:#fff;border-bottom:1px solid #e7e5e4;padding:14px 18px 12px}
.story .hero h1{font-size:22px;font-weight:900;letter-spacing:-.03em;color:#0c0a09}
.story .hero p{font-size:11.5px;font-weight:600;letter-spacing:.04em;color:#78716c}
.story .day-tab{border-radius:999px;border:1px solid #e7e5e4;background:#f5f5f4;color:#57534e;font-weight:700;padding:4px 12px}
.story .day-tab.active{background:#c2410c!important;color:#fff!important;border-color:#c2410c!important}
.story .day-tab.active .day-tab-date{color:#ffedd5!important}

/* Itinerary: Editorial Story Cards */
.story .day{margin-top:12px;padding:12px;border:1px solid #e7e5e4;border-radius:16px;background:rgba(255,255,255,0.7);box-shadow:0 2px 10px rgba(0,0,0,.03)}
.story .day-head{background:#fff;border:1px solid #e7e5e4;border-radius:12px;padding:12px 16px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;box-shadow:0 1px 3px rgba(0,0,0,.02)}
.story .day-head span{font-size:12px;font-weight:800;color:#c2410c;letter-spacing:.05em;text-transform:uppercase}
.story .day h2{font-size:18px;font-weight:900;color:#1c1917;margin-top:2px;letter-spacing:-.02em}

.story .timeline-step:not(:last-child)::before{display:none!important}

/* Distinct Standalone Story Card for each stop */
.story .stop{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:14px 16px;margin-bottom:0;box-shadow:0 2px 8px rgba(0,0,0,.03);grid-template-columns:30px 1fr;gap:12px;align-items:start}
.story .marker{border-radius:8px;width:30px;height:30px;background:#c2410c;color:#fff;font-size:13px;font-weight:800;box-shadow:0 3px 8px rgba(194,65,12,0.25)}
.story .stop-top{display:flex;flex-direction:column;align-items:flex-start;gap:3px;min-width:0}
.story .stop h3{font-size:17px;font-weight:800;color:#1c1917;letter-spacing:-.02em;line-height:1.25}
.story .stop time{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;font-weight:750;color:#c2410c;background:#fff7ed;padding:2px 8px;border-radius:999px;margin-bottom:2px}
.story .kind{display:inline-block;padding:2px 8px;border-radius:6px;background:#f5f5f4;color:#78716c;font-size:11px;font-weight:700}
.story .detail{margin-top:6px;padding:8px 12px;background:#fafaf9;border-left:3px solid #c2410c;border-radius:0 8px 8px 0;font-size:12.5px;color:#57534e;line-height:1.5}
.story .detail p{margin:3px 0}

/* Transit: Story Connector Pill */
.story .leg{margin:8px auto 12px auto;padding:5px 16px;background:#fff;border:1px solid #e7e5e4;border-radius:999px;font-size:12px;font-weight:650;color:#57534e;width:fit-content;box-shadow:0 2px 6px rgba(0,0,0,.03);display:flex;align-items:center;justify-content:center;gap:8px}
.story .leg-mode{color:#c2410c;font-weight:800;text-decoration:none}
.story .leg-rest{color:#a8a29e}

/* Flight stop */
.story .flight-stop{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:14px 16px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.story .flight-line{grid-template-columns:26px 1fr;gap:12px}
.story .flight-number{border-radius:6px;width:26px;height:26px;background:#1c1917;color:#fff;font-size:11.5px;font-weight:800}
.story .flight-middle{padding-left:38px;color:#c2410c;font-weight:800;font-size:12.5px}
.story .flight-middle::before{display:none!important}

/* Map Shell */
.story .trip-map-shell{border-radius:16px;border:1px solid #e7e5e4;background:#fff;padding:6px;margin:8px 0 12px}
.story .trip-map-canvas{border-radius:12px;border:1px solid #e7e5e4}
.story .map-scope-switch,.story .trip-map-tab,.story .trip-map-overview{border-radius:8px;border-color:#e7e5e4;background:#fff;color:#57534e}
.story .map-scope-switch button.active,.story .trip-map-tab.active,.story .trip-map-overview.active{background:#c2410c;color:#fff;border-color:#c2410c}
.story .count-badge{border-radius:999px;background:#fff7ed;color:#c2410c;border-color:#fed7aa;font-weight:800}
.story .day-action{background:#fff;border-color:#e7e5e4;color:#c2410c;border-radius:50%}

/* Feature Nav */
.story .feature-nav{background:#fff;border-top:1px solid #e7e5e4}
.story .feature-nav .nav-btn-tab{color:#78716c}
.story .feature-nav .nav-btn-tab.active{color:#c2410c}
.story .feature-nav .nav-btn-itinerary{position:static;top:auto;padding:2px 2px;height:100%;flex:1 1 0;max-width:85px}
.story .feature-nav .nav-btn-itinerary .nav-itinerary-circle,
.story .feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{width:auto;height:auto;min-width:0;min-height:0;aspect-ratio:auto;border:0;border-radius:0;background:transparent!important;color:inherit;box-shadow:none!important;position:static;top:auto;overflow:visible;transition:none}
.story .feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:10.5px;font-weight:600;color:inherit;margin-top:0;line-height:1.1}
.story .feature-nav .nav-btn-itinerary.active{color:#c2410c}
.story .feature-nav .nav-btn-itinerary.active .nav-itinerary-circle .nav-text{font-weight:800}
.story .feature-nav .nav-btn-itinerary:not(.active){color:#78716c}

.story .fab-expense{background:rgba(255,255,255,0.7)!important;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);border:1.5px solid rgba(194,65,12,0.3)!important;color:#c2410c!important;box-shadow:0 3px 10px rgba(0,0,0,0.08)!important;border-radius:50%!important;opacity:0.7}
.story .fab-expense:hover,.story .fab-expense:active{opacity:1;background:#c2410c!important;color:#fff!important}

/* Checklist: Editorial Magazine Grid */
.story .packing-cards-wrap .day{background:#fff;border:1px solid #e7e5e4;border-radius:14px;padding:16px 18px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.story .pack-items{display:flex;flex-direction:column;gap:6px;margin-top:10px}
.story .pack-item{background:#fafaf9;border:1px solid #f5f5f4;border-radius:8px;padding:9px 12px;margin:0;font-size:13.5px;font-weight:600;color:#1c1917}
.story .pack-item input{accent-color:#c2410c;width:17px;height:17px}

/* Notes: Memo Vignettes */
.story #notes-zh .day,.story #notes-en .day{background:#fff;border:1px solid #e7e5e4;border-left:4px solid #c2410c;border-radius:12px;padding:14px 16px;margin-bottom:12px;box-shadow:0 2px 8px rgba(0,0,0,.03)}

/* Expenses: Contemporary Warm Journal */
.story .expense-page-head h2{color:#1c1917;font-weight:900}
.story .tcard{border-radius:12px;border:1px solid #e7e5e4;border-top:3.5px solid #c2410c;background:#fff;padding:12px 14px;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.story .tcard b{color:#c2410c;font-weight:900;font-size:22px}
.story .cur-pill{border-radius:999px;border:1px solid #e7e5e4;background:#fafaf9;color:#57534e;padding:4px 12px}
.story .cur-pill.active{background:#c2410c!important;color:#fff!important;border-color:#c2410c!important}
.story .chart-box,.story .settlement-container,.story .eday{border-radius:12px;border:1px solid #e7e5e4;background:#fff;box-shadow:0 2px 8px rgba(0,0,0,.03)}
.story .chart-header,.story .block-header strong{border-bottom:1px solid #e7e5e4;color:#1c1917;font-weight:800}
.story .daily-fill{background:#c2410c;border-radius:2px}
.story .settle-person-card,.story .transfer-card{border-radius:8px;border:1px solid #e7e5e4;background:#fafaf9}
.story .transfer-amt{color:#c2410c;font-weight:850}
.story .eday summary{background:#fafaf9;border-bottom:1px solid #e7e5e4;font-weight:800;color:#1c1917}
.story .eday summary b,.story .rrow-primary{color:#c2410c;font-weight:850}
.story .rrow{border-top:1px solid #f5f5f4;padding:9px 12px}
.story .rrow-cat{background:#fff7ed;color:#c2410c;border-radius:999px;padding:2px 8px}
.story .expense-sheet{border-radius:14px;border:1px solid #e7e5e4}
.story .expense-cat-btn,.story .expense-payer-btn{border-radius:8px;border:1px solid #e7e5e4}
.story .expense-cat-btn.active,.story .expense-payer-btn.active{background:#c2410c!important;color:#fff!important;border-color:#c2410c!important}
.story .currency-input-row{border-radius:8px;border:1px solid #e7e5e4}
.story .expense-save{border-radius:8px;background:#c2410c}
.story .itinerary-scroll-indicator,.story .safari-scroll-indicator{background:rgba(194,65,12,.35)}
`;

const STYLES = {
  classic: CLASSIC,
  tab: TAB,
  timeline: TIMELINE,
  default: DEFAULT,
  schedule: SCHEDULE,
  ticket: TICKET,
  hub: HUB,
  booklet: BOOKLET,
  rail: RAIL,
  story: STORY,
  // Retired aliases
  compact: COMPACT,
  dash: DASH,
  stripe: STRIPE,
};

const META_COLORS = {
  classic: "#b54a14",
  tab: "#b54a14",
  timeline: "#b54a14",
  default: "#b54a14",
  schedule: "#0f172a",
  ticket: "#0284c7",
  hub: "#2563eb",
  booklet: "#b91c1c",
  rail: "#09090b",
  story: "#c2410c",
  compact: "#b54a14",
  dash: "#b54a14",
  stripe: "#b54a14",
};

export function previewStyleCss(theme) {
  const css = STYLES[theme] || "";
  return css ? `<style>${css}</style>` : "";
}

export function previewThemeMetaColor(theme) {
  return META_COLORS[theme] || META_COLORS.classic;
}
