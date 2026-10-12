import { validCoordinates } from "./domain/coordinates.js";

function mapPlaceQuery(stop, context = "") {
  const name = String(stop.name || "").trim();
  const destination = String(context || "").trim();
  const address = String(stop.address || "").trim();

  if (!name && !address) return "";

  // Let Google Maps resolve the canonical place from its name and trip context.
  // Do not append geocoder address fragments to named places: those can make
  // Maps treat temple gates/buildings as separate search candidates.
  if (name) return [name, destination].filter(Boolean).join(" ");
  return [address, destination].filter(Boolean).join(" ");
}

export function googlePlaceUrl(stop, context = "") {
  if (safeGoogleMapsUrl(stop.links?.googleMaps)) return stop.links.googleMaps;
  const query = mapPlaceQuery(stop, context);
  // A place link must open Maps' place search, not the directions planner.
  // When a canonical Maps URL is already saved on the stop, prefer it above.
  return query ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}` : "";
}

// A search URL can show several results. Only a URL carrying a place
// identifier is evidence that the link targets one Google Maps place.
export function isSpecificGooglePlaceUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    if (url.protocol !== "https:") return false;
    if (!["google.com", "www.google.com", "maps.google.com"].includes(url.hostname)) return false;
    return Boolean(
      (url.pathname.startsWith("/maps/place/") && /!1s[^/]+/.test(url.pathname)) ||
      (url.pathname.startsWith("/maps/search/") && url.searchParams.get("query_place_id")) ||
      (url.pathname.startsWith("/maps") && url.searchParams.get("cid"))
    );
  } catch {
    return false;
  }
}

export function isGoogleMapsShareShortUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "https:" && url.hostname === "maps.app.goo.gl" && url.pathname.length > 1;
  } catch {
    return false;
  }
}

export function safeGoogleMapsUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password &&
      ((["google.com", "www.google.com", "maps.google.com"].includes(url.hostname) && url.pathname.startsWith("/maps")) ||
      (url.hostname === "maps.app.goo.gl" && url.pathname.length > 1));
  } catch { return false; }
}

export function googlePlaceIdentity(value) {
  if (!safeGoogleMapsUrl(value)) return {};
  const url = new URL(value);
  let path;
  try { path = decodeURIComponent(url.pathname); } catch { return {}; }
  const encodedId = path.match(/!1s([^!/?]+)/)?.[1] || "";
  const placeId = url.searchParams.get("query_place_id") || path.match(/!19s(ChI[A-Za-z0-9_-]+)/)?.[1] || (/^ChI[A-Za-z0-9_-]+$/.test(encodedId) ? encodedId : "");
  // @lat,lon is the camera centre, not the selected place.
  const match = path.match(/!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/);
  const queryPoint = (url.searchParams.get("query") || url.searchParams.get("q") || "").match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  const coordinates = match || queryPoint;
  const location = coordinates ? { lat: Number(coordinates[1]), lon: Number(coordinates[2]), source: "Google Maps place" } : null;
  return { placeId, location: validCoordinates(location) ? location : null };
}

function routeTarget(stop, role, context) {
  if (stop.kind === "航班") {
    const airport = role === "destination" ? stop.departureAirport : stop.arrivalAirport;
    const location = role === "destination" ? stop.departureAirportLocation : stop.arrivalAirportLocation;
    const field = role === "destination" ? "departureAirportLocation" : "arrivalAirportLocation";
    // Old automatic airport geocoding can resolve an IATA code as a town.
    // Only an explicitly confirmed entrance may override the airport name.
    return { query: stop.manualFields?.[field] && validCoordinates(location) ? `${location.lat},${location.lon}` : String(airport || ""), placeId: "" };
  }
  const identity = googlePlaceIdentity(stop.links?.googleMaps);
  const point = identity.location || (stop.manualFields?.location && validCoordinates(stop.location) ? stop.location : null);
  // Identifiers improve a link when available; names remain valid Maps inputs.
  const namedPlace = mapPlaceQuery(stop, context);
  return { query: identity.placeId && namedPlace ? namedPlace : point ? `${point.lat},${point.lon}` : namedPlace, placeId: identity.placeId || "" };
}

export function directionPlace(stop, role = "origin", context = "") {
  return routeTarget(stop, role, context).query;
}

export function googleDirectionsUrl(stops, context = "") {
  if (stops.length < 2 || stops.length > 5) return "";
  const mode = stops[0]?.nextLeg?.mode || "開車";
  if (mode === "飛機") return "";
  if (stops.length > 2 && (mode === "大眾運輸" || stops.some(s => s.kind === "航班") || stops.slice(0,-1).some(s => (s.nextLeg?.mode || "開車") !== mode))) return "";
  const targets = stops.map((stop,index) => routeTarget(stop,index === stops.length-1 ? "destination" : "origin",context));
  if (targets.some(target => !target.query)) return "";
  const travelmode = { "步行": "walking", "大眾運輸": "transit", "騎自行車": "bicycling" }[mode] || "driving";
  const params = new URLSearchParams({ api: "1", origin: targets[0].query, destination: targets.at(-1).query, travelmode });
  if (targets[0].placeId) params.set("origin_place_id",targets[0].placeId);
  if (targets.at(-1).placeId) params.set("destination_place_id",targets.at(-1).placeId);
  if (targets.length > 2) {
    const middle = targets.slice(1,-1);
    params.set("waypoints",middle.map(t => t.query).join("|"));
    if (middle.every(t => t.placeId)) params.set("waypoint_place_ids",middle.map(t => t.placeId).join("|"));
  }
  const url = `https://www.google.com/maps/dir/?${params}`;
  return url.length <= 2048 ? url : "";
}

export function appleDirectionsUrl(from, to) {
  const origin = [from.name, from.address].filter(Boolean).join(" ");
  const destination = [to.name, to.address].filter(Boolean).join(" ");
  return origin && destination ? `https://maps.apple.com/?saddr=${encodeURIComponent(origin)}&daddr=${encodeURIComponent(destination)}&dirflg=d` : "";
}
