import { airports } from './geography-data.js';
import { validCoordinates } from './coordinates.js';

export function airportRecord(name) {
  const text = String(name || '').trim();
  const code = text.match(/\(([A-Z]{3})\)/i)?.[1] || (/^[A-Z]{3}$/i.test(text) ? text : '');
  const row = airports[code.toUpperCase()];
  return row ? { code: code.toUpperCase(), name: row[0], country: row[1], lat: row[2], lon: row[3] } : null;
}

// Exact IATA identity takes precedence over an old, unverified geocoder result.
// Preserve explicitly chosen entrances and nearby airport/terminal coordinates.
export function airportLocation(stop, endpoint) {
  const field = `${endpoint}AirportLocation`, saved = stop[field];
  const record = airportRecord(stop[`${endpoint}Airport`]);
  if (validCoordinates(saved) && (stop.manualFields?.[field] || !record)) return saved;
  if (!record) return null;
  if (validCoordinates(saved)) {
    const dy = Number(saved.lat) - record.lat;
    const dx = (Number(saved.lon) - record.lon) * Math.cos(record.lat * Math.PI / 180);
    if (Math.hypot(dx, dy) < 0.25) return saved;
  }
  return { lat: record.lat, lon: record.lon, source: `OurAirports IATA ${record.code}` };
}
