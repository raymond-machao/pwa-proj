// Single source of truth for the phone-preview styles.
// The select in index.html is rendered from PREVIEW_THEME_OPTIONS; every place
// that validates or normalizes previewTheme must use resolvePreviewTheme so a
// style is only ever named here once.
export const PREVIEW_THEMES = [
  { id: "classic", label: "🍁 經典時間軸 (原版)" },
  { id: "tab", label: "📑 簡約頁籤 (Compact Tabs)" },
  { id: "timeline", label: "⏱ 雙欄時刻 (Timeline Tab)" },
  { id: "default", label: "⏱ 雙欄時刻 (Default)" },
  { id: "schedule", label: "⏱ 緊湊時刻表 (Timetable Rail)" },
  { id: "ticket", label: "🎫 票根登機證 (Ticket Stub)" },
  { id: "story", label: "📰 沉浸旅行誌 (Magazine Story)" },
];

export const PREVIEW_THEME_OPTIONS = PREVIEW_THEMES.map(theme => ({ ...theme }));

export const DEFAULT_PREVIEW_THEME = "classic";

// Saved projects predate the current style list. Identifiers that no longer
// exist must still open, so they fold onto the most appropriate active format
// or the default instead of being rejected.
const RETIRED_THEME_ALIASES = {
  // Legacy aliases
  magazine: "classic",
  sketch: "classic",
  collage: "classic",
  dashboard: "classic",
  modern: "classic",
  apple: "classic",
  // Retired UI formats
  compact: "tab",
  dash: "tab",
  stripe: "tab",
  bento: "classic",
  journal: "classic",
  glass: "classic",
  hub: "tab",
  booklet: "classic",
  rail: "schedule",
  node: "tab",
  // Opencode retired styles mapped to active UI formats
  oled: "schedule",
  midnight: "schedule",
  austere: "schedule",
  newprint: "classic",
  swiss: "schedule",
  brutal: "ticket",
  clay: "classic",
  forest: "classic",
  ocean: "classic",
  editorial: "classic",
};

export function isPreviewTheme(value) {
  return PREVIEW_THEMES.some(theme => theme.id === value);
}

export function resolvePreviewTheme(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (isPreviewTheme(raw)) return raw;
  return RETIRED_THEME_ALIASES[raw] || DEFAULT_PREVIEW_THEME;
}
