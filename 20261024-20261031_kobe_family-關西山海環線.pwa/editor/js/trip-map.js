// Shared map surface. The currently selected route view is drawn by exporter.js.
import { googlePlaceIdentity } from "./map-links.js";
import { validCoordinates } from "./domain/coordinates.js";
import { airportLocation, airportRecord } from "./domain/airports.js";
import { countryAt, destinationCountries } from "./domain/map-country.js";
const escapeAttr = value => String(value || "").replace(/[&<>\"']/g, ch => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;" })[ch]);
const fallbackCenter = destination => {
  const text = String(destination || "").toLocaleLowerCase();
  if (/tokyo|東京|japan|日本/.test(text)) return [139.75, 35.68];
  if (/singapore|新加坡/.test(text)) return [103.82, 1.35];
  if (/thailand|泰國|bangkok|曼谷/.test(text)) return [100.50, 13.75];
  if (/taiwan|台灣|taipei|台北/.test(text)) return [121.52, 25.04];
  return [121.52, 25.04];
};

function stopsFor(trip, allowedCountries, dayIndex = null) {
  const include = (point, country = '') => !String(trip.destination || '').trim() || (allowedCountries.size && allowedCountries.has(country || countryAt(point)));
  return (trip.days || []).flatMap((day, index) => {
    if (dayIndex != null && dayIndex !== index) return [];
    // Keep both airport numbers even when one endpoint has no coordinates.
    let order = 0;
    return (day.stops || []).flatMap(stop => {
      if (!String(stop.name || "").trim()) return [];
      if (stop.kind === "航班") {
        const flightId = `${index}:${order}`;
        return ["departure", "arrival"].flatMap(endpoint => {
          order += 1;
          const point = airportLocation(stop, endpoint);
          if (!validCoordinates(point)) return [];
          // An unresolved destination must not let international flights set the zoom.
          if (String(trip.destination || '').trim() && !allowedCountries.size) return [];
          const country = stop.manualFields?.[`${endpoint}AirportLocation`] ? '' : airportRecord(stop[`${endpoint}Airport`])?.country;
          if (!include(point, country)) return [];
          return [{ name: stop[`${endpoint}AirportZh`] || stop[`${endpoint}Airport`] || stop.name,
            lat: Number(point.lat), lon: Number(point.lon), order, day: index + 1,
            flight: true, flightId }];
        });
      }
      order += 1;
      const point = googlePlaceIdentity(stop.links?.googleMaps).location || stop.location || stop;
      const lat = Number(point.lat), lon = Number(point.lon);
      if (!validCoordinates(point)) return [];
      if (!include(point)) return [];
      return [{ name: stop.name, lat, lon, order, day: index + 1 }];
    });
  });
}

export function itineraryMapHtml(trip, language = "zh", offlineMapImages = []) {
  const groundPoints = (trip.days || []).flatMap(day => (day.stops || []).filter(stop => stop.kind !== '航班' && stop.name).map(stop => googlePlaceIdentity(stop.links?.googleMaps).location || stop.location || stop));
  const allowedCountries = destinationCountries(trip.destination, groundPoints);
  const views = [{ key: "all", title: language === "en" ? "Trip overview" : "全行程總覽", points: stopsFor(trip, allowedCountries) }, ...(trip.days || []).map((day, index) => ({ key: String(index), title: `${language === "en" ? "Day " : "第 "}${index + 1}${language === "en" ? "" : " 天"}${day.title ? ` · ${day.title}` : ""}`, points: stopsFor(trip, allowedCountries, index) }))];
  const hasPoints = views[0].points.length > 0;
  const hasOfflineImages = Array.isArray(offlineMapImages) && offlineMapImages.length === views.length && offlineMapImages.every(image => typeof image === "string" && /^data:image\/(?:webp|png);base64,[A-Za-z0-9+/]+=*$/.test(image));
  const unresolvedCountry = String(trip.destination || '').trim() && !allowedCountries.size;
  const caption = unresolvedCountry
    ? (language === 'en' ? 'Destination country could not be confirmed. Add the country to the main destination (for example: Tokyo, Japan).' : '尚無法確認目的地國家，請在主要地點補上國家名稱，例如：東京 日本。')
    : hasPoints ? "" : (language === "en" ? "No locations with confirmed coordinates in the destination country yet." : "目前尚無目的地國家內、具有可用座標的地點。");
  const emptyCaption = unresolvedCountry ? caption : language === "en" ? "No mapped locations in the destination country for this day yet." : "這一天目前沒有目的地國家內的可用地圖點。";
  const mapViews = escapeAttr(JSON.stringify(views));
  const offlineGallery = hasOfflineImages
    ? `<div class="trip-map-loading" data-offline-map-loading>${language === "en" ? "Loading map… You can use the itinerary." : "地圖載入中，行程可先操作"}</div>` + offlineMapImages.map((src, index) => `<img decoding="async" class="trip-map-offline-image" data-map-view-image="${index}" alt="${language === "en" ? (index === 0 ? "Trip overview map" : `Day ${index} map`) : (index === 0 ? "全行程地圖" : `第 ${index} 天地圖`)}"${index ? " hidden" : ""}>`).join("")
    : `<div class="trip-map-loading">${language === "en" ? "Loading real map…" : "正在載入真實地圖…"}</div>`;
  return `<section class="trip-map-shell" data-map-views="${mapViews}" data-map-center="${escapeAttr(JSON.stringify(fallbackCenter(trip.destination)))}" aria-label="${language === "en" ? "Itinerary map" : "行程地圖"}"><div class="trip-map-canvas" data-map-canvas${hasOfflineImages ? " data-map-offline=\"1\"" : ""} role="img" aria-label="${language === "en" ? "Itinerary overview map" : "行程概覽地圖"}">${offlineGallery}</div><span class="map-empty-view" data-map-empty-view hidden>${language === "en" ? "No mapped stops" : "當日無地圖地點"}</span><div class="map-scope-switch" role="group" aria-label="${language === "en" ? "Map scope" : "地圖範圍"}"><button type="button" data-map-scope="all" aria-pressed="false" aria-label="${language === "en" ? "Show all days on map" : "顯示全行程地圖"}">All</button></div>${caption ? `<p class="trip-map-caption" data-map-caption data-map-empty-caption="${emptyCaption}">${caption}</p>` : ""}</section>`;
}
