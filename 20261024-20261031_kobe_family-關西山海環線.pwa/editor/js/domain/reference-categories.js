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
