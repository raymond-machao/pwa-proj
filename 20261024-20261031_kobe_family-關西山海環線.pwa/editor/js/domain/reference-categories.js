// Keep legacy "食物" records readable while allowing user-defined categories.
export const REFERENCE_CATEGORY_SUGGESTIONS = ['景點', '美食', '購物'];
export function referenceCategory(row) {
  const label = String(row?.kind || '').trim() || '景點';
  return label === '食物' ? '美食' : label;
}
export function referenceCategories(rows = []) {
  const categories = [...new Set(rows.map(referenceCategory))];
  return categories.map((label, index) => ({ label, id: label === '景點' ? 'ref-spots' : label === '美食' ? 'ref-food' : 'ref-category-' + index, rows: rows.filter(row => referenceCategory(row) === label) }));
}
export function referenceSuggestions(rows = []) {
  return [...new Set([...REFERENCE_CATEGORY_SUGGESTIONS, ...rows.map(referenceCategory)])];
}

function defaultEscape(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function parseCategoryHeading(rawLabel) {
  const text = String(rawLabel || '').trim();
  if (!text) return { label: '', url: '', isLink: false };
  const mdMatch = text.match(/\[([^\]\r\n]+)\]\((https?:\/\/[^\s\)]+)\)/i);
  if (mdMatch) {
    return { label: mdMatch[1].trim(), url: mdMatch[2].trim(), isLink: true };
  }
  const urlMatch = text.match(/(https?:\/\/[^\s]+)/i);
  if (urlMatch) {
    const url = urlMatch[1].trim();
    const label = text.replace(url, '').replace(/[()[\]（）]/g, ' ').trim() || url;
    return { label, url, isLink: true };
  }
  return { label: text, url: '', isLink: false };
}

export function categoryDisplayText(rawLabel, language = 'zh') {
  const parsed = parseCategoryHeading(rawLabel);
  if (language === 'en') {
    return { '景點': 'Spots', '美食': 'Food', '購物': 'Shopping' }[parsed.label] || parsed.label;
  }
  return parsed.label;
}

export function categoryTitleHtml(rawLabel, language = 'zh', esc = defaultEscape) {
  const parsed = parseCategoryHeading(rawLabel);
  const translated = language === 'en' ? ({ '景點': 'Attractions', '美食': 'Food & Dining', '購物': 'Shopping' }[parsed.label] || parsed.label) : parsed.label;
  if (parsed.isLink && parsed.url) {
    return `<a class="ref-cat-link" href="${esc(parsed.url)}" target="_blank" rel="noopener" title="${esc(translated)}（點擊開啟連結）">${esc(translated)}</a>`;
  }
  return esc(translated);
}

