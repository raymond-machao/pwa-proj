import { countries, destinationNames } from './geography-data.js';
import { currencyTerritories } from './currency-territories.js';
import { validCoordinates } from './coordinates.js';

const normalize = text => String(text || '').normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const names = new Map(Object.entries(destinationNames));
const countryNames = new Map();
for (const region of currencyTerritories) for (const name of region.names) countryNames.set(normalize(name), [region.region]);
const coordinateCache = new Map();

function inRing(x, y, ring) {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i], [xj, yj] = ring[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

export function countryAt(point) {
  if (!validCoordinates(point)) return '';
  const x = Number(point.lon), y = Number(point.lat), key = `${x},${y}`;
  if (coordinateCache.has(key)) return coordinateCache.get(key);
  let nearby = '', distance = 0.12 ** 2;
  for (const [code, polygons] of countries) for (const [box, rings] of polygons) {
    if (x < box[0] - 0.12 || y < box[1] - 0.12 || x > box[2] + 0.12 || y > box[3] + 0.12) continue;
    if (inRing(x, y, rings[0]) && !rings.slice(1).some(ring => inRing(x, y, ring))) {
      coordinateCache.set(key, code); return code;
    }
    // Small coastal/landfill gaps in the generalized boundaries: nearest coast,
    // only after checking all polygons for an actual containing country.
    const ring = rings[0];
    for (let i = 1; i < ring.length; i++) {
      const [ax, ay] = ring[i - 1], [bx, by] = ring[i];
      const dx = bx - ax, dy = by - ay, length = dx * dx + dy * dy;
      const t = length ? Math.max(0, Math.min(1, ((x - ax) * dx + (y - ay) * dy) / length)) : 0;
      const d = (x - ax - t * dx) ** 2 + (y - ay - t * dy) ** 2;
      if (d < distance) { distance = d; nearby = code; }
    }
  }
  if (coordinateCache.size > 10000) coordinateCache.clear();
  coordinateCache.set(key, nearby);
  return nearby;
}

export function destinationCountries(destination, groundPoints = []) {
  const text = normalize(destination);
  if (!text) return new Set();
  const ground = new Set(groundPoints.map(countryAt).filter(Boolean));
  const exact = countryNames.get(text) || names.get(text);
  if (exact?.length === 1) return new Set(exact);
  if (exact?.length > 1) {
    const matches = exact.filter(code => ground.has(code));
    return new Set(matches.length === 1 ? matches : []);
  }
  const parts = text.split(/[\s,，、/／→;；]+/).filter(Boolean);
  const matched = new Set(parts.flatMap(part => {
    const match = countryNames.get(part) || names.get(part);
    return match?.length === 1 ? match : [];
  }));
  if (matched.size) return matched;
  // An unlisted village can be identified by already confirmed itinerary places.
  // Never guess between different countries, or infer from an outbound airport.
  return ground.size === 1 ? ground : new Set();
}
