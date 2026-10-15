import {referenceCategories} from './domain/reference-categories.js';
import { mapGesturesCss, installMapGestures } from "./preview/map-gestures.js";
import { itineraryLayoutCss, installItineraryLayout } from "./preview/itinerary-layout.js";
import { createRuntimeStorage } from "./preview/runtime-storage.js";
import { createMobileTransferTools } from "./domain/mobile-transfer.js";
import { installMobileShare } from "./preview/mobile-share.js";
import { expenseRuntimeScript } from "./preview/expense-runtime.js";
import { googleDirectionsUrl, googlePlaceUrl } from "./map-links.js";
import { itineraryMapHtml } from "./trip-map.js";
import { resolvePreviewTheme } from "./preview/themes.js";
import { previewStyleCss, previewThemeMetaColor, previewExpensePalette, STYLE_ROOT_CLASS } from "./preview/styles/index.js";

const escapeHtml = value => String(value || "").replace(/[&<>'"]/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[char]);
const escAttr = escapeHtml;
const esc = escapeHtml;
function formatDistance(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const match = text.match(/\d+(?:\.\d+)?/);
  return match ? `${Number(match[0])}km` : "";
}
function formatDuration(value) {
  const text = String(value || "").trim();
  if (!text) return "";
  const asClock = hours => {
    const totalMinutes = Math.round(Number(hours) * 60);
    return `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;
  };
  if (/^\d+(?:\.\d+)?$/.test(text)) return asClock(text);
  const clock = text.match(/^(\d{1,2}):(\d{2})$/);
  if (clock) return `${Number(clock[1])}:${clock[2]}`;
  const hours = text.match(/(\d+(?:\.\d+)?)\s*(?:hr|小時)/i);
  const minutes = text.match(/(\d+(?:\.\d+)?)\s*(?:min|分鐘|分)/i);
  if (!hours && !minutes) return "";
  return asClock((hours ? Number(hours[1]) : 0) + (minutes ? Number(minutes[1]) / 60 : 0));
}
function formatLegDuration(value, language) {
  const clock = formatDuration(value);
  const match = clock.match(/^(\d+):(\d{2})$/);
  if (!match) return "";
  const hours = Number(match[1]), minutes = Number(match[2]);
  if (language === "en") return [hours && `${hours} hr`, minutes && `${minutes} min`].filter(Boolean).join(" ") || "0 min";
  return [hours && `${hours}小時`, minutes && `${minutes}分鐘`].filter(Boolean).join("") || "0分鐘";
}
function extractTextLinks(content) {
  const text = String(content || "");
  const links = [];
  const re = /\[([^\]\r\n]+)\]\((https?:\/\/[^\s\)]+)\)|(https?:\/\/[a-z0-9\-._~:/?#\[\]@!$&'()*+,;=%]+)/gi;
  let match;
  while ((match = re.exec(text))) {
    if (match[1] && match[2]) {
      links.push({
        type: "markdown",
        label: match[1],
        url: match[2],
        start: match.index,
        end: match.index + match[0].length
      });
    } else if (match[3]) {
      const cleaned = match[3].replace(/[.,;:!?）)\]】]+$/g, "");
      if (cleaned) {
        links.push({
          type: "raw",
          label: cleaned,
          url: cleaned,
          start: match.index,
          end: match.index + cleaned.length
        });
        re.lastIndex = match.index + cleaned.length;
      }
    }
  }
  return links;
}
function noteTitleHtml(rawTitle, website, language) {
  const fallback = language === "en" ? "Note" : "注意事項";
  const titleText = String(rawTitle || "").trim() || fallback;
  const linkToken = extractTextLinks(titleText)[0];
  let displayName = titleText;
  let href = String(website || "").trim();
  if (linkToken && linkToken.type === "markdown") {
    displayName = linkToken.label;
    href = linkToken.url;
  }
  const heading = `<h3>${escapeHtml(displayName)}</h3>`;
  return href
    ? `<a class="place-title" href="${escAttr(href)}" target="_blank" rel="noopener">${heading}</a>`
    : `<div class="place-title">${heading}</div>`;
}
function referenceTitleHtml(rawName, website, language) {
  const fallback = language === "en" ? "Saved place" : "口袋名單";
  const nameText = String(rawName || "").trim() || fallback;
  const linkToken = extractTextLinks(nameText)[0];
  let displayName = nameText;
  let href = String(website || "").trim();
  if (linkToken && linkToken.type === "markdown") {
    displayName = linkToken.label;
    href = linkToken.url;
  }
  const heading = `<h3>${escapeHtml(displayName)}</h3>`;
  return href
    ? `<a class="place-title" href="${escAttr(href)}" target="_blank" rel="noopener">${heading}</a>`
    : `<div class="place-title">${heading}</div>`;
}
function formatRichText(content) {
  const text = String(content || "");
  if (!text.trim()) return "";
  const links = extractTextLinks(text);
  if (!links.length) {
    return escapeHtml(text).replace(/\r?\n/g, "<br>");
  }
  let html = "", cursor = 0;
  links.forEach(link => {
    if (link.start > cursor) {
      html += escapeHtml(text.slice(cursor, link.start)).replace(/\r?\n/g, "<br>");
    }
    html += `<a class="website" href="${escAttr(link.url)}" target="_blank" rel="noopener">${escapeHtml(link.label)}</a>`;
    cursor = link.end;
  });
  if (cursor < text.length) {
    html += escapeHtml(text.slice(cursor)).replace(/\r?\n/g, "<br>");
  }
  return html;
}
function noteContentHtml(content) {
  const formatted = formatRichText(content);
  return formatted ? `<div class="detail"><p>${formatted}</p></div>` : "";
}
function plainTitle(name, fallback) {
  return `<div class="plain-title"><h3>${escapeHtml(name || fallback)}</h3></div>`;
}
const TRANSPORT_TYPE_TOKENS = ["各站停車", "快速特急", "付費特急", "快速急行", "新快速", "各停", "普通", "快速", "急行", "特急", "準急", "區間", "直通", "rapid", "express", "limited"];
function shortenLine(label) {
  const text = String(label || "").trim();
  let split = -1;
  for (const token of TRANSPORT_TYPE_TOKENS) {
    const position = text.indexOf(token);
    if (position > 0 && (split === -1 || position < split)) split = position;
  }
  return split > 0 ? text.slice(0, split).trim() : text;
}
function getStopTransitEndpointName(stop, language, isDeparture) {
  if (!stop) return "";
  if (stop.kind === "航班") {
    const airports = airportNames(stop, language);
    return (isDeparture ? (airports.arrival || stop.name) : (airports.departure || stop.name)) || "";
  }
  return stop.name || "";
}

const transitIcons = {
  walk: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="13" cy="4" r="1.8"/><path d="m8 21 3.5-5.5-1.5-3.5 3.5-2.5 3 2.5v5"/><path d="m6.5 13.5 3-2"/><path d="m14 13.5 2.5 3"/></svg>`,
  train: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3.1V7a4 4 0 0 0 8 0V3.1"/><rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="m6 19-2 3"/><path d="m18 19 2 3"/></svg>`,
  bus: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 6 2 7"/><path d="M10 6h4"/><path d="m22 7-2-1"/><rect width="16" height="16" x="4" y="3" rx="2"/><path d="M4 11h16"/><path d="M8 15h.01"/><path d="M16 15h.01"/><path d="M6 19v2"/><path d="M18 19v2"/></svg>`,
  ferry: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 21c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1 .6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M19.38 20A11.6 11.6 0 0 0 21 14l-9-4-9 4c0 2.9.94 5.34 2.81 7.76"/><path d="M19 13V7a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v6"/><path d="M12 10v4"/><path d="M12 2v3"/></svg>`,
  car: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 11.2 2 11.6 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`,
  originPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3" fill="currentColor"/></svg>`,
  destPin: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-3.4-3.4-6-6.5-6-10a6 6 0 0 1 12 0c0 3.5-2.6 6.6-6 10Z"/><circle cx="12" cy="10.4" r="2.2"/></svg>`,
  flight: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z"/></svg>`
};

function transitPlanHtml(stop, nextStop, language) {
  const plan = stop.nextLeg?.transit;
  const steps = Array.isArray(plan?.steps) ? plan.steps : [];
  if (!steps.length) return "";

  let fromName = getStopTransitEndpointName(stop, language, true);
  let toName = getStopTransitEndpointName(nextStop, language, false);
  if ((!fromName || !toName) && stop.nextLeg?.lastRouteLookup) {
    const parts = String(stop.nextLeg.lastRouteLookup).split("|");
    if (!fromName && parts[0]) fromName = parts[0].split(",")[0].trim();
    if (!toName && parts[1]) toName = parts[1].split(",")[0].trim();
  }

  const routeTitle = (fromName && toName)
    ? `${fromName} → ${toName}`
    : (language === "en" ? "Transit Route Details" : "詳細乘車路線");

  const timeText = minutes => minutes ? `${minutes}${language === "en" ? "min" : "分"}` : "";
  const walkDistance = metres => metres ? `·${metres}${language === "en" ? "m" : "公尺"}` : "";
  const stepParts = steps.map((step, index) => {
    const text = step.kind === "walk"
      ? `${language === "en" ? "Walk" : "步行"}${timeText(step.durationMin)}${walkDistance(step.distanceM)}`.trim()
      : `${shortenLine(step.line)} ${timeText(step.durationMin)}${step.stops ? `(${step.stops}${language === "en" ? " stops" : "站"})` : ""}`.trim();
    const prefix = index === 0 ? "" : "→ ";
    return `<span class="leg-step">${prefix}${escapeHtml(text)}</span>`;
  });
  const stepsMarkup = stepParts.join("");

  const richStepsMarkup = steps.map(step => {
    const isWalk = step.kind === "walk";
    let icon = transitIcons.train;
    if (isWalk) {
      icon = transitIcons.walk;
    } else if (step.line && (step.line.includes("巴士") || step.line.includes("公車") || step.line.includes("Bus") || step.line.includes("bus"))) {
      icon = transitIcons.bus;
    } else if (step.line && (step.line.includes("船") || step.line.includes("棧橋") || step.line.includes("航線") || step.line.includes("Ferry") || step.line.includes("ferry"))) {
      icon = transitIcons.ferry;
    }
    const duration = step.durationMin ? `${step.durationMin} ${language === "en" ? "min" : "分"}` : "";
    const extra = isWalk
      ? (step.distanceM ? `${step.distanceM}${language === "en" ? "m" : "公尺"}` : "")
      : (step.stops ? `${step.stops}${language === "en" ? " stops" : "站"}` : "");
    const title = isWalk
      ? (language === "en" ? "Walk" : "步行")
      : escapeHtml(step.line || (language === "en" ? "Transit" : "大眾運輸"));
    return `<div class="transit-modal-step${isWalk ? " is-walk" : ""}">
      <div class="tstep-left">
        <span class="tstep-icon">${icon}</span>
        <div class="tstep-info">
          <span class="tstep-title">${title}</span>
          ${extra ? `<span class="tstep-extra">${escapeHtml(extra)}</span>` : ""}
        </div>
      </div>
      ${duration ? `<span class="tstep-duration">${escapeHtml(duration)}</span>` : ""}
    </div>`;
  }).join("");

  const total = formatLegDuration(stop.nextLeg?.duration, language);
  const fare = plan.fare ? `<span class="leg-rest"><span class="leg-sep"> | </span>${escapeHtml(plan.fare)}</span>` : "";
  const label = language === "en" ? "route details" : "詳細路線";

  const originEndpointHtml = fromName ? `
    <div class="transit-endpoint origin">
      <span class="endpoint-icon">${stop.kind === "航班" ? transitIcons.flight : transitIcons.originPin}</span>
      <span class="endpoint-badge">${language === "en" ? "From" : "出發地"}</span>
      <strong class="endpoint-name">${escapeHtml(fromName)}</strong>
    </div>` : "";

  const destEndpointHtml = toName ? `
    <div class="transit-endpoint destination">
      <span class="endpoint-icon">${nextStop?.kind === "航班" ? transitIcons.flight : transitIcons.destPin}</span>
      <span class="endpoint-badge">${language === "en" ? "To" : "目的地"}</span>
      <strong class="endpoint-name">${escapeHtml(toName)}</strong>
    </div>` : "";

  const routeText = [total, stepsMarkup.replace(/<[^>]*>/g, " "), plan.fare].join(" ");
  const routeWidth = Math.min(1200, Math.max(200, [...routeText].reduce((width, char) => width + (/[^\x00-\x7f]/.test(char) ? 12 : 7), 115)));
  const routeClass = "route-width-" + routeWidth;
  return `<span class="leg-rest"><span class="leg-sep"> | </span>${escapeHtml(total)}<span class="leg-sep"> | </span></span><style>@media(max-width:${routeWidth > 570 ? 100000 : routeWidth + 110}px){.leg-plan.${routeClass}{display:none}.leg-detail-trigger.${routeClass}{display:inline}}</style><span class="leg-plan ${routeClass}">${stepsMarkup}</span><button type="button" class="leg-detail-trigger ${routeClass}" title="${escapeHtml(routeTitle)}" aria-label="${escapeHtml(routeTitle)}">${label}</button>${fare}<div class="transit-modal" role="dialog" aria-modal="true" aria-label="${escapeHtml(routeTitle)}"><div class="transit-modal-sheet"><div class="transit-modal-header"><div class="transit-modal-title"><span class="transit-modal-icon">${transitIcons.train}</span><div class="transit-title-wrap"><h3>${escapeHtml(routeTitle)}</h3><span class="transit-modal-subtitle">${language === "en" ? "Transit Route Details" : "大眾運輸詳細路線"}</span></div></div><div class="transit-modal-meta-stack">${total ? `<span class="transit-meta-tag"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${escapeHtml(total)}</span>` : ""}${plan.fare ? `<span class="transit-meta-tag fare"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>${escapeHtml(plan.fare)}</span>` : ""}</div><button type="button" class="transit-modal-close" aria-label="${language === "en" ? "Close" : "關閉"}">✕</button></div><div class="transit-modal-body"><div class="transit-steps-flow">${originEndpointHtml}${richStepsMarkup}${destEndpointHtml}</div></div><button type="button" class="transit-modal-btn-close">${language === "en" ? "Close" : "關閉"}</button></div></div>`;
}
const flightCss = "[hidden]{display:none!important}.leg{display:inline-flex;flex-wrap:wrap;align-items:center;row-gap:2px;column-gap:4px;max-width:calc(100% - 10px);box-sizing:border-box;position:relative;z-index:2}.leg .leg-icon,.flight-middle .leg-icon{display:none}.leg .leg-mode{white-space:nowrap;flex-shrink:0}.leg .leg-rest{white-space:normal;overflow-wrap:anywhere;word-break:break-word}.leg-sep{white-space:pre-wrap;opacity:0.6}.leg-plan{flex:1 1 auto;min-width:0;color:#b54a14;white-space:normal;overflow-wrap:anywhere}.leg-step{display:inline;white-space:normal}.leg-expense{background:transparent!important;color:#352b23!important}.leg-detail-trigger{display:none;border:0;background:none;padding:0;font:inherit;cursor:pointer;color:#1859a9;text-decoration:underline;font-size:12px;white-space:nowrap}.transit-modal{display:none;position:fixed;inset:0;z-index:200;background:rgba(0,0,0,0.52);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);align-items:center;justify-content:center;padding:16px;box-sizing:border-box}.transit-modal.active{display:flex}.transit-modal-sheet{background:#fff;border-radius:18px;padding:15px 15px 13px;width:100%;max-width:380px;max-height:82vh;overflow-y:auto;box-shadow:0 16px 40px rgba(0,0,0,0.28);border:1px solid #e7d7c7;display:flex;flex-direction:column;gap:9px;box-sizing:border-box;animation:sheetFloatUp .2s cubic-bezier(0.16,1,0.3,1)}.transit-modal-header{display:flex;justify-content:space-between;align-items:center;gap:8px;padding-bottom:8px;border-bottom:1px solid #eee0d3}.transit-modal-title{display:flex;align-items:center;gap:7px;min-width:0;flex:1}.transit-modal-icon{display:flex;align-items:center;justify-content:center;color:#b54a14;flex-shrink:0;width:20px;height:20px}.transit-modal-icon svg{display:block}.transit-title-wrap{display:flex;flex-direction:column;min-width:0;flex:1}.transit-title-wrap h3{margin:0;font-size:14px;font-weight:750;color:#352b23;line-height:1.25;overflow-wrap:anywhere}.transit-modal-subtitle{font-size:10.5px;font-weight:600;color:#8a6a52;margin-top:1px}.transit-modal-meta-stack{display:flex;flex-direction:column;align-items:flex-end;gap:3px;flex-shrink:0;margin-left:auto}.transit-meta-tag{display:inline-flex;align-items:center;gap:4px;font-size:10.5px;font-weight:650;color:#554333;background:#faf6f0;border:1px solid #e7d7c7;border-radius:5px;padding:2px 6px;line-height:1.2;white-space:nowrap}.transit-meta-tag svg{flex-shrink:0;display:block}.transit-meta-tag.fare{color:#b54a14;background:#fef3c7;border-color:#fde68a}.transit-modal-close{border:none;background:#f5ebe1;width:28px;height:28px;border-radius:50%;display:grid;place-items:center;color:#7b6754;font-size:13px;font-weight:700;cursor:pointer;flex-shrink:0;transition:all .15s ease}.transit-modal-close:hover{background:#ecdccf;color:#352b23}.transit-steps-flow{display:flex;flex-direction:column;gap:5px}.transit-endpoint{display:flex;align-items:center;gap:8px;background:#fff;border:1.5px solid #e7d7c7;border-radius:10px;padding:5px 10px;min-height:34px;box-sizing:border-box}.transit-endpoint.origin{border-color:#d97706;background:#fefbf6}.transit-endpoint.origin .endpoint-icon{color:#d97706}.transit-endpoint.destination{border-color:#b54a14;background:#fff9f5}.transit-endpoint.destination .endpoint-icon{color:#b54a14}.endpoint-icon{display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;line-height:1}.endpoint-icon svg{display:block}.endpoint-badge{font-size:10px;font-weight:700;line-height:1;padding:2px 5px;border-radius:4px;background:#f5ebe1;color:#8a5a33;flex-shrink:0}.transit-endpoint.origin .endpoint-badge{background:#fef3c7;color:#b45309}.transit-endpoint.destination .endpoint-badge{background:#fee2e2;color:#b54a14}.endpoint-name{font-size:12.5px;font-weight:750;color:#352b23;line-height:1.25;flex:1;min-width:0;overflow-wrap:anywhere}.transit-modal-step{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border:1px solid #eee0d3;border-radius:10px;padding:5px 10px;min-height:34px;box-sizing:border-box}.transit-modal-step.is-walk{background:#faf6f0;border-color:#f0e4d7}.tstep-left{display:flex;align-items:center;gap:8px;flex:1;min-width:0}.tstep-icon{display:flex;align-items:center;justify-content:center;width:18px;height:18px;flex-shrink:0;line-height:1;color:#b54a14}.tstep-icon svg{display:block}.transit-modal-step.is-walk .tstep-icon{color:#8a6a52}.tstep-info{display:flex;align-items:baseline;gap:5px;flex:1;min-width:0;flex-wrap:wrap}.tstep-title{font-size:12px;font-weight:700;color:#352b23;line-height:1.3;overflow-wrap:anywhere}.transit-modal-step.is-walk .tstep-title{color:#554333;font-weight:600}.tstep-extra{font-size:11px;font-weight:550;color:#8a6a52;white-space:nowrap}.tstep-duration{font-size:11px;font-weight:700;color:#b54a14;background:#fce4ce;padding:2px 6px;border-radius:5px;white-space:nowrap;flex-shrink:0;line-height:1.2}.transit-modal-step.is-walk .tstep-duration{background:#f3eae1;color:#7b6754;font-weight:600}.transit-modal-btn-close{width:100%;padding:8px;background:#f5ebe1;border:1px solid #dec5ae;border-radius:10px;font-size:13px;font-weight:650;color:#7b6754;cursor:pointer;margin-top:2px;transition:all .15s ease}.transit-modal-btn-close:hover{background:#ecdccf;color:#352b23}.transit-modal-btn-close:active{transform:scale(0.98)}.transit-modal-body .leg-step{display:block;white-space:normal;padding:6px 0}.flight-stop{position:relative;z-index:2;padding-top:8px}.flight-line{position:relative;z-index:3;display:grid;grid-template-columns:28px 1fr;gap:10px;align-items:center;min-height:28px}.flight-airport{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-width:0}.flight-airport span{font-size:15px;font-weight:500}.flight-airport time{font-size:13px;color:#746354;white-space:nowrap}.flight-middle{position:relative;z-index:2;display:inline-flex;flex-wrap:wrap;align-items:center;row-gap:2px;column-gap:4px;max-width:calc(100% - 10px);box-sizing:border-box;margin:3px 0 5px 0;padding:2px 0 4px 38px;color:var(--flight-text,var(--accent,#b54a14));background:#faf6f0;border:0;font-size:12px;text-decoration:none;min-height:0}.flight-middle::before{content:\"\";position:absolute;left:var(--flight-line-left,12px);top:-18px;bottom:-18px;width:var(--flight-line-width,2px);background:var(--flight-line-color,var(--timeline-line,#e5bc98));border-left:var(--flight-line-border,none);z-index:1}.flight-middle a{color:var(--link,#1859a9);text-decoration:underline;white-space:nowrap;flex-shrink:0}.flight-middle span,.flight-middle .flight-duration{font-weight:400;color:var(--flight-text,var(--accent,#b54a14));text-decoration:none;white-space:normal;overflow-wrap:anywhere}.flight-middle .leg-icon{display:none}.flight-middle .flight-duration{white-space:normal}.flight-detail{margin-left:38px}.hero .lang-toggle{display:none}#mobile-content{position:relative}.static-lang-input{position:absolute;opacity:0;pointer-events:none}.static-language{display:inline-flex;border:1px solid #d7b99f;border-radius:7px;overflow:hidden;background:#fff}.static-language label{padding:4px 10px;border-right:1px solid #ead8c9;color:#775e48;font:600 11px system-ui;line-height:1.1;cursor:pointer;user-select:none}.static-language label:last-child{border-right:0}.lang-content-en{display:none}.wrap:has(#static-lang-zh:checked) .static-language label[for=static-lang-zh],.wrap:has(#static-lang-en:checked) .static-language label[for=static-lang-en]{background:#b54a14;color:#fff}.wrap:has(#static-lang-en:checked) .static-content .lang-content-zh{display:none}.wrap:has(#static-lang-en:checked) .static-content .lang-content-en{display:block}.plain-title{display:flex;align-items:center;gap:6px;color:#352b23;min-width:0}.plain-title h3{font-size:15px;font-weight:500;margin:0;overflow-wrap:anywhere}.note-body{font-size:13px;color:#655343;margin:6px 0 0;line-height:1.55;overflow-wrap:anywhere}.note-body .link-chip,.link-chip{display:inline-flex;align-items:baseline;gap:4px;color:#1859a9;text-decoration:underline;overflow-wrap:anywhere}.ref-group{margin:0 0 12px}.ref-group-title{font-size:13px;color:#8a5a33;font-weight:700;margin:2px 6px 2px 0}";
const typeIcon = kind => ({ "景點": "📍", "餐廳": "🍽️", "住宿": "🏨", "航班": "✈️", "其他": "📌", "交通": "🚆", "機場": "🛫" }[kind] || "");

function stopDetails(stop, language = "zh") {
  const values = [];
  const labels = language === "en" ? { checkIn: "Check-in", checkOut: "Check-out", departure: "Depart", arrival: "Arrive" } : { checkIn: "Check-in", checkOut: "Check-out", departure: "起飛", arrival: "抵達" };
  if (stop.kind === "住宿") values.push([stop.checkIn && `${labels.checkIn} ${stop.checkIn}`, stop.checkOut && `${labels.checkOut} ${stop.checkOut}`].filter(Boolean).join(" · "));
  else if (stop.kind === "航班") values.push(stop.flightNumber || stop.name, (stop.departureTime || stop.time) && `${labels.departure} ${stop.departureTime || stop.time}`, stop.arrivalTime && `${labels.arrival} ${stop.arrivalTime}`, stop.departureTerminal && `${labels.departure} ${stop.departureTerminal}`, stop.arrivalTerminal && `${labels.arrival} ${stop.arrivalTerminal}`);
  else values.push(
    (stop.openTime && stop.closeTime)
      ? `${language === "en" ? "Hours: " : "營業時間："}${stop.openTime}–${stop.closeTime}`
      : (stop.openTime || stop.closeTime) && [`${language === "en" ? "Open" : "開門"} ${stop.openTime}`, `${language === "en" ? "Close" : "關門"} ${stop.closeTime}`].filter(Boolean).join(" · "),
    stop.hours ? (stop.hours.startsWith("營業時間") || stop.hours.startsWith("Hours") ? stop.hours : `${language === "en" ? "Hours: " : "營業時間："}${stop.hours}`) : "",
  );
  values.push(stop.offlineNote);
  return values.filter(Boolean).map(value => `<p>${formatRichText(value)}</p>`).join("");
}

function flightDuration(stop) {
  if (stop.flightDuration) return formatDuration(stop.flightDuration);
  const start = stop.departureTime || stop.time, end = stop.arrivalTime;
  if (!start || !end || !/^\d{1,2}:\d{2}$/.test(start) || !/^\d{1,2}:\d{2}$/.test(end)) return "";
  const toMinutes = value => { const [hours, minutes] = value.split(":").map(Number); return hours * 60 + minutes; };
  let minutes = toMinutes(end) - toMinutes(start); if (minutes < 0) minutes += 24 * 60;
  return `${Number((minutes / 60).toFixed(2))}hr`;
}

function airportNames(stop, language = "zh") {
  const parts = (stop.address || "").split(/\s*(?:→|->|至)\s*/);
  const departure = language === "zh" ? (stop.departureAirportZh || stop.departureAirport) : stop.departureAirport;
  const arrival = language === "zh" ? (stop.arrivalAirportZh || stop.arrivalAirport) : stop.arrivalAirport;
  return { departure: departure || parts[0] || "出發機場", arrival: arrival || parts[1] || "抵達機場" };
}

function legModeIcon(mode) {
  if (!mode) return "";
  if (mode.includes("車") || mode === "開車" || mode === "自駕") return "🚗";
  if (mode.includes("步") || mode === "步行") return "🚶";
  if (mode.includes("大眾") || mode.includes("鐵") || mode.includes("公車") || mode.includes("捷運") || mode.includes("地鐵")) return "🚆";
  if (mode.includes("飛機") || mode === "航班") return "✈️";
  if (mode.includes("機車") || mode.includes("摩托")) return "🛵";
  if (mode.includes("船")) return "🚢";
  return "➔";
}

function dayHtml(day, context, language, index) {
  const visibleStops = day.stops.filter(stop => String(stop.name || "").trim());
  const groundStops = visibleStops.filter(stop => stop.kind !== "航班");
  const route = groundStops.length > 1 && groundStops.length === visibleStops.length ? googleDirectionsUrl(groundStops, context) : "";
  const mapFallback = groundStops[0] || visibleStops[0];
  const mapHref = route || (mapFallback ? googlePlaceUrl(mapFallback, context) : "");
  let sequence = 0;
  const stops = visibleStops.map((stop, index) => {
    const nextStop = visibleStops[index + 1];
    const mode = stop.nextLeg?.mode || "";
    const iconChar = legModeIcon(mode);
    const iconSpan = iconChar ? `<span class="leg-icon">${iconChar}</span>` : "";
    const modeLabel = mode || (language === "en" ? "Next stop" : "前往下一站");
    const legRest = [formatLegDuration(stop.nextLeg?.duration, language), formatDistance(stop.nextLeg?.distance)].filter(Boolean).join(" | ");
    const legMap = nextStop ? googleDirectionsUrl([stop, nextStop], context) : "";
    const modeHtml = legMap ? `<a class="leg-mode" href="${escAttr(legMap)}" target="_blank" rel="noopener">${iconSpan}${escapeHtml(modeLabel)}</a>` : `<span class="leg-mode" title="${language === "en" ? "Enter the previous and next place names to open directions" : "填入前後地點名稱後即可開啟路線"}">${iconSpan}${escapeHtml(modeLabel)}</span>`;
    const transitHtml = stop.nextLeg?.mode === "大眾運輸" ? transitPlanHtml(stop, nextStop, language) : "";
    const legInner = modeHtml + (transitHtml || (legRest ? `<span class="leg-rest"><span class="leg-sep"> | </span>${escapeHtml(legRest)}</span>` : ""));
    const leg = nextStop ? `<div class="leg" data-mode="${escAttr(mode)}">${legInner}</div>` : "";
    const isStopPdf = stop.image?.mimeType === "application/pdf" || (typeof stop.image?.dataUrl === "string" && stop.image.dataUrl.startsWith("data:application/pdf"));
    const stopPreviewSrc = stop.image?.preview || (!isStopPdf ? stop.image?.dataUrl : (stop.image?.thumbnail || stop.image?.dataUrl));
    const attachImageSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
    const attachPdfSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`;
    const stopAttachBadge = stop.image?.dataUrl
      ? `<button type="button" class="stop-attach-btn ${isStopPdf ? "stop-attach-pdf" : "stop-attach-img"}" data-lightbox-src="${escAttr(stopPreviewSrc)}" data-lightbox-alt="${escAttr(stop.image.name || stop.name || (isStopPdf ? "文件" : "圖片"))}" aria-label="${language === "en" ? (isStopPdf ? "View document" : "View photo") : (isStopPdf ? "查看文件" : "查看照片")}">${isStopPdf ? attachPdfSvg : attachImageSvg}</button>`
      : "";
    const map = googlePlaceUrl(stop, context);
    const name = `<h3>${escapeHtml(stop.name || "未命名地點")}</h3>`;
    const title = map ? `<a class="place-title" href="${escAttr(map)}" target="_blank" rel="noopener">${name}</a>` : `<div class="place-title">${name}</div>`;
    const detail = stop.kind === "航班" ? (stop.offlineNote ? `<p>${formatRichText(stop.offlineNote)}</p>` : "") : stopDetails(stop, language);
    if (stop.kind === "航班") {
      const airports = airportNames(stop, language), duration = flightDuration(stop), code = stop.flightNumber || stop.name;
      const departureNumber = ++sequence, arrivalNumber = ++sequence;
      const flightCode = stop.flightSourceUrl ? `<a href="${escapeHtml(stop.flightSourceUrl)}" target="_blank" rel="noopener">${escapeHtml(code || "航班號")}</a>` : escapeHtml(code || "航班號");
      const flightInfo = `<span class="leg-icon">✈️</span>${flightCode}${duration ? `<span class="flight-duration"> | ${escapeHtml(duration)}</span>` : ""}`;
      const departureLabel = [airports.departure, stop.departureTerminal].filter(Boolean).join(" ");
      const arrivalLabel = [airports.arrival, stop.arrivalTerminal].filter(Boolean).join(" ");
      const flight = `<article class="flight-stop" id="preview-stop-${escapeHtml(stop.id)}"><div class="flight-line"><div class="flight-number">${departureNumber}</div><div class="flight-airport"><span>${escapeHtml(departureLabel)}</span><time>${escapeHtml(stop.departureTime || stop.time)}</time></div></div><div class="flight-middle">${flightInfo}${stopAttachBadge}</div><div class="flight-line"><div class="flight-number">${arrivalNumber}</div><div class="flight-airport"><span>${escapeHtml(arrivalLabel)}</span><time>${escapeHtml(stop.arrivalTime)}</time></div></div>${detail ? `<div class="detail flight-detail">${detail}</div>` : ""}</article>`;
      return `<div class="timeline-step">${flight}${leg}</div>`;
    }
    sequence += 1;
    const displayTime = [stop.time, stop.endTime].filter(Boolean).join(" - ");
    const timeHtml = stop.time && stop.endTime
      ? `<time><span class="time-start">${escapeHtml(stop.time)}</span><span class="time-sep"> - </span><span class="time-end">${escapeHtml(stop.endTime)}</span></time>`
      : (displayTime ? `<time>${escapeHtml(displayTime)}</time>` : "");
    return `<div class="timeline-step"><article class="stop" id="preview-stop-${escapeHtml(stop.id)}"><div class="marker">${sequence}</div><div class="stop-main"><div class="stop-top"><div class="place-title-wrap">${title}${stopAttachBadge}</div>${timeHtml}</div>${detail ? `<div class="detail">${detail}</div>` : ""}</div></article>${leg}</div>`;
  }).join("");
  const mapTitle = language === "en" ? (route ? "Open route" : "Open map") : (route ? "開啟今日路線" : "開啟地圖");
  const routeButton = mapHref ? `<a class="day-action day-map" aria-label="${mapTitle}" title="${mapTitle}" href="${escAttr(mapHref)}" target="_blank" rel="noopener"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21c-3.4-3.4-6-6.5-6-10a6 6 0 0 1 12 0c0 3.5-2.6 6.6-6 10Z"/><circle cx="12" cy="10.4" r="2.2"/></svg></a>` : "";
  return `<section class="day" id="day-${index + 1}-${language}"><div class="day-head" data-day-index="${String(index + 1).padStart(2, "0")}"><div><span>${escapeHtml(day.date || (language === "en" ? "Undated" : "未定日期"))}</span><h2>${escapeHtml(day.title || (language === "en" ? "Daily itinerary" : "每日行程"))}</h2></div>${routeButton ? `<div class="day-actions">${routeButton}</div>` : ""}</div>${stops || `<p class=empty>${language === "en" ? "No places yet" : "尚未加入地點"}</p>`}</section>`;
}

function formatDayNavPill(dateStr, index) {
  const dNum = `D${index + 1}`;
  if (!dateStr) return `<span class="day-tab-num">${dNum}</span>`;
  const parts = dateStr.split("-");
  if (parts.length >= 3) {
    const mmdd = `${Number(parts[1])}/${Number(parts[2])}`;
    return `<span class="day-tab-num">${dNum}</span><span class="day-tab-date">${mmdd}</span>`;
  }
  return `<span class="day-tab-num">${dNum}</span>`;
}

function getWeekdayLabel(dateStr, language = "zh") {
  if (!dateStr) return "";
  try {
    const d = new Date(dateStr + "T00:00:00");
    if (isNaN(d.getTime())) return "";
    const zhDays = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];
    const enDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return language === "en" ? enDays[d.getDay()] : zhDays[d.getDay()];
  } catch { return ""; }
}

function getAirportIata(name) {
  if (!name) return "AIR";
  const m = name.match(/\(([A-Z]{3})\)/);
  if (m) return m[1];
  const m2 = name.match(/\b([A-Z]{3})\b/);
  if (m2) return m2[1];
  return name.trim().slice(0, 3).toUpperCase();
}

export function buildMobileHtml(trip, mapAssets = {}) {
  const showMap = trip.settings?.showMap !== false;
  const offlineMapImages = showMap && Array.isArray(mapAssets.offlineMapImages) ? mapAssets.offlineMapImages : [];
  const hasOfflineMapImages = offlineMapImages.length === trip.days.length + 1 && offlineMapImages.every(image => typeof image === "string" && (/^data:image\/(?:webp|png);base64,[A-Za-z0-9+/]+=*$/.test(image) || (mapAssets.sharedPwa && /^\.\/maps\/[a-f0-9]{64}\.(?:png|webp)$/.test(image))));
  // Place heavy image payloads AFTER interactive initialization. Day 1 arrives first;
  // each image becomes available independently without resetting the current page.
  const imageOrder = offlineMapImages.map((_, index) => index);
  if (imageOrder.length > 1) imageOrder.unshift(imageOrder.splice(1, 1)[0]);
  const offlineMapImagesScript = hasOfflineMapImages ? imageOrder.map(index => `<script data-offline-map-payload="${index}">window.__travelOfflineMapImages ||= [];window.__travelOfflineMapImages[${index}]=${JSON.stringify(offlineMapImages[index])};window.dispatchEvent(new Event("travel-offline-map-ready"));</script>`).join("") : "";
  const mapLibreCss = String(mapAssets.css || "");
  const mapLibreJs = String(mapAssets.js || "").replace(/<\/script/gi, "<\\/script");
  const mapLibreCssTag = !showMap || hasOfflineMapImages ? "" : mapLibreCss ? `<style>${mapLibreCss}</style>` : `<link rel="stylesheet" href="${escapeHtml(mapAssets.cssHref || "/js/vendor/maplibre-gl.css")}">`;
  const mapLibreJsTag = !showMap || hasOfflineMapImages ? "" : mapLibreJs ? `<script>${mapLibreJs}</script>` : `<script src="${escapeHtml(mapAssets.jsSrc || "/js/vendor/maplibre-gl.js")}"></script>`;
  const mapWorkerRegisterTag = !showMap || hasOfflineMapImages ? "" : `<script>window.__travelMapSwReady ||= ("serviceWorker" in navigator ? navigator.serviceWorker.register("./sw.js").then(()=>navigator.serviceWorker.ready).then(()=>new Promise(resolve=>{if(navigator.serviceWorker.controller)return resolve(true);navigator.serviceWorker.addEventListener("controllerchange",()=>resolve(true),{once:true})})).catch(()=>false) : Promise.resolve(false));</script>`;
  // Retired identifiers (apple / magazine / sketch / collage / dashboard / modern)
  // still resolve, so projects saved before this list existed keep opening.
  const theme = resolvePreviewTheme(trip.previewTheme || trip.previewNavigation);
  const style = previewStyleCss(theme);

  const attachImageSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="18" height="18" x="3" y="3" rx="2.5"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
  const attachPdfSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>`;

  const renderContent = language => (trip.days.map((day, index) => dayHtml(day, trip.destination, language, index)).join("") || `<p class=empty>${language === "en" ? "No itinerary yet." : "尚未建立行程。"}</p>`);
  const notesHtml = language => (trip.notes || []).length ? `<section class="day active notes-day-card" id="notes-card-${language}"><div class="notes-card-inner">${trip.notes.map(note => {
    const title = noteTitleHtml(note.title, note.website, language);
    const body = noteContentHtml(note.content);
    const extra = note.website && !body.includes(note.website) ? `<div class="detail"><a class="website" href="${escAttr(note.website)}" target="_blank" rel="noopener">${escapeHtml(note.website)}</a></div>` : "";
    const isPdf = note.image?.mimeType === "application/pdf" || (typeof note.image?.dataUrl === "string" && note.image.dataUrl.startsWith("data:application/pdf"));
    const previewSrc = note.image?.preview || (!isPdf ? note.image?.dataUrl : (note.image?.thumbnail || note.image?.dataUrl));
    const attachBadge = note.image?.dataUrl
      ? `<button type="button" class="stop-attach-btn ${isPdf ? "stop-attach-pdf" : "stop-attach-img"}" data-lightbox-src="${escAttr(previewSrc)}" data-lightbox-alt="${escAttr(note.image.name || note.title || (isPdf ? "文件" : "圖片"))}" aria-label="${language === "en" ? (isPdf ? "View document" : "View photo") : (isPdf ? "查看文件" : "查看照片")}">${isPdf ? attachPdfSvg : attachImageSvg}</button>`
      : "";
    return `<article class="stop note-stop" data-shared-note="${escAttr(note.id)}"><div class="marker note-marker-icon">!</div><div class="note-stop-content"><div class="note-stop-text"><div class="stop-top"><div class="place-title-wrap">${title}${attachBadge}</div></div>${body}${extra}</div></div></article>`; }).join("")}</div></section>` : "";
  const referencesHtml = language => {
    const categories = referenceCategories(trip.references || []);
    const renderRefItems = list => list.map(item => {
      const title = referenceTitleHtml(item.name, item.website, language);
      const noteHtml = item.note ? `<div class="detail"><p>${formatRichText(item.note)}</p></div>` : "";
      const isPdf = item.image?.mimeType === 'application/pdf' || item.image?.dataUrl?.startsWith('data:application/pdf');
      const src = item.image?.preview || (!isPdf ? item.image?.dataUrl : (item.image?.thumbnail || item.image?.dataUrl));
      const attachment = item.image?.dataUrl
        ? `<button type="button" class="stop-attach-btn ${isPdf ? "stop-attach-pdf" : "stop-attach-img"}" data-lightbox-src="${escAttr(src)}" data-lightbox-alt="${escAttr(item.image?.name || item.name || (isPdf ? "文件" : "圖片"))}" aria-label="${language === "en" ? (isPdf ? "View document" : "View photo") : (isPdf ? "查看文件" : "查看照片")}">${isPdf ? attachPdfSvg : attachImageSvg}</button>`
        : "";
      const checked = Boolean(item.checked);
      const starAria = language === "en" ? (checked ? "Mark unvisited" : "Mark visited") : (checked ? "標記為未造訪" : "標記為已造訪");
      return `<article class="stop" data-shared-reference="${escAttr(item.id)}"><button type="button" class="marker ref-star-btn${checked ? " is-starred" : ""}" data-ref-star="${escAttr(item.id)}" aria-label="${starAria}">${checked ? "★" : "☆"}</button><div><div class="stop-top"><div class="place-title-wrap">${title}${attachment}</div></div>${noteHtml}</div></article>`;
    }).join("") || `<p class="empty">${language === "en" ? "No items yet" : "尚無地點"}</p>`;

    return `<div class="ref-cards-wrap">${categories.map(category => `<section class="day" id="${category.id}-${language}"><div class="day-head head-badge-row"><h2>${escapeHtml(language === 'en' ? ({'景點':'Attractions','美食':'Food & Dining','購物':'Shopping'}[category.label] || category.label) : category.label)}</h2><span class="count-badge">${category.rows.length}</span></div>${renderRefItems(category.rows)}</section>`).join('') || `<section class="day"><p class="empty">${language === 'en' ? 'No saved places yet' : '尚無口袋名單'}</p></section>`}</div>`;
  };

  const packingHtml = language => {
    const groups = trip.packingGroups || [];
    if (!groups.length) {
      return `<section class="day"><div class="day-head head-badge-row"><h2>${language === "en" ? "Checklist" : "行前準備"}</h2><span class="count-badge">0</span></div><p class="empty">${language === "en" ? "No checklist items" : "尚無清單"}</p></section>`;
    }
    return `<div class="packing-cards-wrap">${groups.map((group, gIdx) => {
      const items = group.items || [];
      const title = group.title || (language === "en" ? "List" : "清單");
      const id = `pack-group-${gIdx + 1}-${language}`;
      return `<section class="day" id="${id}">
        <div class="day-head head-badge-row">
          <h2>${escapeHtml(title)}</h2>
          <span class="count-badge pack-group-badge" data-group-badge="${gIdx + 1}">0/${items.length}</span>
        </div>
        <div class="pack-items">${items.map(item => `
          <label class="pack-item">
            <input type="checkbox" data-pack-id="${escAttr(item.id || item.text)}" data-group-idx="${gIdx + 1}">
            <span>${escapeHtml(item.text)}${item.quantity > 1 ? ` × ${item.quantity}` : ""}</span>
          </label>
        `).join("") || `<p class="empty">${language === "en" ? "No items" : "尚無項目"}</p>`}
        </div>
      </section>`;
    }).join("")}</div>`;
  };
  const homeCurrency = String(trip.settings?.homeCurrency || "TWD").toUpperCase();
  const destinationCurrency = String(trip.settings?.destinationCurrency || homeCurrency).toUpperCase();
  const currencyRates = {};
  (trip.settings?.currencyRates || []).forEach(row => { if (row && row.code) currencyRates[String(row.code).toUpperCase()] = Number(row.rate) || 0; });
  
  // Order: 100% follow left-side currencyRates order (no forced TWD)
  const distinctCurrencies = [];
  (trip.settings?.currencyRates || []).forEach(row => {
    const c = String(row?.code || "").trim().toUpperCase();
    if (c && !distinctCurrencies.includes(c)) distinctCurrencies.push(c);
  });
  if (!distinctCurrencies.length) {
    const fallback = destinationCurrency || homeCurrency || "TWD";
    distinctCurrencies.push(fallback);
  }

  const formatExpenseDayOption = (day, idx, lang) => {
    let dateStr = "";
    if (day.date) {
      const p = day.date.split("-");
      dateStr = p.length >= 3 ? ` (${Number(p[1])}/${Number(p[2])})` : ` (${day.date})`;
    }
    const dayLabel = lang === "en" ? `Day ${idx + 1}` : `第 ${idx + 1} 天`;
    const titleStr = day.title ? ` · ${day.title}` : "";
    return `${dayLabel}${dateStr}${titleStr}`;
  };

  const expenseCategories = Array.isArray(trip.settings?.expenseCategories) && trip.settings.expenseCategories.length
    ? trip.settings.expenseCategories
    : ["食物", "交通", "住宿", "門票", "購物", "其他"];
  const rawMembers = (trip.settings && Array.isArray(trip.settings.travelers)) ? trip.settings.travelers : (trip.members || []);
  const membersActive = rawMembers.map((m, idx) => typeof m === "string" ? { id: `m_${idx}`, name: m } : { id: m.id || `m_${idx}`, name: m.name || "" }).filter(m => m.name);

  const expenseModalHtml = language => {
    const defaultPayer = membersActive[0]?.name || "";
    const dayOptions = [
      `<option value="day-0">${language === "en" ? "Day 0 · Before trip" : "Day 0 · 行前支出"}</option>`,
      ...trip.days.map((day, idx) => `<option value="${escAttr(day.id)}">${esc(formatExpenseDayOption(day, idx, language))}</option>`)
    ].join("");

    return `<section class="expense-modal" id="global-expense-modal" role="dialog" aria-modal="true" aria-label="${language === "en" ? "Add expense" : "記一筆"}"><div class="expense-sheet-wrapper"><div class="expense-sheet"><div class="expense-title"><h2>${language === "en" ? "Add expense" : "記一筆"}</h2><button type="button" class="expense-close" aria-label="${language === "en" ? "Close" : "關閉"}">×</button></div><form class="expense-form"><div class="form-section"><label class="sec-label">${language === "en" ? "Category" : "類別"}</label><div class="expense-cat-pills">${expenseCategories.map((cat, i) => `<button type="button" class="expense-cat-btn${i === 0 ? " active" : ""}" data-cat="${escAttr(cat)}">${esc(cat)}</button>`).join("")}</div><input type="hidden" class="expense-category" value="${escAttr(expenseCategories[0] || "食物")}"></div><div class="form-section"><label class="sec-label">${language === "en" ? "Amount (auto-converts)" : "金額（任意輸入，其餘自動換算）"}</label><div class="expense-currencies-list">${distinctCurrencies.map((code, idx) => `<div class="currency-input-row" data-code="${escAttr(code)}"><span class="currency-tag">${esc(code)}</span><input type="number" step="any" inputmode="decimal" class="currency-val" data-code="${escAttr(code)}" placeholder="${idx === 0 ? (language === "en" ? "Enter amount" : "輸入金額") : (language === "en" ? "Auto-converted" : "自動換算")}"></div>`).join("")}</div><input type="hidden" class="expense-active-cur" value="${escAttr(distinctCurrencies[0] || homeCurrency)}"><input type="hidden" class="expense-amount" value="0"></div><div class="form-section"><label class="sec-label">${language === "en" ? "Description" : "品項／備註"}</label><input class="expense-description" placeholder="${language === "en" ? "e.g. Ramen, Metro" : "例如：一蘭拉麵、地鐵票"}"></div><div class="form-row-2col"><div class="form-section form-section-day"><label class="sec-label">${language === "en" ? "Day" : "行程天數"}</label><div class="select-wrap"><select class="expense-day">${dayOptions}</select></div></div><div class="form-section form-section-time"><label class="sec-label">${language === "en" ? "Time" : "時間"}</label><input class="expense-time" type="text" placeholder="14:30" maxlength="5"></div></div>${membersActive.length > 1 ? `<div class="form-section"><label class="sec-label">${language === "en" ? "Paid by" : "誰付錢（代墊人）"}</label><div class="expense-payer-pills">${membersActive.map((person, i) => `<button type="button" class="expense-payer-btn${i === 0 ? " active" : ""}" data-payer-id="${escAttr(person.id)}">${esc(person.name)}</button>`).join("")}</div><input type="hidden" class="expense-payer-id" value="${escAttr(membersActive[0]?.id || "")}"></div><div class="form-section"><label class="sec-label">${language === "en" ? "Split with" : "誰分攤"}</label><div class="expense-participants"><button type="button" class="participant-all-toggle active">${language === "en" ? "All" : "全選"}</button>${membersActive.map(person => `<button type="button" class="participant-chip active" data-part-id="${escAttr(person.id)}">${esc(person.name)}</button>`).join("")}</div></div>` : `<div class="form-section"><label class="sec-label">${language === "en" ? "Paid by" : "付款人"}</label><input class="expense-payer" value="${escAttr(defaultPayer)}" placeholder="${language === "en" ? "Name" : "姓名"}"></div>`}<input type="hidden" class="expense-record-id" value=""><div class="expense-actions-row"><button type="submit" class="expense-save">${language === "en" ? "Save" : "儲存記帳"}</button><button type="button" class="expense-delete-btn" style="display:none">${language === "en" ? "Delete" : "刪除此筆"}</button></div></form></div><div class="modal-scroll-indicator" aria-hidden="true"></div></div></section>`;
  };

  const settlementModalHtml = language => {
    return `<section class="expense-modal settlement-modal" id="global-settlement-modal" role="dialog" aria-modal="true" aria-label="${language === "en" ? "Split Bill" : "分帳結算"}"><div class="expense-sheet-wrapper"><div class="expense-sheet"><div class="expense-title"><div><h2>${language === "en" ? "Split Bill" : "分帳結算"}</h2><span class="block-sub">${language === "en" ? "Simplified transfer suggestion" : "AA 最簡轉帳建議"}</span></div><button type="button" class="expense-close settle-close" aria-label="${language === "en" ? "Close" : "關閉"}">×</button></div><div class="settlement-container"></div></div><div class="modal-scroll-indicator" aria-hidden="true"></div></div></section>`;
  };

  const imageLightboxHtml = language => `
    <div id="global-image-lightbox" class="image-lightbox" role="dialog" aria-modal="true" aria-label="${language === "en" ? "Attachment preview" : "附檔預覽"}">
      <div class="lightbox-header">
        <button type="button" class="lightbox-close" aria-label="${language === "en" ? "Close" : "關閉"}">×</button>
      </div>
      <div class="lightbox-body">
        <img class="lightbox-img" src="" alt="" style="display:none">
      </div>
    </div>`;

  const expensesHtml = language => {
    const reportSettleButton = membersActive.length > 1
      ? `<button type="button" class="day-action expense-settle-btn" aria-label="${language === "en" ? "Split Bill" : "分帳結算"}" title="${language === "en" ? "Split Bill" : "分帳結算"}"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></button>`
      : "";
    const reportAddButton = `<button type="button" class="day-action day-expense" aria-label="${language === "en" ? "Add expense" : "新增記帳"}" title="${language === "en" ? "Add expense" : "新增記帳"}" data-expense-day="" data-expense-date=""><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="14" rx="2.6"/><path d="M3 10h18"/><circle cx="15.6" cy="14.2" r="1.9" fill="currentColor" stroke="none"/></svg></button>`;

    return `<div class="expense-page-head"><h2>${language === "en" ? "Spending" : "記帳"}</h2><div class="expense-head-actions">${reportSettleButton}${reportAddButton}</div></div><div class="expense-report"><div class="expense-totals"></div><div class="expense-filter-bar"><div class="efilter-select-wrap"><select class="efilter-day" aria-label="天數"><option value="">${language === "en" ? "All Days" : "全部天數"}</option><option value="day-0">${language === "en" ? "Day 0 · Before trip" : "Day 0 · 行前"}</option>${trip.days.map((d, i) => `<option value="${escAttr(d.id)}">${language === "en" ? `Day ${i + 1}` : `第 ${i + 1} 天`}${d.date ? ` (${escAttr(d.date.slice(5))})` : ""}</option>`).join("")}</select></div><div class="efilter-select-wrap"><select class="efilter-cat" aria-label="類別"><option value="">${language === "en" ? "All Categories" : "所有類別"}</option>${expenseCategories.map(c => `<option value="${escAttr(c)}">${esc(c)}</option>`).join("")}</select></div>${membersActive.length > 1 ? `<div class="efilter-select-wrap"><select class="efilter-mem" aria-label="成員"><option value="">${language === "en" ? "All Travelers" : "所有成員"}</option>${membersActive.map(m => `<option value="${escAttr(m.id)}">${esc(m.name)}</option>`).join("")}</select></div>` : ""}</div><div class="expense-charts-block"><div class="chart-box"><div class="chart-header"><strong>類別佔比</strong></div><div class="donut-container"></div></div><div class="chart-box"><div class="chart-header"><strong>各類花費排行</strong></div><div class="rank-bars-container"></div></div><div class="chart-box"><div class="chart-header"><strong>每日花費趨勢</strong></div><div class="daily-bars-container"></div></div></div><div class="expense-days-block"><div class="block-header"><strong>消費明細</strong><span class="block-sub">長按單筆可看各幣別換算</span></div><div class="days-container"></div></div></div>`;
  };

  const initialLanguage = trip.previewLanguage === "en" ? "en" : "zh";
  const topNavigation = language => {
    const itineraryNav = trip.days.length ? `<nav class="day-nav subnav-itinerary" aria-label="行程日期">${trip.days.map((day, index) => { const id = `day-${index + 1}-${language}`; const inner = formatDayNavPill(day.date, index); return `<a href="#${id}" data-day-index="${index}" data-day-date="${escAttr(day.date || "")}" class="day-tab">${inner}</a>`; }).join("")}</nav>` : "";
    const categories = referenceCategories(trip.references || []);
    const referencesNav = `<nav class="day-nav subnav-references" style="display:none" aria-label="口袋名單分類">${categories.map((category,index) => `<a href="#${category.id}-${language}" data-target-card="${category.id}-${language}" class="day-tab${index === 0 ? ' active' : ''}"><span class="day-tab-num">${escapeHtml(language === 'en' ? ({'景點':'Spots','美食':'Food','購物':'Shopping'}[category.label] || category.label) : category.label)}</span><span class="day-tab-date count-badge">${category.rows.length}</span></a>`).join('')}</nav>`;
    const packingGroups = trip.packingGroups || [];
    const packingNav = packingGroups.length ? `<nav class="day-nav subnav-packing" style="display:none" aria-label="行前準備分類">${packingGroups.map((group, gIdx) => {
      const id = `pack-group-${gIdx + 1}-${language}`;
      const title = group.title || (language === "en" ? "List" : "清單");
      const count = (group.items || []).length;
      return `<a href="#${id}" data-target-card="${id}" class="day-tab${gIdx === 0 ? " active" : ""}"><span class="day-tab-num">${escapeHtml(title)}</span><span class="day-tab-date count-badge pack-nav-badge" data-group-badge="${gIdx + 1}">0/${count}</span></a>`;
    }).join("")}</nav>` : "";
    return `${itineraryNav}${referencesNav}${packingNav}`;
  };
  const featureNav = language => {
    // 5 Tabs Order: 1.行前準備 2.注意事項 3.行程 (正中大按鈕) 4.口袋名單 5.記帳
    return `<nav class="feature-nav">
      <button type="button" data-feature-target="packing-${language}" class="nav-btn-tab">
        <span class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="m9 14 2 2 4-4"/></svg></span>
        <span class="nav-text">${language === "en" ? "Checklist" : "行前準備"}</span>
      </button>
      <button type="button" data-feature-target="notes-${language}" class="nav-btn-tab">
        <span class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg></span>
        <span class="nav-text">${language === "en" ? "Notes" : "注意事項"}</span>
      </button>
      <button type="button" data-feature-target="itinerary-${language}" class="nav-btn-tab nav-btn-itinerary active">
        <span class="nav-itinerary-circle">
          <span class="nav-icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><path d="M8 14h.01"/><path d="M12 14h.01"/><path d="M16 14h.01"/><path d="M8 18h.01"/><path d="M12 18h.01"/></svg></span>
          <span class="nav-text">${language === "en" ? "Plan" : "行程"}</span>
        </span>
      </button>
      <button type="button" data-feature-target="references-${language}" class="nav-btn-tab">
        <span class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg></span>
        <span class="nav-text">${language === "en" ? "Saved" : "口袋名單"}</span>
      </button>
      <button type="button" data-feature-target="expenses-${language}" class="nav-btn-tab">
        <span class="nav-icon"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg></span>
        <span class="nav-text">${language === "en" ? "Spend" : "記帳"}</span>
      </button>
    </nav>`;
  };

  const content = language => `<div class="feature-page active" id="itinerary-${language}">${showMap ? itineraryMapHtml(trip, language, hasOfflineMapImages ? offlineMapImages : []) : ""}${renderContent(language)}<button type="button" class="fab-expense day-expense" aria-label="${language === "en" ? "Add expense" : "記一筆"}" title="${language === "en" ? "Add expense" : "記一筆"}"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5.5" width="18" height="14" rx="2.6"/><path d="M3 10h18"/><circle cx="15.6" cy="14.2" r="1.9" fill="currentColor" stroke="none"/></svg></button></div><section class="feature-page" id="notes-${language}">${notesHtml(language) || `<section class="day notes-day-card"><p class="empty">${language === "en" ? "No notes yet" : "尚無注意事項"}</p></section>`}</section><section class="feature-page" id="references-${language}">${referencesHtml(language)}</section><section class="feature-page" id="packing-${language}">${packingHtml(language)}</section><section class="feature-page" id="expenses-${language}">${expensesHtml(language)}</section>`;
  const languageContent = `${mapWorkerRegisterTag}${mapLibreCssTag}${mapLibreJsTag}<input class="static-lang-input" type="radio" name="language" id="static-lang-zh"${initialLanguage === "zh" ? " checked" : ""}><input class="static-lang-input" type="radio" name="language" id="static-lang-en"${initialLanguage === "en" ? " checked" : ""}><div class="static-content"><div class="lang-content-zh">${featureNav("zh")}${content("zh")}</div><div class="lang-content-en">${featureNav("en")}${content("en")}</div></div>`;


  const appStyles = `<style>
:root{--safe-bottom:var(--preview-safe-bottom,env(safe-area-inset-bottom,0px))}
.map-empty-view{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);z-index:2;padding:7px 11px;border-radius:7px;background:rgba(255,250,244,.94);color:#7b6754;font-size:12px;white-space:nowrap;pointer-events:none}.map-empty-view[hidden]{display:none!important}
.map-scope-switch{position:absolute;top:13px;left:10px;z-index:3;display:flex;padding:1px;border:1px solid #dec5ae;border-radius:6px;background:rgba(255,250,244,.94);box-shadow:0 1px 4px #352b2314}.map-scope-switch button{border:0;border-radius:5px;background:transparent;color:#7b6754;font-family:inherit;font-weight:600;font-size:11px;line-height:1;padding:6px 8px;min-height:26px;cursor:pointer}.map-scope-switch button.active{background:#b54a14;color:#fff}.map-scope-switch button:focus-visible{outline:2px solid #b54a14;outline-offset:2px}
.trip-map-controls{display:flex;align-items:center;gap:10px;min-height:38px;padding:0 0 7px}.trip-map-overview{min-height:32px;padding:0 12px;border:1px solid #cbd5d7;border-radius:999px;background:#fff;color:#43545b;font:600 12px -apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif}.trip-map-overview.active{background:#264f5a;color:#fff;border-color:#264f5a}.trip-map-controls [data-map-day-label]{color:#52646a;font-size:11px}
.trip-map-shell{position:sticky;top:var(--trip-map-top,92px);z-index:25;margin:10px -2px 14px;padding:5px 2px 7px;background:#faf6f0}.trip-map-tabs{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none;padding:3px 0 8px}.trip-map-tabs::-webkit-scrollbar{display:none}.trip-map-tab{flex:0 0 auto;min-width:48px;min-height:38px;border:1px solid #cbd5d7;border-radius:999px;background:#fff;color:#43545b;font-family:inherit;font-size:12px;font-weight:600;line-height:1.2;padding:0 13px}.trip-map-tab.active{background:#264f5a;color:#fff;border-color:#264f5a}.trip-map-title{font-size:14px;font-weight:650;color:#36464b;margin:0 0 5px 2px}.trip-map-canvas{position:relative;width:100%;aspect-ratio:640/350;overflow:hidden;border-radius:12px;background:#eef0ef}.trip-map-canvas .trip-map-loading{position:absolute;inset:0;z-index:1;display:grid;place-items:center;color:#657276;font-size:13px;pointer-events:none}.trip-map-offline-image{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}.trip-map-offline-image[hidden]{display:none!important}.trip-map-caption,.trip-map-empty p{font-size:11px;line-height:1.4;color:#68767a;margin:5px 2px 0}.trip-map-empty{margin:10px 0;padding:12px;border-radius:12px;background:#f0eee8;color:#36464b}.trip-map-empty p{margin-bottom:0}
.leg-rest,.leg-plan,.flight-duration,.transit-modal-body .leg-step{color:#352b23!important}
.feature-nav{position:fixed;left:0;right:0;bottom:0;margin:0 auto;z-index:40;display:flex;align-items:center;justify-content:space-around;width:100%;max-width:720px;height:calc(50px + var(--safe-bottom));border-top:1px solid #ead8c9;background:rgba(255,255,255,.98);box-shadow:0 -3px 12px rgba(73,48,27,.07);padding:0 4px var(--safe-bottom);box-sizing:border-box}
.feature-nav .nav-btn-tab{flex:1 1 0;min-width:0;max-width:85px;height:100%;border:0;background:none;color:#7b6754;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px 2px;cursor:pointer;border-radius:10px;-webkit-tap-highlight-color:transparent;transition:all .15s ease}
.feature-nav .nav-btn-tab .nav-icon{display:inline-flex;align-items:center;justify-content:center;height:20px;margin-bottom:2px}
.feature-nav .nav-btn-tab .nav-icon svg{display:block}
.feature-nav .nav-btn-tab .nav-text{font-size:10.5px;font-weight:600;line-height:1.1;display:block;white-space:nowrap;letter-spacing:-0.2px}
.feature-nav .nav-btn-tab.active{color:#b54a14}
.feature-nav .nav-btn-tab.active .nav-text{font-weight:750}
.feature-nav .nav-btn-itinerary{position:relative;top:-14px;padding:0;overflow:visible;flex:0 0 62px;max-width:62px;height:auto}
.feature-nav .nav-btn-itinerary .nav-itinerary-circle{display:flex;flex-direction:column;align-items:center;justify-content:center;width:58px;height:58px;min-width:58px;min-height:58px;aspect-ratio:1/1;flex-shrink:0;box-sizing:border-box;border-radius:50%;background:#b54a14;color:#fff;box-shadow:0 5px 16px rgba(181,74,20,0.4);border:3px solid #fff;transition:transform .12s ease,background .15s ease}
.feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-icon{display:inline-flex;align-items:center;justify-content:center;height:22px;margin-bottom:1px}
.feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-icon svg{width:20px;height:20px;display:block}
.feature-nav .nav-btn-itinerary .nav-itinerary-circle .nav-text{font-size:11px;font-weight:750;color:#fff;margin-top:1px;line-height:1}
.feature-nav .nav-btn-itinerary:not(.active) .nav-itinerary-circle{background:#8a6a52;box-shadow:0 3px 10px rgba(73,48,27,0.25)}
.feature-nav .nav-btn-itinerary:active .nav-itinerary-circle{transform:scale(0.92)}
.feature-page{display:none}
.feature-page.active{display:block}
.day-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px;margin-left:auto}
.day-action{display:inline-grid;place-items:center;flex:none;width:34px;height:34px;padding:0;border:1px solid #f0cba6;border-radius:50%;background:#fce4ce;color:#b54a14;text-decoration:none}
.day-action:hover{background:#f6d9b8;border-color:#e5bc98}
.pack-group{padding:6px 0 10px}
.pack-items{display:flex;flex-direction:column;gap:1px;margin-top:4px}
.pack-item{display:flex;gap:8px;align-items:center;padding:5px 0;color:#554333;font-size:13px;cursor:pointer}
.pack-item input{width:17px;height:17px;margin:0;accent-color:#b54a14;cursor:pointer}
.head-badge-row{display:flex;justify-content:space-between;align-items:center;gap:8px}
.head-badge-row h2{margin:0}
.count-badge{font-size:11.5px;font-weight:700;padding:2px 8px;border-radius:999px;background:#f0e6dd;color:#7a6652;border:1px solid #dfd2c4;font-variant-numeric:tabular-nums;line-height:1.2;display:inline-flex;align-items:center;justify-content:center}
.count-badge.is-all-checked{background:#dcfce7!important;color:#15803d!important;border-color:#86efac!important}
.day-tab .count-badge{font-size:9.5px;padding:1px 5px;margin-top:1px;border:none}
.day-tab.active .count-badge{background:rgba(255,255,255,0.25)!important;color:#fff!important}
.day-tab.active .count-badge.is-all-checked{background:#fff!important;color:#15803d!important}
.fab-expense{position:fixed;right:18px;bottom:calc(68px + var(--safe-bottom));z-index:35;width:46px;height:46px;border-radius:50%;background:rgba(181,74,20,0.78);color:#fff;border:1.5px solid rgba(255,255,255,0.7);box-shadow:0 4px 16px rgba(181,74,20,0.28);display:grid;place-items:center;cursor:pointer;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);opacity:0.88;transition:all .2s ease}
.fab-expense:hover{opacity:1;background:rgba(181,74,20,0.95);transform:scale(1.06);box-shadow:0 6px 20px rgba(181,74,20,0.36)}
.fab-expense:active{opacity:1;background:#b54a14;transform:scale(0.94)}
.expense-page-head{display:flex;justify-content:space-between;align-items:center;padding:14px 4px 8px;margin-bottom:4px}
.expense-page-head h2{font-size:18px;font-weight:700;margin:0;color:#352b23}
.expense-head-actions{display:flex;align-items:center;gap:8px}
.settlement-modal{align-items:center!important;padding:20px 14px!important}
.settlement-modal .expense-sheet{max-height:min(78vh,calc(100vh - 48px));animation:modalPopIn .18s cubic-bezier(0.16,1,0.3,1)}
.settlement-modal .settlement-container{background:transparent;border:none;padding:0;box-shadow:none}
@keyframes modalPopIn{from{opacity:0;transform:scale(0.95)}to{opacity:1;transform:scale(1)}}
.expense-modal{display:none;position:fixed;inset:0;background:rgba(0,0,0,0.45);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);z-index:100;align-items:flex-end;justify-content:center;padding:16px 14px calc(14px + var(--safe-bottom));box-sizing:border-box}
.expense-modal.active{display:flex}
.expense-sheet-wrapper{position:relative;width:100%;max-width:480px;display:flex;flex-direction:column;margin:0 auto}
.expense-sheet{background:#ffffff;width:100%;border-radius:22px;padding:18px 18px 20px;box-shadow:0 12px 40px rgba(0,0,0,0.22);box-sizing:border-box;max-height:min(84vh,calc(100vh - 28px - var(--safe-bottom)));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;scrollbar-width:none;-ms-overflow-style:none;border:1px solid #e7d7c7;animation:sheetFloatUp .2s cubic-bezier(0.16,1,0.3,1)}
.expense-sheet::-webkit-scrollbar{display:none;width:0;height:0}
.transit-modal-sheet{scrollbar-width:none;-ms-overflow-style:none}
.transit-modal-sheet::-webkit-scrollbar{display:none;width:0;height:0}
.modal-scroll-indicator{position:absolute;right:4px;top:0;width:3.5px;min-height:24px;border-radius:999px;background:rgba(85,67,51,0.42);pointer-events:none;z-index:10;opacity:0;transition:opacity .25s ease}
.modal-scroll-indicator.visible{opacity:1}
@keyframes sheetFloatUp{from{opacity:0;transform:translateY(16px) scale(0.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.expense-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid #f0e6dd}
.expense-title h2{font-size:17px;font-weight:700;margin:0;color:#352b23}
.expense-close{background:none;border:none;font-size:24px;line-height:1;color:#8c7662;cursor:pointer;padding:4px 8px}
.expense-close:active{color:#352b23}
.form-section{margin-bottom:13px;width:100%;min-width:0;box-sizing:border-box}
.sec-label{display:block;font-size:11.5px;font-weight:650;color:#7a6652;margin-bottom:5px;letter-spacing:0.2px}
.expense-cat-pills,.expense-payer-pills{display:flex;flex-wrap:wrap;gap:6px}
.expense-cat-btn,.expense-payer-btn{padding:5px 12px;border:1px solid #dec5ae;border-radius:20px;background:#ffffff;color:#554333;font-size:12.5px;font-weight:500;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s ease}
.expense-cat-btn:hover,.expense-payer-btn:hover{background:#faf6f0}
.expense-cat-btn.active,.expense-payer-btn.active{background:#b54a14!important;color:#ffffff!important;border-color:#b54a14!important;font-weight:600}
.expense-currencies-list{display:flex;flex-direction:column;gap:6px}
.currency-input-row{display:grid;grid-template-columns:56px 1fr;align-items:stretch;background:#ffffff;border:1px solid #dec5ae;border-radius:10px;overflow:hidden;transition:border-color .15s ease}
.currency-input-row:focus-within{border-color:#b54a14;box-shadow:0 0 0 1px #b54a14}
.currency-tag{display:flex;align-items:center;justify-content:center;background:#fdfbf8;color:#554333;font-size:12px;font-weight:700;padding:0 6px;text-align:center;border-right:1px solid #dec5ae;user-select:none;flex-shrink:0}
.currency-val{border:none;background:transparent;padding:8px 10px;font-size:14px!important;font-variant-numeric:tabular-nums;color:#352b23;outline:none;width:100%;box-sizing:border-box;-moz-appearance:textfield!important;appearance:textfield!important}
.form-row-2col{display:grid;grid-template-columns:1fr 72px;gap:10px;align-items:flex-start;margin-bottom:13px;width:100%}
.form-row-2col .form-section{margin-bottom:0}
.expense-description,.expense-payer,.expense-time{width:100%;height:38px;padding:8px 10px;border:1px solid #dec5ae;border-radius:10px;font-family:inherit;font-size:14px!important;font-weight:400;letter-spacing:normal;text-align:left;box-sizing:border-box;background:#ffffff;color:#352b23;outline:none;transition:border-color .15s ease}
.select-wrap,.efilter-select-wrap{position:relative;width:100%}
.select-wrap::after,.efilter-select-wrap::after{content:"";position:absolute;right:11px;top:50%;transform:translateY(-50%);width:10px;height:6px;background-image:url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%238c7662' stroke-width='1.8' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E");background-repeat:no-repeat;background-size:10px 6px;pointer-events:none;z-index:2}
.select-wrap select,.efilter-select-wrap select{-webkit-appearance:none;-moz-appearance:none;appearance:none;width:100%;height:38px;padding:6px 28px 6px 12px!important;border:1px solid #dec5ae;border-radius:10px;background-color:#ffffff!important;font-size:14px!important;color:#352b23;outline:none;cursor:pointer;box-sizing:border-box;transition:border-color .15s ease}
.expense-description:focus,.select-wrap select:focus,.expense-time:focus,.expense-payer:focus,.efilter-select-wrap select:focus{border-color:#b54a14}
.expense-participants{display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.participant-all-toggle{padding:5px 12px;border:1px dashed #b54a14;background:#fffaf6;color:#b54a14;border-radius:16px;font-size:12px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s ease}
.participant-all-toggle.active{background:#b54a14;color:#ffffff;border-style:solid}
.participant-chip{display:inline-flex;align-items:center;padding:5px 12px;border:1px solid #dec5ae;border-radius:16px;background:#ffffff;font-size:12px;cursor:pointer;color:#554333;-webkit-tap-highlight-color:transparent;transition:all .15s ease}
.participant-chip.active{background:#fdf3eb;border-color:#b54a14;color:#b54a14;font-weight:600}
.expense-save{width:100%;padding:11px;background:#b54a14;color:#ffffff;border:none;border-radius:12px;font-size:15px;font-weight:700;cursor:pointer;margin-top:14px;box-shadow:0 3px 10px rgba(181,74,20,0.28);transition:all .15s ease}
.expense-save:active{transform:scale(0.98);background:#9e3d0c}
.expense-actions-row{display:flex;gap:10px;margin-top:14px}
.expense-actions-row .expense-save{margin-top:0;flex:2}
.expense-delete-btn{flex:1;padding:11px;background:#ffffff;border:1px solid #fca5a5;color:#dc2626;border-radius:12px;font-size:14px;font-weight:600;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .15s ease}
.expense-delete-btn:active{background:#fee2e2;transform:scale(0.98)}
.rrow{cursor:pointer;-webkit-tap-highlight-color:rgba(0,0,0,0.05);transition:background .12s ease}
.rrow:active{background:rgba(0,0,0,0.04)}
.expense-report{margin-top:6px;display:flex;flex-direction:column;gap:14px}
.tcard-row{display:grid;grid-template-columns:1fr 1fr;gap:10px}
.tcard{background:#ffffff;border:1px solid #e7d7c7;border-radius:14px;padding:12px 14px;box-shadow:0 1px 2px rgba(73,48,27,0.04);display:flex;flex-direction:column;gap:2px}
.tcard span{font-size:11.5px;color:#7a6652;font-weight:500}
.tcard b{font-size:19px;font-weight:750;color:#b54a14;font-variant-numeric:tabular-nums}
.tcard b small{font-size:12px;color:#7a6652;font-weight:500;margin-left:2px}
.cur-switcher-row{display:flex;justify-content:space-between;align-items:center;padding:4px 4px;margin-top:10px;margin-bottom:2px}
.cur-switcher-row span{font-size:11.5px;color:#7a6652;font-weight:600}
.cur-pills{display:flex;gap:4px}
.cur-pill{padding:3px 8px;border:1px solid #dec5ae;border-radius:8px;background:#ffffff;font-size:11px;font-weight:600;color:#7b6754;cursor:pointer;-webkit-tap-highlight-color:transparent;transition:all .12s ease}
.cur-pill.active{background:#b54a14;color:#ffffff;border-color:#b54a14}
.expense-filter-bar{display:grid;grid-template-columns:repeat(auto-fit,minmax(90px,1fr));gap:6px}
.efilter-select-wrap select{height:34px!important;padding:5px 28px 5px 10px!important;font-size:13px!important;border-radius:10px!important}
.chart-box{background:#ffffff;border:1px solid #e7d7c7;border-radius:15px;padding:14px 16px;box-shadow:0 1px 2px rgba(73,48,27,0.04);margin-bottom:10px}
.chart-header{font-size:13px;font-weight:700;color:#352b23;margin-bottom:10px;padding-bottom:6px;border-bottom:1px solid #f0e6dd}
.donut-flex{display:flex;align-items:center;gap:14px}
.donut-svg-wrap{flex:none}
.donut-legend{flex:1;display:flex;flex-direction:column;gap:5px}
.donut-leg-item{display:grid;grid-template-columns:10px 1fr auto auto;align-items:center;gap:6px;font-size:11.5px}
.donut-dot{width:8px;height:8px;border-radius:50%;display:inline-block}
.donut-label{color:#4d3b2b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.donut-pct{color:#84715e;font-size:10.5px}
.donut-amt{font-variant-numeric:tabular-nums;color:#352b23;font-size:11.5px}
.rank-bars-list{display:flex;flex-direction:column;gap:8px}
.rank-bar-row{display:grid;grid-template-columns:56px 1fr 64px;align-items:center;gap:8px;font-size:12px}
.rank-name{color:#4d3b2b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.rank-track{height:8px;background:#f0e6dd;border-radius:4px;overflow:hidden}
.rank-fill{height:100%;border-radius:4px;transition:width .3s ease}
.rank-val{text-align:right;font-variant-numeric:tabular-nums;color:#352b23}
.daily-bars-list{display:flex;flex-direction:column;gap:8px}
.daily-bar-row{display:grid;grid-template-columns:84px 1fr 64px;align-items:center;gap:8px;font-size:12px}
.daily-name{color:#4d3b2b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.daily-track{height:8px;background:#f0e6dd;border-radius:4px;overflow:hidden}
.daily-fill{height:100%;border-radius:4px;background:#b54a14;transition:width .3s ease}
.daily-val{text-align:right;font-variant-numeric:tabular-nums;color:#352b23}
.block-header{display:flex;justify-content:space-between;align-items:baseline;margin-bottom:8px;padding:0 2px}
.block-header strong{font-size:14.5px;font-weight:700;color:#352b23}
.block-sub{font-size:11px;color:#84715e}
.settlement-container{background:#ffffff;border:1px solid #e7d7c7;border-radius:15px;padding:14px;box-shadow:0 1px 2px rgba(73,48,27,0.04)}
.settle-summary-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:12px}
.settle-person-card{background:#faf6f0;border:1px solid #eee0d3;border-radius:10px;padding:9px 10px}
.sp-name{font-size:12px;font-weight:700;color:#352b23;margin-bottom:3px}
.sp-net{font-size:13px;font-weight:750;font-variant-numeric:tabular-nums}
.sp-net.is-plus{color:#059669}
.sp-net.is-minus{color:#dc2626}
.sp-net.is-zero{color:#64748b}
.sp-detail{display:flex;justify-content:space-between;font-size:10.5px;color:#84715e;margin-top:4px}
.transfers-list{display:flex;flex-direction:column;gap:6px}
.transfer-card{display:flex;justify-content:space-between;align-items:center;background:#fff8f3;border:1px solid #eee0d3;border-radius:9px;padding:8px 12px}
.transfer-arrow{display:flex;align-items:center;gap:6px;font-size:12.5px}
.transfer-arrow .from{font-weight:700;color:#dc2626}
.transfer-arrow .arrow{color:#7a6454;font-size:11px}
.transfer-arrow .to{font-weight:700;color:#059669}
.transfer-amt{font-size:13.5px;color:#8a3d10;font-variant-numeric:tabular-nums}
.transfer-amt small{font-size:10.5px}
.eday{background:#ffffff;border:1px solid #e7d7c7;border-radius:12px;margin-bottom:8px;overflow:hidden}
.eday summary{padding:10px 12px;cursor:pointer;display:flex;justify-content:space-between;gap:8px;font-size:12.5px;color:#4d3b2b;background:#faf6f0;user-select:none}
.eday summary b{color:#8a3d10;font-size:13px}
.rrow{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:9px 12px;border-top:1px solid #f2eae1;cursor:pointer;-webkit-user-select:none;user-select:none}
.rrow:active{background:#fdf9f4}
.rrow-title{display:flex;align-items:center;gap:6px;font-size:13px;color:#352b23}
.rrow-cat{font-size:10.5px;color:#7a6652;background:#f2eae1;padding:1px 6px;border-radius:4px}
.rrow-sub{font-size:11px;color:#84715e;margin-top:2px;display:block}
.rrow-right{text-align:right}
.rrow-primary{display:block;color:#8a3d10;font-size:12.5px;font-variant-numeric:tabular-nums}
.rrow-hint{display:block;font-size:9.5px;color:#9a8a78}
.expense-popover{position:fixed;z-index:9999;background:rgba(30,22,14,0.95);color:#fff;border:1px solid rgba(255,255,255,0.18);border-radius:12px;padding:12px 14px;box-shadow:0 12px 32px rgba(0,0,0,0.36);min-width:210px;max-width:280px;pointer-events:none;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);animation:popFadeIn .12s ease-out}
@keyframes popFadeIn{from{opacity:0;transform:scale(0.92)}to{opacity:1;transform:scale(1)}}
.pop-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.14);padding-bottom:5px}
.pop-header strong{font-size:13px;color:#fff}
.pop-cat{font-size:10px;background:rgba(255,255,255,0.15);padding:1px 5px;border-radius:4px;color:#fce4ce}
.pop-currencies{display:flex;flex-direction:column;gap:3px;margin-bottom:6px}
.pop-cur-row{display:grid;grid-template-columns:40px 1fr auto;align-items:baseline;gap:6px;font-size:12px}
.pop-cur-code{color:#d1c4b8;font-size:10.5px}
.pop-cur-val{font-variant-numeric:tabular-nums;color:#fff}
.pop-orig-tag{font-size:9.5px;background:#b54a14;color:#fff;padding:0 4px;border-radius:3px}
.pop-meta{font-size:10.5px;color:#d1c4b8;border-top:1px solid rgba(255,255,255,0.12);padding-top:5px;display:flex;flex-direction:column;gap:2px}
.pop-meta b{color:#fff}
.pop-hint{margin-top:5px;font-size:9.5px;color:#9a8a78;text-align:center;letter-spacing:0.5px}

.stop-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}
.flight-airport{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-height:0;flex-wrap:wrap}
.flight-middle{flex-wrap:wrap}
.tcard{min-width:0;overflow:hidden}
.currency-input-row{grid-template-columns:minmax(56px,auto) 1fr}

/* Notes Thumbnails & Content Layout */
.notes-day-card{margin-top:14px;padding:14px 16px}
.notes-card-inner{display:flex;flex-direction:column;gap:10px}
.note-stop{display:flex;align-items:flex-start;gap:10px;padding:6px 0}
.note-marker-icon{flex:0 0 24px!important;width:24px!important;height:24px!important;margin-top:0!important;display:grid;place-items:center;align-self:flex-start!important}
.note-stop-content{flex:1 1 auto;min-width:0;display:flex;align-items:flex-start;justify-content:space-between;gap:12px}
.note-stop-text{flex:1 1 auto;min-width:0;display:flex;flex-direction:column;justify-content:flex-start;align-self:flex-start}
.note-stop-text .stop-top{align-items:flex-start;margin-bottom:2px}
.note-stop-text .place-title{line-height:24px;align-items:flex-start}
.note-stop-text .place-title h3{line-height:24px;margin:0;font-size:15px;font-weight:600}
.note-thumb-btn{flex:0 0 42px!important;width:42px!important;height:42px!important;min-width:42px!important;max-width:42px!important;min-height:42px!important;max-height:42px!important;box-sizing:border-box!important;padding:0!important;border:1px solid #dec5ae!important;border-radius:8px!important;background:#f5ede4!important;cursor:pointer;position:relative;overflow:hidden;outline:none;-webkit-tap-highlight-color:transparent;transition:transform .12s ease,border-color .15s ease;display:grid;place-items:center;align-self:flex-start!important}
.note-thumb-btn:active{transform:scale(0.94);border-color:#b54a14}
.note-thumb-btn img{width:100%!important;height:100%!important;object-fit:cover!important;display:block!important}

/* Lightbox Modal */
.image-lightbox{position:fixed;inset:0;z-index:99999;background:rgba(15,10,6,0.92);backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);display:flex;flex-direction:column;opacity:0;pointer-events:none;transition:opacity .2s ease;padding:env(safe-area-inset-top,12px) 16px env(safe-area-inset-bottom,16px);user-select:none;-webkit-user-select:none}
.image-lightbox.active{opacity:1;pointer-events:auto}
.lightbox-header{display:flex;justify-content:flex-end;align-items:center;padding:8px 4px;color:#fff;flex:0 0 auto;z-index:10}
.lightbox-close{background:rgba(255,255,255,0.18);border:none;color:#fff;font-size:24px;line-height:1;width:36px;height:36px;border-radius:50%;cursor:pointer;display:grid;place-items:center;-webkit-tap-highlight-color:transparent}
.lightbox-close:active{background:rgba(255,255,255,0.32);transform:scale(0.92)}
.lightbox-body{flex:1 1 auto;display:flex;align-items:center;justify-content:center;min-height:0;overflow:hidden;position:relative;touch-action:none}
.lightbox-img{max-width:100%;max-height:100%;object-fit:contain;border-radius:8px;box-shadow:0 8px 32px rgba(0,0,0,0.5);transform-origin:center center;cursor:grab;touch-action:none;image-rendering:-webkit-optimize-contrast;image-rendering:high-quality}
.lightbox-img.is-zoomed{cursor:grab}
.lightbox-img:active{cursor:grabbing}
.note-marker{display:inline-flex;align-items:center;justify-content:center;padding:0 6px;height:19px;font-size:11px;font-weight:700;border-radius:4px;line-height:1;cursor:pointer;border:1px solid transparent;flex:none;text-decoration:none;-webkit-tap-highlight-color:transparent}
.note-marker:active{transform:scale(0.96)}
.note-marker-pdf{color:#dc2626;background:#fef2f2;border-color:#fecaca}
.note-marker-img{color:#0284c7;background:#f0f9ff;border-color:#bae6fd}
.stop-attach-btn{display:inline-flex;align-items:center;justify-content:center;width:22px;height:20px;min-height:20px;max-height:20px;min-width:22px;max-width:22px;border-radius:4px;border:1px solid transparent;cursor:pointer;padding:0;margin:0;flex:none;vertical-align:middle;box-sizing:border-box;line-height:1;transition:all .15s ease;-webkit-tap-highlight-color:transparent}
.stop-attach-btn:active{transform:scale(0.92)}
.stop-attach-img{color:#0284c7;background:#f0f9ff;border-color:#bae6fd}
.stop-attach-pdf{color:#dc2626;background:#fef2f2;border-color:#fecaca}
.stop-attach-btn svg{width:14px;height:14px;display:block;flex:none}
.place-title-wrap{display:flex;align-items:center;flex-wrap:wrap;gap:6px;flex:1 1 auto;min-width:0}
.place-title-wrap .place-title{flex:0 1 auto}

</style>`;

  const textSizeCss = `
/* Font Size Toggle & Accessibility Scaling */
.hero-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px}
.hero-top h1{flex:1 1 auto;min-width:0;margin:0 0 2px;overflow-wrap:anywhere}
.text-size-btn{display:inline-flex;align-items:center;justify-content:center;flex:0 0 32px;width:32px;height:32px;padding:0;border-radius:8px;border:1px solid #dec5ae;background:#fff;color:#7b6754;cursor:pointer;line-height:1;font-family:inherit;-webkit-tap-highlight-color:transparent;transition:all .15s ease;user-select:none;box-sizing:border-box}
.text-size-btn:active{transform:scale(0.92)}
html[data-text-size="lg"] .text-size-btn{background:#fce4ce;border:1.5px solid #d97706;color:#b54a14}
html[data-text-size="xl"] .text-size-btn{background:#b54a14;border:1.5px solid #b54a14;color:#ffffff;box-shadow:0 2px 6px rgba(181,74,20,0.35)}
.ticket .text-size-btn{border-radius:6px;border:1px solid #cbd5e1;background:#fff;color:var(--ink-dim);font-family:ui-monospace,monospace}
html[data-text-size="lg"].ticket .text-size-btn{background:var(--accent-soft);border-color:var(--accent);color:var(--accent)}
html[data-text-size="xl"].ticket .text-size-btn{background:var(--accent);border-color:var(--accent);color:#fff}
.schedule .text-size-btn{border-radius:6px;border:1px solid #e2e8f0;background:#fff;color:#64748b}
html[data-text-size="lg"].schedule .text-size-btn{background:#e2e8f0;border-color:#0f172a;color:#0f172a}
html[data-text-size="xl"].schedule .text-size-btn{background:#0f172a;border-color:#0f172a;color:#fff}
.rail .text-size-btn{border-radius:6px;border:1px solid #d4d4d8;background:#fff;color:#52525b;font-family:ui-monospace,monospace}
html[data-text-size="lg"].rail .text-size-btn{background:#f0f9ff;border-color:#0284c7;color:#0284c7}
html[data-text-size="xl"].rail .text-size-btn{background:#0284c7;border-color:#0284c7;color:#fff}

/* Large (+25%) */
html[data-text-size="lg"]{font-size:20px}
html[data-text-size="lg"] body{font-size:20px}
html[data-text-size="lg"] .hero h1{font-size:25px}
html[data-text-size="lg"] .hero p{font-size:15.5px}
html[data-text-size="lg"] .day h2{font-size:23px}
html[data-text-size="lg"] .place-title h3,
html[data-text-size="lg"] .plain-title h3,
html[data-text-size="lg"] .flight-airport span{font-size:19.5px!important;line-height:1.25!important}
html[data-text-size="lg"] time,
html[data-text-size="lg"] .stop time,
html[data-text-size="lg"] .stop time *,
html[data-text-size="lg"] .flight-airport time,
html[data-text-size="lg"] .time-start,
html[data-text-size="lg"] .time-sep,
html[data-text-size="lg"] .time-end{font-size:16px!important;line-height:1.2!important}
:is(html,body)[data-text-size="lg"] :is(.timeline,.default) .time-end{font-size:13.5px!important}
:is(html,body)[data-text-size="lg"] :is(.timeline-step,.stop) .marker,
html[data-text-size="lg"] .marker,
html[data-text-size="lg"] .flight-number{font-size:13.5px!important;width:24px!important;height:24px!important}
html[data-text-size="lg"] .detail p,html[data-text-size="lg"] .notes-card-inner,html[data-text-size="lg"] .pack-name,html[data-text-size="lg"] .flight-detail,html[data-text-size="lg"] .flight-detail *{font-size:16.5px!important}
html[data-text-size="lg"] .kind,html[data-text-size="lg"] .leg,html[data-text-size="lg"] .flight-middle,html[data-text-size="lg"] .flight-middle *,html[data-text-size="lg"] .flight-duration,html[data-text-size="lg"] .website{font-size:15px!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab,
:is(html,body)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab,
:is(html,body)[data-text-size="lg"] .day-tab{height:38px!important;min-width:52px!important;padding:4px 9px!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab-num,
:is(html,body)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab-num,
:is(html,body)[data-text-size="lg"] .day-tab-num{font-size:14.5px!important;line-height:1.15!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab-date,
:is(html,body)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab-date,
:is(html,body)[data-text-size="lg"] .day-tab-date{font-size:12px!important;line-height:1.1!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab > .day-tab-num:only-child,
:is(html,body)[data-text-size="lg"] :is(.day-nav,.subnav-itinerary) .day-tab > .day-tab-num:only-child,
:is(html,body)[data-text-size="lg"] .day-tab > .day-tab-num:only-child{font-size:15px!important}
html[data-text-size="lg"] .feature-nav .nav-text{font-size:12.5px!important}
html[data-text-size="lg"] .pack-item,html[data-text-size="lg"] .pack-item span{font-size:16.5px!important;line-height:1.35!important}
html[data-text-size="lg"] .pack-item{padding:9px 0}
html[data-text-size="lg"] .pack-item input[type="checkbox"]{width:20px;height:20px}
html[data-text-size="lg"] .count-badge{font-size:13px!important;padding:3px 7px!important}
html[data-text-size="lg"] .expense-page-head h2{font-size:22px!important}
html[data-text-size="lg"] .tcard span{font-size:14px!important}
html[data-text-size="lg"] .tcard b{font-size:24px!important}
html[data-text-size="lg"] .tcard b small{font-size:14.5px!important}
html[data-text-size="lg"] .cur-switcher-row span{font-size:14px!important}
html[data-text-size="lg"] .cur-pill{font-size:13.5px!important;padding:4px 10px!important}
html[data-text-size="lg"] .efilter-select-wrap select{height:40px!important;font-size:15.5px!important}
html[data-text-size="lg"] .chart-header{font-size:16px!important}
html[data-text-size="lg"] .donut-leg-item,html[data-text-size="lg"] .donut-label,html[data-text-size="lg"] .donut-amt{font-size:14px!important}
html[data-text-size="lg"] .donut-pct{font-size:12.5px!important}
html[data-text-size="lg"] .rank-bar-row,html[data-text-size="lg"] .daily-bar-row,html[data-text-size="lg"] .rank-name,html[data-text-size="lg"] .daily-name,html[data-text-size="lg"] .rank-val,html[data-text-size="lg"] .daily-val{font-size:14.5px!important}
html[data-text-size="lg"] .block-header strong{font-size:18px!important}
html[data-text-size="lg"] .block-sub{font-size:13.5px!important}
html[data-text-size="lg"] .sp-name{font-size:15px!important}
html[data-text-size="lg"] .sp-net{font-size:16px!important}
html[data-text-size="lg"] .sp-detail{font-size:13px!important}
html[data-text-size="lg"] .transfer-arrow{font-size:15px!important}
html[data-text-size="lg"] .transfer-amt{font-size:16.5px!important}
html[data-text-size="lg"] .eday summary{font-size:15.5px!important;padding:12px 14px!important}
html[data-text-size="lg"] .eday summary b{font-size:16px!important}
html[data-text-size="lg"] .rrow-title{font-size:16px!important}
html[data-text-size="lg"] .rrow-cat{font-size:13px!important;padding:2px 7px!important}
html[data-text-size="lg"] .rrow-sub{font-size:13.5px!important}
html[data-text-size="lg"] .rrow-primary{font-size:16px!important}
html[data-text-size="lg"] .rrow-hint{font-size:11.5px!important}
html[data-text-size="lg"] .expense-title h2{font-size:21px!important}
html[data-text-size="lg"] .sec-label{font-size:14px!important}
html[data-text-size="lg"] .expense-cat-btn,html[data-text-size="lg"] .expense-payer-btn,html[data-text-size="lg"] .participant-chip,html[data-text-size="lg"] .participant-all-toggle{font-size:15px!important;padding:6px 14px!important}
html[data-text-size="lg"] .currency-tag{font-size:15px!important}
html[data-text-size="lg"] .currency-val,html[data-text-size="lg"] .expense-description,html[data-text-size="lg"] .expense-payer,html[data-text-size="lg"] .expense-time,html[data-text-size="lg"] .select-wrap select{font-size:16.5px!important;min-height:42px!important}
html[data-text-size="lg"] .expense-save,html[data-text-size="lg"] .expense-delete-btn{font-size:17.5px!important;padding:13px!important}
html[data-text-size="lg"] .note-body,html[data-text-size="lg"] .ref-group-title{font-size:16px!important}
html[data-text-size="lg"] .itinerary-card-scroll{padding-bottom:calc(82px + var(--safe-bottom))!important}
html[data-text-size="lg"] .stop-top{flex-wrap:wrap;gap:2px 8px}
html[data-text-size="lg"] .stop-top time{margin-left:auto}
:is(html,body)[data-text-size="lg"].timeline .timeline-step .stop,
:is(html,body)[data-text-size="lg"].timeline .flight-line,
:is(html,body)[data-text-size="lg"].default .timeline-step .stop,
:is(html,body)[data-text-size="lg"].default .flight-line,
html[data-text-size="lg"] :is(.timeline,.default) .timeline-step .stop,
html[data-text-size="lg"] :is(.timeline,.default) .flight-line{grid-template-columns:52px 24px 1fr!important;column-gap:6px!important}
:is(html,body)[data-text-size="lg"].timeline .timeline-step .stop .marker,
:is(html,body)[data-text-size="lg"].default .timeline-step .stop .marker,
html[data-text-size="lg"] :is(.timeline,.default) .timeline-step .stop .marker{width:24px!important;height:24px!important;font-size:13.5px!important}
:is(html,body)[data-text-size="lg"].timeline .timeline-step:not(:last-child)::before,
:is(html,body)[data-text-size="lg"].default .timeline-step:not(:last-child)::before,
html[data-text-size="lg"] :is(.timeline,.default) .timeline-step:not(:last-child)::before{left:69px!important}
:is(html,body)[data-text-size="lg"].timeline .leg,
:is(html,body)[data-text-size="lg"].timeline .flight-middle,
:is(html,body)[data-text-size="lg"].default .leg,
:is(html,body)[data-text-size="lg"].default .flight-middle,
html[data-text-size="lg"] :is(.timeline,.default) .leg,
html[data-text-size="lg"] :is(.timeline,.default) .flight-middle{margin-left:58px!important;max-width:calc(100% - 64px)!important;border-radius:14px!important;flex-wrap:wrap!important}
:is(html,body)[data-text-size="lg"] :is(.compact,.tab) .leg,
:is(html,body)[data-text-size="lg"] :is(.compact,.tab) .flight-middle{margin-left:42px!important;max-width:calc(100% - 48px)!important;border-radius:14px!important;flex-wrap:wrap!important}
:is(html,body)[data-text-size="lg"].timeline .flight-detail,
:is(html,body)[data-text-size="lg"].default .flight-detail,
html[data-text-size="lg"] :is(.timeline,.default) .flight-detail{margin-left:82px!important}
:is(html,body)[data-text-size="lg"].rail .stop,
html[data-text-size="lg"] .rail .stop{grid-template-columns:68px 1fr!important}
:is(html,body)[data-text-size="lg"].rail .leg,
:is(html,body)[data-text-size="lg"].rail .flight-stop,
html[data-text-size="lg"] .rail .leg,
html[data-text-size="lg"] .rail .flight-stop{margin-left:80px!important}
:is(html,body)[data-text-size="lg"].classic .stop,
html[data-text-size="lg"] .classic .stop{grid-template-columns:30px 1fr!important;gap:10px!important}
:is(html,body)[data-text-size="lg"].classic .timeline-step:not(:last-child)::before,
html[data-text-size="lg"] .classic .timeline-step:not(:last-child)::before{left:14px!important}
:is(html,body)[data-text-size="lg"].classic .leg,
html[data-text-size="lg"] .classic .leg{padding-left:40px!important}

/* Extra Large (+55%) */
html[data-text-size="xl"]{font-size:24.5px}
html[data-text-size="xl"] body{font-size:24.5px}
html[data-text-size="xl"] .hero h1{font-size:29px}
html[data-text-size="xl"] .hero p{font-size:18px}
html[data-text-size="xl"] .day h2{font-size:27px}
html[data-text-size="xl"] .place-title h3,
html[data-text-size="xl"] .plain-title h3,
html[data-text-size="xl"] .flight-airport span{font-size:23px!important;line-height:1.25!important}
html[data-text-size="xl"] time,
html[data-text-size="xl"] .stop time,
html[data-text-size="xl"] .stop time *,
html[data-text-size="xl"] .flight-airport time,
html[data-text-size="xl"] .time-start,
html[data-text-size="xl"] .time-sep,
html[data-text-size="xl"] .time-end{font-size:19px!important;line-height:1.2!important}
:is(html,body)[data-text-size="xl"] :is(.timeline,.default) .time-end{font-size:16px!important}
:is(html,body)[data-text-size="xl"] :is(.timeline-step,.stop) .marker,
html[data-text-size="xl"] .marker,
html[data-text-size="xl"] .flight-number{font-size:15.5px!important;width:26px!important;height:26px!important}
html[data-text-size="xl"] .detail p,html[data-text-size="xl"] .notes-card-inner,html[data-text-size="xl"] .pack-name,html[data-text-size="xl"] .flight-detail,html[data-text-size="xl"] .flight-detail *{font-size:20px!important}
html[data-text-size="xl"] .kind,html[data-text-size="xl"] .leg,html[data-text-size="xl"] .flight-middle,html[data-text-size="xl"] .flight-middle *,html[data-text-size="xl"] .flight-duration,html[data-text-size="xl"] .website{font-size:18px!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab,
:is(html,body)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab,
:is(html,body)[data-text-size="xl"] .day-tab{height:44px!important;min-width:60px!important;padding:5px 11px!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab-num,
:is(html,body)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab-num,
:is(html,body)[data-text-size="xl"] .day-tab-num{font-size:17px!important;line-height:1.15!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab-date,
:is(html,body)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab-date,
:is(html,body)[data-text-size="xl"] .day-tab-date{font-size:14px!important;line-height:1.1!important}
:is(.timeline,.default,.tab,.compact,.schedule,.ticket,.rail,.hub,.booklet,.story)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab > .day-tab-num:only-child,
:is(html,body)[data-text-size="xl"] :is(.day-nav,.subnav-itinerary) .day-tab > .day-tab-num:only-child,
:is(html,body)[data-text-size="xl"] .day-tab > .day-tab-num:only-child{font-size:17.5px!important}
html[data-text-size="xl"] .feature-nav .nav-text{font-size:14.5px!important}
html[data-text-size="xl"] .pack-item,html[data-text-size="xl"] .pack-item span{font-size:20px!important;line-height:1.35!important}
html[data-text-size="xl"] .pack-item{padding:12px 0}
html[data-text-size="xl"] .pack-item input[type="checkbox"]{width:24px;height:24px}
html[data-text-size="xl"] .count-badge{font-size:15px!important;padding:4px 9px!important}
html[data-text-size="xl"] .expense-page-head h2{font-size:26px!important}
html[data-text-size="xl"] .tcard span{font-size:16.5px!important}
html[data-text-size="xl"] .tcard b{font-size:28px!important}
html[data-text-size="xl"] .tcard b small{font-size:17px!important}
html[data-text-size="xl"] .cur-switcher-row span{font-size:16.5px!important}
html[data-text-size="xl"] .cur-pill{font-size:15.5px!important;padding:5px 12px!important}
html[data-text-size="xl"] .efilter-select-wrap select{height:44px!important;font-size:18px!important}
html[data-text-size="xl"] .chart-header{font-size:19px!important}
html[data-text-size="xl"] .donut-leg-item,html[data-text-size="xl"] .donut-label,html[data-text-size="xl"] .donut-amt{font-size:16.5px!important}
html[data-text-size="xl"] .donut-pct{font-size:14px!important}
html[data-text-size="xl"] .rank-bar-row,html[data-text-size="xl"] .daily-bar-row,html[data-text-size="xl"] .rank-name,html[data-text-size="xl"] .daily-name,html[data-text-size="xl"] .rank-val,html[data-text-size="xl"] .daily-val{font-size:17px!important}
html[data-text-size="xl"] .block-header strong{font-size:21px!important}
html[data-text-size="xl"] .block-sub{font-size:15px!important}
html[data-text-size="xl"] .sp-name{font-size:17px!important}
html[data-text-size="xl"] .sp-net{font-size:19px!important}
html[data-text-size="xl"] .sp-detail{font-size:15px!important}
html[data-text-size="xl"] .transfer-arrow{font-size:17.5px!important}
html[data-text-size="xl"] .transfer-amt{font-size:19.5px!important}
html[data-text-size="xl"] .eday summary{font-size:18px!important;padding:14px 16px!important}
html[data-text-size="xl"] .eday summary b{font-size:19px!important}
html[data-text-size="xl"] .rrow-title{font-size:19px!important}
html[data-text-size="xl"] .rrow-cat{font-size:15px!important;padding:3px 8px!important}
html[data-text-size="xl"] .rrow-sub{font-size:15.5px!important}
html[data-text-size="xl"] .rrow-primary{font-size:19px!important}
html[data-text-size="xl"] .rrow-hint{font-size:13px!important}
html[data-text-size="xl"] .expense-title h2{font-size:25px!important}
html[data-text-size="xl"] .sec-label{font-size:16px!important}
html[data-text-size="xl"] .expense-cat-btn,html[data-text-size="xl"] .expense-payer-btn,html[data-text-size="xl"] .participant-chip,html[data-text-size="xl"] .participant-all-toggle{font-size:17.5px!important;padding:8px 16px!important}
html[data-text-size="xl"] .currency-tag{font-size:17.5px!important}
html[data-text-size="xl"] .currency-val,html[data-text-size="xl"] .expense-description,html[data-text-size="xl"] .expense-payer,html[data-text-size="xl"] .expense-time,html[data-text-size="xl"] .select-wrap select{font-size:19px!important;min-height:46px!important}
html[data-text-size="xl"] .expense-save,html[data-text-size="xl"] .expense-delete-btn{font-size:20px!important;padding:15px!important}
html[data-text-size="xl"] .note-body,html[data-text-size="xl"] .ref-group-title{font-size:19px!important}
html[data-text-size="xl"] .itinerary-card-scroll{padding-bottom:calc(82px + var(--safe-bottom))!important}
html[data-text-size="xl"] .stop-top{flex-wrap:wrap;gap:2px 8px}
html[data-text-size="xl"] .stop-top time{margin-left:auto}
:is(html,body)[data-text-size="xl"].timeline .timeline-step .stop,
:is(html,body)[data-text-size="xl"].timeline .flight-line,
:is(html,body)[data-text-size="xl"].default .timeline-step .stop,
:is(html,body)[data-text-size="xl"].default .flight-line,
html[data-text-size="xl"] :is(.timeline,.default) .timeline-step .stop,
html[data-text-size="xl"] :is(.timeline,.default) .flight-line{grid-template-columns:66px 26px 1fr!important;column-gap:8px!important}
:is(html,body)[data-text-size="xl"].timeline .timeline-step .stop .marker,
:is(html,body)[data-text-size="xl"].default .timeline-step .stop .marker,
html[data-text-size="xl"] :is(.timeline,.default) .timeline-step .stop .marker{width:26px!important;height:26px!important;font-size:15.5px!important}
:is(html,body)[data-text-size="xl"].timeline .timeline-step:not(:last-child)::before,
:is(html,body)[data-text-size="xl"].default .timeline-step:not(:last-child)::before,
html[data-text-size="xl"] :is(.timeline,.default) .timeline-step:not(:last-child)::before{left:86px!important}
:is(html,body)[data-text-size="xl"].timeline .leg,
:is(html,body)[data-text-size="xl"].timeline .flight-middle,
:is(html,body)[data-text-size="xl"].default .leg,
:is(html,body)[data-text-size="xl"].default .flight-middle,
html[data-text-size="xl"] :is(.timeline,.default) .leg,
html[data-text-size="xl"] :is(.timeline,.default) .flight-middle{margin-left:74px!important;max-width:calc(100% - 80px)!important;border-radius:14px!important;flex-wrap:wrap!important}
:is(html,body)[data-text-size="xl"] :is(.compact,.tab) .leg,
:is(html,body)[data-text-size="xl"] :is(.compact,.tab) .flight-middle{margin-left:50px!important;max-width:calc(100% - 56px)!important;border-radius:14px!important;flex-wrap:wrap!important}
:is(html,body)[data-text-size="xl"].timeline .flight-detail,
:is(html,body)[data-text-size="xl"].default .flight-detail,
html[data-text-size="xl"] :is(.timeline,.default) .flight-detail{margin-left:100px!important}
:is(html,body)[data-text-size="xl"].rail .stop,
html[data-text-size="xl"] .rail .stop{grid-template-columns:78px 1fr!important}
:is(html,body)[data-text-size="xl"].rail .leg,
:is(html,body)[data-text-size="xl"].rail .flight-stop,
html[data-text-size="xl"] .rail .leg,
html[data-text-size="xl"] .rail .flight-stop{margin-left:90px!important}
:is(html,body)[data-text-size="xl"].classic .stop,
html[data-text-size="xl"] .classic .stop{grid-template-columns:32px 1fr!important;gap:12px!important}
:is(html,body)[data-text-size="xl"].classic .timeline-step .stop .marker,
html[data-text-size="xl"] .classic .timeline-step .stop .marker{width:28px!important;height:28px!important;font-size:15.5px!important}
:is(html,body)[data-text-size="xl"].classic .timeline-step:not(:last-child)::before,
html[data-text-size="xl"] .classic .timeline-step:not(:last-child)::before{left:15px!important}
:is(html,body)[data-text-size="xl"].classic .leg,
html[data-text-size="xl"] .classic .leg{padding-left:44px!important}

`;

  // Decide the initial day in the head, before itinerary markup is streamed.
  const bootDayStyle = `<style id="travel-boot-day">.feature-page[id^="itinerary-"] > .day{display:none!important}.feature-page[id^="itinerary-"] > #day-1-zh,.feature-page[id^="itinerary-"] > #day-1-en{display:block!important}</style><script>(()=>{const dates=${JSON.stringify(trip.days.map(day => day.date || "")).replace(/</g, "\\u003c")};const now=new Date();const today=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");const override=${Number(mapAssets.initialDay) || 0};const day=override>=1&&override<=dates.length?override:Math.max(1,dates.indexOf(today)+1);document.getElementById("travel-boot-day").textContent='.feature-page[id^="itinerary-"] > .day{display:none!important}.feature-page[id^="itinerary-"] > #day-'+day+'-zh,.feature-page[id^="itinerary-"] > #day-'+day+'-en{display:block!important}';try{const s=localStorage.getItem("travel-font-size");if(s==="lg"||s==="xl")document.documentElement.dataset.textSize=s;}catch(e){}})()</script>`;
  const themeMetaColor = previewThemeMetaColor(theme);
  return `<!doctype html><html lang="${initialLanguage === "en" ? "en" : "zh-Hant"}" class="${STYLE_ROOT_CLASS(theme)}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no,viewport-fit=cover"><meta name="apple-mobile-web-app-capable" content="yes"><meta name="apple-mobile-web-app-status-bar-style" content="default"><meta name="apple-mobile-web-app-title" content="${escapeHtml(trip.appName || trip.title || trip.destination || "未命名旅程")}"><meta name="mobile-web-app-capable" content="yes"><meta name="theme-color" content="${themeMetaColor}"><link rel="apple-touch-icon" href="./apple-touch-icon.png"><link rel="manifest" href="./manifest.webmanifest"><title>${escapeHtml(trip.title || trip.appName || trip.destination || "未命名旅程")}</title><style>
*{box-sizing:border-box}input,select,textarea{font-size:16px}html{scrollbar-width:none;-ms-overflow-style:none;touch-action:pan-y;-webkit-text-size-adjust:100%}html::-webkit-scrollbar,body::-webkit-scrollbar{display:none;width:0;height:0}body{margin:0;overflow-x:hidden;background:#faf6f0;color:#352b23;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.45;touch-action:pan-y;-webkit-text-size-adjust:100%}.safari-scroll-indicator{position:fixed;right:2px;top:0;width:3.5px;min-height:24px;border-radius:999px;background:rgba(0,0,0,.38);pointer-events:none;z-index:38;opacity:0;transition:opacity .25s ease}.safari-scroll-indicator.visible{opacity:1}.wrap{max-width:720px;margin:auto;padding:0 16px calc(76px + var(--safe-bottom))}.hero{padding:10px 4px 8px;border-bottom:1px solid #e6d4c2;position:sticky;top:0;z-index:30;background:#faf6f0}.hero-row{display:none}.hero h1{font-size:20px;line-height:1.2;margin:0 0 2px}.hero p{margin:0 0 4px;color:#7b6754;font-size:12.5px}.lang-toggle{display:none!important}.day{scroll-margin-top:135px;background:#fff;border:1px solid #e7d7c7;border-radius:15px;margin-top:15px;padding:16px;box-shadow:0 1px 2px #49301b0a}.day-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:1px solid #eee0d3;padding-bottom:12px;margin-bottom:12px;flex-wrap:wrap}.day-head span{font-size:13px;color:#7a6652}.day h2{font-size:18px;line-height:1.3;margin:3px 0 0}.route{flex:none;color:#1859a9;text-decoration:underline;font-size:13px}.timeline-step{position:relative}.timeline-step:not(:last-child)::before{content:"";position:absolute;left:12px;top:14px;bottom:-14px;width:2px;background:#e5bc98;z-index:1}.stop{position:relative;z-index:2;display:grid;grid-template-columns:28px 1fr;gap:10px;padding:5px 0}.marker,.flight-number{position:relative;z-index:2;background:#fce4ce;color:#b54a14;border-radius:50%;width:25px;height:25px;display:grid;place-items:center;font-size:12px;font-weight:700}.marker.ref-star-btn{border:none;cursor:pointer;padding:0;user-select:none;-webkit-tap-highlight-color:transparent;transition:all .15s ease}.marker.ref-star-btn:active{transform:scale(.9)}.marker.ref-star-btn.is-starred{background:#b54a14!important;color:#fff!important;box-shadow:0 2px 5px rgba(181,74,20,.3)}.stop-top{display:flex;justify-content:space-between;align-items:baseline;gap:8px}.place-title{flex:1 1 auto;display:flex;align-items:center;gap:6px;min-width:0}a.place-title,.place-title[href]{color:#1859a9;text-decoration:underline}div.place-title{color:#352b23;text-decoration:none}.place-title h3,.plain-title h3{font-size:15px;font-weight:500;margin:0;overflow-wrap:anywhere;color:inherit}.type-icon{font-size:15px}.stop time{flex:0 0 auto;font-size:13px;color:#746354;white-space:nowrap;text-align:right}.kind{display:block;color:#93663f;font-size:12px;margin-top:2px}.detail p{font-size:13px;color:#655343;margin:4px 0}.website{display:inline-block;margin-top:6px;font-size:13px;color:#1859a9;text-decoration:underline}.leg{position:relative;z-index:2;display:flex;align-items:baseline;margin:4px 0 6px 0;padding:2px 0 4px 38px;color:#b54a14;font-size:12px;text-decoration:none}a.leg-mode{color:#1859a9;text-decoration:underline;font-weight:400}span.leg-mode{color:#746354;text-decoration:none;font-weight:400}.flight-stop{position:relative;z-index:2;padding-top:8px}.flight-route{min-width:0}.flight-airport{display:flex;justify-content:space-between;align-items:baseline;gap:12px;min-height:25px;flex-wrap:wrap}.flight-airport span{font-size:15px;font-weight:500}.flight-airport time{font-size:13px;color:#746354;white-space:nowrap}.flight-middle{position:relative;z-index:2;display:flex;justify-content:flex-start;align-items:baseline;gap:6px;padding:2px 0 2px 38px;color:#b54a14;font-size:13px;text-decoration:none;flex-wrap:wrap}.flight-middle span{font-weight:500}.inline-flight-number{display:inline-grid;vertical-align:middle;margin-right:7px}.empty{color:#84715e}.day-nav{display:flex;gap:6px;overflow-x:auto;padding:4px 0 2px;scrollbar-width:none;-webkit-overflow-scrolling:touch;cursor:grab;user-select:none;touch-action:pan-x;overscroll-behavior-x:contain;overscroll-behavior-y:none;-webkit-user-drag:none;user-drag:none}.day-nav.is-dragging{cursor:grabbing}.day-nav::-webkit-scrollbar{display:none}.day-tab{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;flex:none;min-width:44px;padding:3px 7px;border:1px solid #dec5ae;border-radius:9px;background:#fff;color:#7b6754;text-decoration:none!important;line-height:1.2;transition:all .15s ease;touch-action:pan-x;-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}.day-tab-num{font-size:11.5px;font-weight:700;display:block;line-height:1.2}.day-tab-date{font-size:9.5px;font-weight:500;color:#8c7662;display:block;line-height:1.1}.day-tab.active{background:#b54a14!important;border-color:#b54a14!important;color:#fff!important;font-weight:600}.day-tab.active .day-tab-date{color:#fce4ce!important}@media(max-width:370px){.day-head{display:block}.day-actions{justify-content:flex-start;margin-top:10px}}

${flightCss}</style>${appStyles}${style}<style>${itineraryLayoutCss}${mapGesturesCss}${textSizeCss}</style>${bootDayStyle}</head><body><div id="safari-scroll-indicator" class="safari-scroll-indicator" aria-hidden="true"></div><main class="wrap"><header class="hero"><div class="hero-top"><h1>${escapeHtml(trip.title || "未命名旅程")}</h1><button type="button" class="text-size-btn" id="text-size-toggle" aria-label="字體大小：預設" title="字體大小：預設"><svg class="text-size-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3.5 18L8.2 5.5h1.6L14.5 18"/><path d="M5.5 13.5h7"/><path d="M21 11v7"/><path d="M21 14.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0z"/></svg></button></div><div class="hero-meta"><p class="hero-subline"><span class="hero-dates">${escapeHtml([trip.startDate, trip.endDate].filter(Boolean).join(" — "))}</span>${trip.destination ? `<span class="hero-dest-sep"> · </span><span class="hero-dest">${escapeHtml(trip.destination)}</span>` : ""}</p>${trip.note ? `<p class="hero-note">${escapeHtml(trip.note)}</p>` : `<p class="hero-note" style="display:none"></p>`}</div><div class="hero-day-nav">${topNavigation(initialLanguage)}</div></header><div id="mobile-content">${languageContent}</div></main>${expenseModalHtml(initialLanguage)}${settlementModalHtml(initialLanguage)}${imageLightboxHtml(initialLanguage)}<script>(function(){
  document.addEventListener("gesturestart", function(e) {
    if (e.target && e.target.closest && e.target.closest("#global-image-lightbox")) return;
    e.preventDefault();
  });
  let lang = "${initialLanguage}";
  const legacyKey = "travel-preview:${escapeHtml([trip.title,trip.startDate,trip.endDate].join("|"))}";
  const identity = ${JSON.stringify(trip.tripId || trip.days[0]?.id || [trip.title,trip.startDate,trip.endDate].join("|")).replace(/</g, "\\u003c")};
  const key = document.querySelector('meta[name="travel-pwa"]') && !${Boolean(mapAssets.editorPreview)} ? "travel-preview-scope:" + location.pathname.replace(/index\.html$/, "") + ":" + identity : "travel-preview-id:" + identity;
  const content = document.getElementById("mobile-content");
  const heroDayNav = document.querySelector(".hero-day-nav");
  const itineraryLayout = (${installItineraryLayout.toString()})(content);
  (${installMapGestures.toString()})(content);
  const EDITOR_PREVIEW = ${Boolean(mapAssets.editorPreview)};
  let SHARED_TRIP = ${JSON.stringify({...trip, sharedSync: undefined}).replace(/</g, "\\u003c")};
  window.__travelSharedTrip = SHARED_TRIP;
  window.__travelPreviewEditing = ${Boolean(mapAssets.previewEditing)};
  const INITIAL_DAY = ${Number(mapAssets.initialDay) || 0};
  let INITIAL_PREVIEW_STATE = ${JSON.stringify(trip.previewState || null).replace(/</g, "\\u003c")};
  let INITIAL_PACKING = ${JSON.stringify(Object.fromEntries((trip.packingGroups || []).flatMap(group => (group.items || []).map(item => [item.id, Boolean(item.checked)])))).replace(/</g, "\\u003c")};
  let INITIAL_REFERENCES = ${JSON.stringify(Object.fromEntries((trip.references || []).map(item => [item.id, Boolean(item.checked)]))).replace(/</g, "\\u003c")};
  const transferTools = (${createMobileTransferTools.toString()})();
  let transferTrip = ${JSON.stringify({ title: trip.title || "", startDate: trip.startDate || "", endDate: trip.endDate || "", days: (trip.days || []).map(day => ({ id: day.id, date: day.date })), settings: { travelers: membersActive }, packingGroups: trip.packingGroups || [] }).replace(/</g, "\\u003c")};
  const initialExpenses = (INITIAL_PREVIEW_STATE?.expenses || ${JSON.stringify(trip.expenses || []).replace(/</g, "\\u003c")}).map(row => transferTools.expense(row, ${JSON.stringify(homeCurrency)}));
  window.__travelPublishedPreviewState = JSON.parse(JSON.stringify({packing: INITIAL_PACKING, references: INITIAL_REFERENCES, expenses: initialExpenses}));
  const runtimeStorage = (${createRuntimeStorage.toString()})({
    key, legacyKey, legacyKeys: ["travel-preview-id:" + identity], editor: EDITOR_PREVIEW, authoritative: Boolean(INITIAL_PREVIEW_STATE),
    initial: { ":packing": INITIAL_PACKING, ":references": INITIAL_REFERENCES, ":expenses": initialExpenses, ":deleted-expenses": [] },
    storage: () => localStorage,
    onFailure: () => alert(lang === "en" ? "Your browser could not save this change. It is kept on this page for now. Share expenses & checklist before closing to avoid losing it." : "瀏覽器未能保存這次變更，目前暫留在此頁。請在關閉前使用「分享記帳與清單」備份，以免遺失。")
  });
  const read = suffix => runtimeStorage.read(suffix);
  const write = (suffix, value) => runtimeStorage.write(suffix, value);
  const mountMobileShare = (${installMobileShare.toString()})({ tools: transferTools, trip: transferTrip,
    baseline: () => ({ packing: INITIAL_PACKING, expenses: [...new Map([...read(":deleted-expenses"), ...initialExpenses].map(row => [row.id, row])).values()] }),
    readState: () => window.getTravelPreviewState() });
  const now = () => {
    const d = new Date(), o = d.getTimezoneOffset() * 60000;
    return new Date(d - o).toISOString().slice(0, 16);
  };
  const nowTime = () => {
    const d = new Date();
    return ("0" + d.getHours()).slice(-2) + ":" + ("0" + d.getMinutes()).slice(-2);
  };
  const formatTime = raw => {
    if (!raw) return "";
    const str = String(raw).trim();
    if (str.includes("T")) return str.slice(11, 16);
    const m = str.match(/^(\d{1,2}):(\d{2})$/);
    if (m) {
      const h = Number(m[1]), min = Number(m[2]);
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return ("0" + h).slice(-2) + ":" + m[2];
      return str;
    }
    if (/^\d{4}$/.test(str)) {
      const h = Number(str.slice(0, 2)), min = Number(str.slice(2, 4));
      if (h >= 0 && h <= 23 && min >= 0 && min <= 59) return ("0" + h).slice(-2) + ":" + str.slice(2, 4);
    }
    if (/^\d{3}$/.test(str)) {
      const h = Number(str.slice(0, 1)), min = Number(str.slice(1, 3));
      if (h >= 0 && h <= 9 && min >= 0 && min <= 59) return "0" + h + ":" + str.slice(1, 3);
    }
    return str.slice(0, 5);
  };
  function attachModalTimeAutoFormat(input) {
    if (!input || input._boundAutoFormat) return;
    input._boundAutoFormat = true;
    input.addEventListener("input", function() {
      var val = input.value.trim();
      if (/^\d{4}$/.test(val)) {
        setTimeout(function() {
          if (/^\d{4}$/.test(input.value)) {
            var f = formatTime(input.value);
            if (f !== input.value) input.value = f;
          }
        }, 0);
      }
    });
    input.addEventListener("change", function() {
      var f = formatTime(input.value);
      if (f !== input.value) input.value = f;
    });
    input.addEventListener("blur", function() {
      var f = formatTime(input.value);
      if (f !== input.value) input.value = f;
    });
  }
  const fmt = n => Number(n || 0).toLocaleString("zh-TW", { maximumFractionDigits: 2 });
  const esc = s => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

  function bindSafariScrollbar() {
    var bar = document.getElementById("safari-scroll-indicator");
    if (!bar) return;
    var timer = null;
    function update() {
      var doc = document.documentElement;
      var scrollHeight = doc.scrollHeight;
      var clientHeight = window.innerHeight || doc.clientHeight;
      var scrollable = scrollHeight - clientHeight;
      if (scrollable <= 4) { bar.classList.remove("visible"); return; }
      var nav = document.querySelector(".feature-nav");
      var bottomInset = (nav && nav.offsetHeight) ? nav.offsetHeight : 62;
      var topInset = 6;
      var trackHeight = Math.max(60, clientHeight - bottomInset - topInset);
      var scrollY = window.scrollY || doc.scrollTop || 0;
      var thumbHeight = Math.max(20, Math.round((trackHeight / scrollHeight) * trackHeight));
      var maxThumbTop = trackHeight - thumbHeight;
      var thumbTop = topInset + Math.min(maxThumbTop, Math.max(0, Math.round((scrollY / scrollable) * maxThumbTop)));
      bar.style.height = thumbHeight + "px";
      bar.style.transform = "translateY(" + thumbTop + "px)";
      bar.classList.add("visible");
      clearTimeout(timer);
      timer = setTimeout(function() { bar.classList.remove("visible"); }, 800);
    }
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
  }

  function bindSheetScrollbar() {
    var modals = document.querySelectorAll(".expense-modal");
    modals.forEach(function(modal) {
      var sheet = modal.querySelector(".expense-sheet");
      var bar = modal.querySelector(".modal-scroll-indicator");
      if (!sheet || !bar) return;
      var timer = null;
      function update() {
        var scrollHeight = sheet.scrollHeight;
        var clientHeight = sheet.clientHeight;
        var scrollable = scrollHeight - clientHeight;
        if (scrollable <= 4) { bar.classList.remove("visible"); return; }
        var topInset = 16, bottomInset = 16;
        var trackHeight = Math.max(30, clientHeight - topInset - bottomInset);
        var scrollY = sheet.scrollTop || 0;
        var thumbHeight = Math.max(20, Math.round((trackHeight / scrollHeight) * trackHeight));
        var maxThumbTop = trackHeight - thumbHeight;
        var thumbTop = topInset + Math.min(maxThumbTop, Math.max(0, Math.round((scrollY / scrollable) * maxThumbTop)));
        bar.style.height = thumbHeight + "px";
        bar.style.transform = "translateY(" + thumbTop + "px)";
        bar.classList.add("visible");
        clearTimeout(timer);
        timer = setTimeout(function() { bar.classList.remove("visible"); }, 800);
      }
      sheet.addEventListener("scroll", update, { passive: true });
    });
  }

  function updateTopNav(target) {
    if (!heroDayNav) return;
    var isItinerary = target.startsWith("itinerary");
    var isRefs = target.startsWith("references");
    var isPacking = target.startsWith("packing");
    var itNav = heroDayNav.querySelector(".subnav-itinerary");
    var refNav = heroDayNav.querySelector(".subnav-references");
    var packNav = heroDayNav.querySelector(".subnav-packing");
    if (itNav) itNav.style.display = isItinerary ? "" : "none";
    if (refNav) refNav.style.display = isRefs ? "" : "none";
    if (packNav) packNav.style.display = isPacking ? "" : "none";
    heroDayNav.style.display = (isItinerary || isRefs || isPacking) ? "" : "none";
  }

  function alignMapStickyPosition() { itineraryLayout.sync(); }

  // The itinerary is usable even if the map is missing, unavailable or busy.
  function selectItineraryView(index, label = "", { resetScroll = true } = {}) {
    if (!Number.isInteger(index) || index < 1 || index > SHARED_TRIP.days.length) return;
    const isSameDay = window.__travelSelectedItineraryDay === index;
    window.__travelSelectedItineraryDay = index;
    document.querySelectorAll(".subnav-itinerary [data-day-index]").forEach(tab => {
      const active = Number(tab.dataset.dayIndex) === index - 1;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-pressed", String(active));
    });
    content.querySelectorAll(".day[id^='day-']").forEach(day => {
      const match = day.id.match(/^day-(\\d+)-/);
      day.hidden = !match || Number(match[1]) !== index;
    });
    window.scrollTo({ top: 0, behavior: "instant" });
    itineraryLayout.sync({ reset: resetScroll && !isSameDay });
    requestAnimationFrame(fitTransitPlans);
    const shells = [...content.querySelectorAll(".trip-map-shell")];
    const shell = shells.find(item => item.getBoundingClientRect().width > 0) || shells[0];
    try { shell?._selectMapView?.(index, label); }
    catch (error) {
      console.error("Map update failed; itinerary navigation remains available", error);
      window.dispatchEvent(new Event("travel-map-error"));
    }
  }
  window.selectItineraryView = selectItineraryView;

  // Keep navigation on the document: replacing/refreshing a tab must not
  // leave an element that looks bound but no longer has a click listener.
  document.addEventListener("click", event => {
    const tab = event.target?.closest?.(".subnav-itinerary [data-day-index]");
    if (!tab) return;
    event.preventDefault();
    selectItineraryView(Number(tab.dataset.dayIndex) + 1, tab.textContent.trim());
  }, true);

  function bindPages() {
    content.querySelectorAll(".trip-map-shell").forEach(shell => {
      const canvas = shell.querySelector("[data-map-canvas]");
      let views = [];
      try { views = JSON.parse(shell.dataset.mapViews || "[]"); } catch {}
      const pointsOf = index => views[index]?.points || [];
      const palette = ["#d84b42", "#2778bd", "#2b9461", "#9a55b5", "#db8a20", "#168a91", "#d34a84"];
      const byDayColor = ["match", ["get", "day"], ...palette.flatMap((color, index) => [index + 1, color]), palette[0]];
      const asStops = points => {
        const sorted = [...points].sort((a, b) => b.order - a.order);
        return { type: "FeatureCollection", features: sorted.map(point => ({ type: "Feature", properties: { day: point.day, order: point.order }, geometry: { type: "Point", coordinates: [point.lon, point.lat] } })) };
      };
      const positionMarkers = map => {
        const source = map.getSource("trip-stops"), arrows = map.getSource("trip-marker-arrows");
        if (!source) return;
        const rawPoints = pointsOf(selectedIndex);
        const ordered = [...rawPoints].sort((a, b) => a.order - b.order);
        const width = canvas.clientWidth, height = canvas.clientHeight;
        if (!width || !height) return;
        const cx = width / 2, cy = height / 2;
        const pad = 18, minX = pad, maxX = width - pad, minY = pad, maxY = height - pad;
        const placed = [];
        const arrowFeatures = [];

        ordered.forEach(point => {
          const original = [point.lon, point.lat];
          const anchor = map.project(original);
          let px = anchor.x, py = anchor.y;
          const isOffscreen = px < minX || px > maxX || py < minY || py > maxY;

          if (isOffscreen) {
            const dx = px - cx, dy = py - cy;
            let t = Infinity;
            if (dx > 0) t = Math.min(t, (maxX - cx) / dx);
            else if (dx < 0) t = Math.min(t, (minX - cx) / dx);
            if (dy > 0) t = Math.min(t, (maxY - cy) / dy);
            else if (dy < 0) t = Math.min(t, (minY - cy) / dy);
            px = cx + dx * t;
            py = cy + dy * t;
            const angle = Math.atan2(dy, dx);

            // Nudge along border if overlapping another offscreen marker
            placed.forEach(other => {
              if (other.isOffscreen && Math.hypot(px - other.x, py - other.y) < 26) {
                if (py <= minY + 4 || py >= maxY - 4) {
                  px = px < other.x ? Math.max(minX, other.x - 26) : Math.min(maxX, other.x + 26);
                } else {
                  py = py < other.y ? Math.max(minY, other.y - 26) : Math.min(maxY, other.y + 26);
                }
              }
            });

            // Triangle arrow pointing outward towards offscreen location (<O)
            const tip = map.unproject([px + 18 * Math.cos(angle), py + 18 * Math.sin(angle)]);
            const b1 = map.unproject([px + 12 * Math.cos(angle + 0.5), py + 12 * Math.sin(angle + 0.5)]);
            const b2 = map.unproject([px + 12 * Math.cos(angle - 0.5), py + 12 * Math.sin(angle - 0.5)]);
            arrowFeatures.push({
              type: "Feature",
              properties: { day: point.day, order: point.order },
              geometry: {
                type: "Polygon",
                coordinates: [[[tip.lng, tip.lat], [b1.lng, b1.lat], [b2.lng, b2.lat], [tip.lng, tip.lat]]]
              }
            });
          } else {
            // On-screen: cascading offset if too close to an earlier stop (prevents 100% masking)
            placed.forEach(other => {
              if (!other.isOffscreen && Math.hypot(px - other.x, py - other.y) < 14) {
                px = other.x + 13;
                py = other.y + 13;
              }
            });
          }

          const loc = map.unproject([px, py]);
          placed.push({
            order: point.order,
            day: point.day,
            x: px,
            y: py,
            isOffscreen,
            coordinates: [loc.lng, loc.lat]
          });
        });

        // Sort descending so Stop 1 is rendered LAST (on top of Stop 2)
        placed.sort((a, b) => b.order - a.order);
        source.setData({
          type: "FeatureCollection",
          features: placed.map(item => ({
            type: "Feature",
            properties: { day: item.day, order: item.order },
            geometry: { type: "Point", coordinates: item.coordinates }
          }))
        });
        if (arrows) {
          arrows.setData({ type: "FeatureCollection", features: arrowFeatures });
        }
      };
      const asRoutes = points => {
        const groups = new Map();
        points.forEach(point => { if (!groups.has(point.day)) groups.set(point.day, []); groups.get(point.day).push(point); });
        return { type: "FeatureCollection", features: [...groups.entries()].flatMap(([day, rows]) => {
          rows.sort((a, b) => a.order - b.order);
          return rows.slice(1).flatMap((to, index) => {
            const from = rows[index];
            // Connect adjacent itinerary stops, including airport transfers.
            // Missing/filtered stops are gaps; the flight itself has its own layer.
            if (to.order !== from.order + 1 || (from.flight && to.flight && from.flightId === to.flightId)) return [];
            return [{ type: "Feature", properties: { day }, geometry: { type: "LineString", coordinates: [[from.lon, from.lat], [to.lon, to.lat]] } }];
          });
        }) };
      };
      const asFlights = points => {
        const groups = new Map();
        points.filter(point => point.flight).forEach(point => { if (!groups.has(point.flightId)) groups.set(point.flightId, []); groups.get(point.flightId).push(point); });
        return { type: "FeatureCollection", features: [...groups.values()].filter(rows => rows.length === 2).map(rows => ({ type: "Feature", properties: { day: rows[0].day }, geometry: { type: "LineString", coordinates: rows.map(point => [point.lon, point.lat]) } })) };
      };
      let selectedIndex = views.length > 1 ? (INITIAL_DAY > 0 && INITIAL_DAY < views.length ? INITIAL_DAY : 1) : 0;
      let activeDayIndex = selectedIndex;
      const hydrateOfflineMap = () => {
        if (!shell.getBoundingClientRect().width) return;
        const image = shell.querySelector('[data-map-view-image="' + selectedIndex + '"]');
        if (!image) return;
        const source = window.__travelOfflineMapImages?.[selectedIndex];
        if (source && image.getAttribute("src") !== source) image.src = source;
        const loading = shell.querySelector('[data-offline-map-loading]');
        if (loading) loading.hidden = Boolean(image.getAttribute('src') && image.complete && image.naturalWidth);
      };
      if (canvas?.dataset.mapOffline === "1") {
        window.addEventListener('travel-offline-map-ready', hydrateOfflineMap);
        shell.querySelectorAll('[data-map-view-image]').forEach(image => image.addEventListener('load', hydrateOfflineMap));
      }
      const initialPoints = pointsOf(selectedIndex);
      const caption = shell.querySelector("[data-map-caption]");
      const bounds = points => points.reduce((value, point) => value.extend([point.lon, point.lat]), new maplibregl.LngLatBounds());
      const focusMapView = (map, index) => {
        const points = pointsOf(index);
        if (!points.length) {
          let center = [121.52, 25.04];
          try { center = JSON.parse(shell.dataset.mapCenter); } catch {}
          map.jumpTo({ center, zoom: 8 });
          return;
        }
        if (points.length > 1) map.fitBounds(bounds(points), { padding: 30, maxZoom: 12, duration: index === 0 ? 650 : 800 });
        else map.flyTo({ center: [points[0].lon, points[0].lat], zoom: 12, duration: index === 0 ? 650 : 800 });
      };
      const showMapView = (index, label = "", mapOnly = false) => {
        const previousSelectedIndex = selectedIndex;
        selectedIndex = index;
        shell.dataset.selectedMapView = String(index);
        shell.dispatchEvent(new Event("travel-map-view-change"));
        window.__travelSelectedMapView = index;
        if (!mapOnly && index > 0) activeDayIndex = index;
        shell.querySelectorAll("[data-map-scope]").forEach(button => {
          const active = button.dataset.mapScope === (index === 0 ? "all" : "day");
          button.classList.toggle("active", active); button.setAttribute("aria-pressed", String(active));
        });
        const points = pointsOf(index);
        const emptyView = shell.querySelector("[data-map-empty-view]");
        if (emptyView) emptyView.hidden = points.length > 0;
        if (caption) caption.textContent = points.length ? caption.dataset.mapDefaultCaption || "" : caption.dataset.mapEmptyCaption || "";
        const offlineImages = shell.querySelectorAll("[data-map-view-image]");
        if (offlineImages.length) {
          const animationId = (shell._offlineAnimationId || 0) + 1;
          shell._offlineAnimationId = animationId;
          const previousImage = [...offlineImages].find(image => Number(image.dataset.mapViewImage) === previousSelectedIndex && !image.hidden)
            || [...offlineImages].find(image => !image.hidden);
          const nextImage = [...offlineImages].find(image => Number(image.dataset.mapViewImage) === index);
          offlineImages.forEach(image => {
            image.getAnimations?.().forEach(animation => animation.cancel());
            image.style.zIndex = "";
            image.style.opacity = "";
            image.style.transform = "";
            const imageIndex = Number(image.dataset.mapViewImage);
            const imageSource = window.__travelOfflineMapImages?.[imageIndex];
            if (imageIndex === index && imageSource && image.getAttribute("src") !== imageSource) image.src = imageSource;
          });
          const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
          if (nextImage && previousImage && previousImage !== nextImage && !reducedMotion && typeof nextImage.animate === "function") {
            nextImage.hidden = false;
            previousImage.hidden = false;
            previousImage.style.zIndex = "1";
            nextImage.style.zIndex = "2";
            const initialScale = index === 0 ? 0.88 : 1.16;
            nextImage.style.opacity = "0";
            nextImage.style.transform = "scale(" + initialScale + ")";
            previousImage?.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 420, easing: "ease-in-out", fill: "forwards" });
            const entering = nextImage.animate(
              [{ opacity: 0, transform: "scale(" + initialScale + ")" }, { opacity: 1, transform: "scale(1)" }],
              { duration: 520, easing: "cubic-bezier(.2,.75,.25,1)", fill: "forwards" }
            );
            entering.finished.catch(() => {}).then(() => {
              if (shell._offlineAnimationId !== animationId) return;
              offlineImages.forEach(image => {
                image.hidden = image !== nextImage;
                image.style.zIndex = "";
                image.style.opacity = "";
                image.style.transform = "";
              });
            });
          } else {
            offlineImages.forEach(image => { image.hidden = image !== nextImage; });
          }
          hydrateOfflineMap();
          return;
        }
        const map = shell._tripMap;
        // Sources remain writable while tiles and GeoJSON workers are loading.
        // isStyleLoaded() can be false here and would silently drop a click.
        if (map?.getSource("trip-routes") && map.getSource("trip-stops")) {
          map.stop();
          map.getSource("trip-routes").setData(asRoutes(points));
          map.getSource("trip-flights")?.setData(asFlights(points));
          map.getSource("trip-stops").setData(asStops(points));
          focusMapView(map, index);
        }
      };
      const initializeMap = () => {
        if (!canvas || canvas.dataset.mapOffline === "1" || !window.maplibregl || canvas.dataset.mapReady || canvas.dataset.mapPending || !canvas.getBoundingClientRect().width) return;
        canvas.dataset.mapPending = "1";
        Promise.resolve(window.__travelMapSwReady).finally(() => {
          canvas.dataset.mapPending = "";
          if (!canvas.isConnected || canvas.dataset.mapReady || !canvas.getBoundingClientRect().width) return;
          canvas.dataset.mapReady = "1";
          const loading = canvas.querySelector(".trip-map-loading");
          let fallbackCenter = [121.52, 25.04];
          try { fallbackCenter = JSON.parse(shell.dataset.mapCenter || "[121.52,25.04]"); } catch {}
          const map = new maplibregl.Map({ container: canvas, style: "https://tiles.openfreemap.org/styles/liberty", center: initialPoints.length ? [initialPoints[0].lon, initialPoints[0].lat] : fallbackCenter, zoom: initialPoints.length ? 5 : 8, pixelRatio: 3, attributionControl: false, interactive: true, scrollZoom: false, boxZoom: false, dragRotate: false, keyboard: false, doubleClickZoom: false, touchPitch: false, preserveDrawingBuffer: true });
          map.on("load", () => {
            const points = pointsOf(selectedIndex);
            map.addSource("trip-routes", { type: "geojson", data: asRoutes(points) });
            map.addLayer({ id: "trip-routes", type: "line", source: "trip-routes", paint: { "line-color": byDayColor, "line-width": 3, "line-opacity": 0.84 } });
            map.addSource("trip-flights", { type: "geojson", data: asFlights(points) });
            map.addLayer({ id: "trip-flight-routes", type: "line", source: "trip-flights", paint: { "line-color": byDayColor, "line-width": 2.5, "line-opacity": 0.9, "line-dasharray": [2, 1] } });
            map.addSource("trip-marker-arrows", { type: "geojson", data: { type: "FeatureCollection", features: [] } });
            map.addLayer({ id: "trip-marker-arrows", type: "fill", source: "trip-marker-arrows", paint: { "fill-color": byDayColor, "fill-opacity": 0.95 } });
            map.addSource("trip-stops", { type: "geojson", data: asStops(points) });
            map.addLayer({ id: "trip-stop-circles", type: "circle", source: "trip-stops", paint: { "circle-radius": 13, "circle-color": byDayColor, "circle-stroke-color": "#fff", "circle-stroke-width": 2.5 } });
            map.addLayer({ id: "trip-stop-labels", type: "symbol", source: "trip-stops", layout: { "text-field": ["to-string", ["get", "order"]], "text-font": ["Open Sans Bold"], "text-size": 12, "text-allow-overlap": true }, paint: { "text-color": "#fff" } });
            if (loading) loading.remove();
            focusMapView(map, selectedIndex);
            positionMarkers(map);
          });
          map.on("move", () => positionMarkers(map));
          map.on("moveend", () => positionMarkers(map));
          map.on("error", () => { if (!map.isStyleLoaded() && loading) loading.textContent = "地圖底圖尚未載入；請先在線開啟 PWA，讓目前行程範圍完成快取。"; });
          map.touchZoomRotate?.disableRotation?.();
          shell._tripMap = map;
        });
      };
      shell._selectMapView = (index, label = "") => { initializeMap(); showMapView(index, label); };
      shell._updateMapViews = (newViews) => {
        const oldPointsStr = JSON.stringify(pointsOf(selectedIndex));
        views = newViews;
        shell.dataset.mapViews = JSON.stringify(newViews);
        const newPointsStr = JSON.stringify(pointsOf(selectedIndex));
        if (oldPointsStr !== newPointsStr) {
          showMapView(selectedIndex, "", true);
        }
      };
      shell.querySelectorAll("[data-map-scope]").forEach(button => button.addEventListener("click", () => {
        initializeMap(); showMapView(selectedIndex === 0 ? activeDayIndex : 0, "", true);
      }));
      showMapView(selectedIndex);
      initializeMap();
      if (canvas && canvas.dataset.mapOffline !== "1" && !canvas.dataset.mapReady && window.ResizeObserver) {
        const observer = new ResizeObserver(() => {
          initializeMap();
          if (canvas.dataset.mapReady) observer.disconnect();
        });
        observer.observe(canvas);
      }
    });
    window.captureOfflineMapViews = async () => {
      if (!navigator.onLine) throw new Error("匯出離線地圖圖像需要先連上網路載入底圖。");
      const shells = [...content.querySelectorAll(".trip-map-shell")];
      const shell = shells.find(item => item.getBoundingClientRect().width > 0) || shells[0];
      if (!shell) throw new Error("找不到行程地圖，無法建立離線地圖圖像。");
      shell._selectMapView?.(0);
      const deadline = Date.now() + 45000;
      let map = shell._tripMap;
      while ((!map || !map.isStyleLoaded?.() || !map.getSource("trip-stops")) && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 100));
        map = shell._tripMap;
      }
      if (!map || !map.isStyleLoaded?.() || !map.getSource("trip-stops")) throw new Error("真實底圖載入逾時，請確認網路後再匯出 PWA。");
      const waitForIdle = () => new Promise((resolve, reject) => {
        let finished = false;
        const finish = error => { if (finished) return; finished = true; clearTimeout(timer); map.off("idle", onIdle); error ? reject(error) : resolve(); };
        const onIdle = () => finish();
        const timer = setTimeout(() => finish(new Error("地圖圖磚尚未載完，請等底圖顯示完成後重試匯出。")), 30000);
        map.on("idle", onIdle);
        if (map.loaded() && !map.isMoving() && map.areTilesLoaded()) requestAnimationFrame(onIdle);
      });
      const images = [];
      const count = JSON.parse(shell.dataset.mapViews || "[]").length;
      const originalPixelRatio = map.getPixelRatio?.() || window.devicePixelRatio || 1;
      try {
        // Render at 6x for roughly 2x zoom on a 3x-density phone.
        // Bound the backing canvas to avoid excessive GPU allocations.
        const canvasSize = map.getCanvas().getBoundingClientRect();
        const captureRatio = Math.min(6, 4096 / Math.max(1, canvasSize.width, canvasSize.height));
        map.setPixelRatio?.(captureRatio);
        for (let index = 0; index < count; index += 1) {
          shell._selectMapView?.(index);
          await waitForIdle();
          const image = map.getCanvas().toDataURL("image/webp", 0.98);
          if (!image.startsWith("data:image/") || image.length < 5000) throw new Error("第 " + (index === 0 ? "總覽" : index + " 天") + " 地圖圖像未完整產生；請確認底圖已載入後重試。");
          images.push(image);
        }
      } finally {
        map.setPixelRatio?.(originalPixelRatio);
        shell._selectMapView?.(0);
      }
      return images;
    };
    content.querySelectorAll("[data-feature-target]").forEach(button => button.addEventListener("click", function(e) {
      e.preventDefault();
      const target = button.dataset.featureTarget;
      content.querySelectorAll(".feature-page").forEach(page => page.classList.toggle("active", page.id === target));
      content.querySelectorAll("[data-feature-target]").forEach(item => item.classList.toggle("active", item === button));
      updateTopNav(target);
      if (target.startsWith("itinerary")) { alignMapStickyPosition(); requestAnimationFrame(fitTransitPlans); }
      if (target.startsWith("expenses")) {
        renderExpenseReport();
      }
      window.scrollTo({ top: 0, behavior: "instant" });
      itineraryLayout.sync();
    }));

  }

  function bindTransitModals() {
    document.querySelectorAll("body > .transit-modal").forEach(m => m.remove());
    content.querySelectorAll(".leg-detail-trigger").forEach(link => {
      const modal = link.parentElement ? link.parentElement.querySelector(".transit-modal") : null;
      if (!modal) return;
      document.body.appendChild(modal);
      link.onclick = e => {
        e.preventDefault();
        e.stopPropagation();
        modal.classList.add("active");
      };
      modal.querySelectorAll(".transit-modal-close, .transit-modal-btn-close").forEach(btn => {
        btn.onclick = e => {
          e.preventDefault();
          modal.classList.remove("active");
        };
      });
      modal.onclick = e => {
        if (e.target === modal) modal.classList.remove("active");
      };
    });
    window.addEventListener("keydown", function(e) {
      if (e.key === "Escape") {
        document.querySelectorAll(".transit-modal.active").forEach(m => m.classList.remove("active"));
      }
    });
  }

  // Exported responsive CSS decides the route presentation before first paint.
  function fitTransitPlans() {}

  function bindPacking() {
    const packed = read(":packing", {});
    function refreshPackingBadges() {
      const groups = document.querySelectorAll(".packing-cards-wrap .day");
      let totalAllBoxes = 0;
      let totalAllChecked = 0;
      groups.forEach(function(groupEl, idx) {
        const gNum = idx + 1;
        const boxes = groupEl.querySelectorAll('input[type="checkbox"]');
        const total = boxes.length;
        let checkedCount = 0;
        boxes.forEach(function(b) { if (b.checked) checkedCount++; });
        totalAllBoxes += total;
        totalAllChecked += checkedCount;
        const ratioStr = checkedCount + "/" + total;
        const isAll = total > 0 && checkedCount === total;

        const headBadge = groupEl.querySelector(".pack-group-badge");
        if (headBadge) {
          headBadge.textContent = ratioStr;
          headBadge.classList.toggle("is-all-checked", isAll);
        }
        const navBadge = document.querySelector('.pack-nav-badge[data-group-badge="' + gNum + '"]');
        if (navBadge) {
          navBadge.textContent = ratioStr;
          navBadge.classList.toggle("is-all-checked", isAll);
        }
      });
      var mCount = document.querySelector(".mpack-checked-count");
      var mFill = document.querySelector(".mpack-progress-fill");
      if (mCount) mCount.textContent = totalAllChecked;
      if (mFill && totalAllBoxes > 0) {
        var pct = Math.round((totalAllChecked / totalAllBoxes) * 100);
        mFill.style.width = pct + "%";
      }
          }

    content.querySelectorAll("[data-pack-id]").forEach(box => {
      if (box.dataset.packId in packed) {
        box.checked = Boolean(packed[box.dataset.packId]);
      } else {
        box.checked = !EDITOR_PREVIEW && runtimeStorage.hasSaved(":packing") ? false : Boolean(INITIAL_PACKING[box.dataset.packId]);
        packed[box.dataset.packId] = box.checked;
      }
      box.onchange = () => {
        packed[box.dataset.packId] = box.checked;
        content.querySelectorAll("[data-pack-id]").forEach(other => {
          if (other.dataset.packId === box.dataset.packId) other.checked = box.checked;
        });
        write(":packing", packed);
        window.dispatchEvent(new Event("travel-preview-change"));
        refreshPackingBadges();
      };
    });
    refreshPackingBadges();

    const starred = Object.assign({}, INITIAL_REFERENCES, read(":references") || {});
    content.querySelectorAll("[data-ref-star]").forEach(btn => {
      const refId = btn.dataset.refStar;
      const isStarred = Boolean(starred[refId]);
      btn.classList.toggle("is-starred", isStarred);
      btn.textContent = isStarred ? "★" : "☆";
      btn.onclick = (e) => {
        e.preventDefault();
        starred[refId] = !starred[refId];
        content.querySelectorAll('[data-ref-star="' + refId + '"]').forEach(other => {
          other.classList.toggle("is-starred", starred[refId]);
          other.textContent = starred[refId] ? "★" : "☆";
        });
        write(":references", starred);
        window.dispatchEvent(new Event("travel-preview-change"));
      };
    });
  }

  ${expenseRuntimeScript({ homeCurrency, currencyRates, distinctCurrencies, trip, membersActive, expenseCategories, palette: previewExpensePalette(theme) })}

  function jumpToDay(index, smooth, stopId) {
    var itPage = content.querySelector("#itinerary-" + lang);
    if (itPage && !itPage.classList.contains("active")) {
      content.querySelectorAll(".feature-page").forEach(function(page) {
        page.classList.toggle("active", page.id === itPage.id);
      });
      content.querySelectorAll("[data-feature-target]").forEach(function(item) {
        item.classList.toggle("active", item.dataset.featureTarget === itPage.id);
      });
      updateTopNav(itPage.id);
    }
    window.selectItineraryView(index + 1, "", { resetScroll: !stopId });
    highlightDayTab(index);
    if (stopId) {
      setTimeout(function() {
        var stopEl = content.querySelector("#preview-stop-" + stopId);
        if (stopEl) {
          var scrollContainer = stopEl.closest(".itinerary-card-scroll");
          if (scrollContainer) {
            var elTop = stopEl.offsetTop - scrollContainer.offsetTop;
            try { scrollContainer.scrollTo({ top: Math.max(0, elTop - 12), behavior: "smooth" }); }
            catch (e) { scrollContainer.scrollTop = Math.max(0, elTop - 12); }
          } else {
            try { stopEl.scrollIntoView({ behavior: "smooth", block: "center" }); }
            catch (e) { stopEl.scrollIntoView(); }
          }
        }
      }, 50);
    }
  }

  function highlightDayTab(index) {
    var nav = document.querySelector(".subnav-itinerary");
    if (!nav) return;
    var tabs = nav.querySelectorAll(".day-tab");
    for (var i = 0; i < tabs.length; i++) { tabs[i].classList.toggle("active", i === index); }
    var activeTab = nav.querySelector('.day-tab[data-day-index="' + index + '"]');
    if (activeTab) {
      var navRect = nav.getBoundingClientRect();
      var tabRect = activeTab.getBoundingClientRect();
      var offset = tabRect.left - navRect.left - (navRect.width / 2) + (tabRect.width / 2);
      nav.scrollLeft += offset;
    }
  }

  window.jumpToDay = jumpToDay;
  window.jumpToStop = function(dayIndex, stopId) {
    jumpToDay(dayIndex, true, stopId);
  };
  window.jumpToFeature = function(featureName) {
    var btn = content.querySelector('[data-feature-target="' + featureName + '-' + lang + '"]');
    if (btn) btn.click();
  };

  function findTodayDayIndex() {
    var now = new Date(), mon = ("0" + (now.getMonth() + 1)).slice(-2), dd = ("0" + now.getDate()).slice(-2);
    var todayStr = now.getFullYear() + "-" + mon + "-" + dd;
    var tabs = document.querySelectorAll(".day-tab");
    for (var i = 0; i < tabs.length; i++) {
      if (tabs[i].getAttribute("data-day-date") === todayStr) return i;
    }
    return 0;
  }

  const navBindings = new Map();
  function navListener(key) {
    navBindings.get(key)?.abort();
    const controller = new AbortController(); navBindings.set(key,controller);
    return (type,handler,options={}) => window.addEventListener(type,handler,{...options,signal:controller.signal});
  }
  function bindDayNav() {
    var nav = document.querySelector(".subnav-itinerary");
    if (!nav) return;
    const listenWindow = navListener('itinerary');
    nav.addEventListener("wheel", function(e) {
      if (e.deltaY && !e.deltaX) { nav.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    var isDown = false, startX = 0, startScrollLeft = 0, dragged = false;
    function cancelDrag() { isDown = false; dragged = false; nav.classList.remove("is-dragging"); }
    nav.addEventListener("dragstart", function(e) { e.preventDefault(); cancelDrag(); });
    nav.querySelectorAll(".day-tab").forEach(function(t) { t.addEventListener("dragstart", function(e) { e.preventDefault(); }); });
    listenWindow("pointercancel", cancelDrag);
    listenWindow("blur", cancelDrag);
    listenWindow("dragend", cancelDrag);
    nav.addEventListener("pointerdown", function(e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      isDown = true; dragged = false; startX = e.clientX; startScrollLeft = nav.scrollLeft;
    });
    listenWindow("pointermove", function(e) {
      if (!isDown) return;
      if (!(e.buttons & 1)) { cancelDrag(); return; }
      var dist = e.clientX - startX;
      if (Math.abs(dist) > 10) {
        dragged = true;
        nav.classList.add("is-dragging");
        nav.scrollLeft = startScrollLeft - dist;
      }
    });
    listenWindow("pointerup", function(e) {
      if (!isDown) return;
      isDown = false;
      setTimeout(function() { dragged = false; nav.classList.remove("is-dragging"); }, 100);
    });
  }

  function bindCardNav(navSelector) {
    var nav = document.querySelector(navSelector);
    if (!nav) return;
    const listenWindow = navListener(navSelector);
    nav.addEventListener("wheel", function(e) {
      if (e.deltaY && !e.deltaX) { nav.scrollLeft += e.deltaY; e.preventDefault(); }
    }, { passive: false });
    var isDown = false, startX = 0, startScrollLeft = 0, dragged = false;
    function cancelDrag() { isDown = false; dragged = false; nav.classList.remove("is-dragging"); }
    nav.addEventListener("dragstart", function(e) { e.preventDefault(); cancelDrag(); });
    nav.querySelectorAll(".day-tab").forEach(function(t) { t.addEventListener("dragstart", function(e) { e.preventDefault(); }); });
    listenWindow("pointercancel", cancelDrag);
    listenWindow("blur", cancelDrag);
    listenWindow("dragend", cancelDrag);
    nav.addEventListener("pointerdown", function(e) {
      if (e.pointerType !== "mouse" || e.button !== 0) return;
      isDown = true; dragged = false; startX = e.clientX; startScrollLeft = nav.scrollLeft;
    });
    listenWindow("pointermove", function(e) {
      if (!isDown) return;
      if (!(e.buttons & 1)) { cancelDrag(); return; }
      var dist = e.clientX - startX;
      if (Math.abs(dist) > 10) {
        dragged = true;
        nav.classList.add("is-dragging");
        nav.scrollLeft = startScrollLeft - dist;
      }
    });
    listenWindow("pointerup", function(e) {
      if (!isDown) return;
      isDown = false;
      setTimeout(function() { dragged = false; nav.classList.remove("is-dragging"); }, 100);
    });
    var tabs = nav.querySelectorAll(".day-tab[data-target-card]");
    for (var k = 0; k < tabs.length; k++) {
      (function(tab) {
        tab.addEventListener("click", function(e) {
          e.preventDefault(); e.stopPropagation();
          if (dragged) return;
          var targetId = tab.getAttribute("data-target-card");
          if (!targetId) return;
          tabs.forEach(function(t) { t.classList.toggle("active", t === tab); });
          var cardEl = content.querySelector("#" + targetId);
          if (!cardEl) return;
          var hero = document.querySelector(".hero");
          var heroH = hero ? hero.offsetHeight : 0;
          var rect = cardEl.getBoundingClientRect();
          var currentY = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0;
          var targetY = Math.max(0, rect.top + currentY - heroH - 6);
          try { window.scrollTo({ top: targetY, behavior: "smooth" }); }
          catch(err) { window.scrollTo(0, targetY); }
          try { document.documentElement.scrollTop = targetY; } catch(err) {}
          try { document.body.scrollTop = targetY; } catch(err) {}
        });
      })(tabs[k]);
    }
  }

  function render() {
    mountMobileShare();
    document.documentElement.lang = lang === "zh" ? "zh-Hant" : "en";
    bindPages();
    bindTransitModals();
    bindPacking();
    fitTransitPlans();
    bindDayNav();
    bindCardNav(".subnav-references");
    bindCardNav(".subnav-packing");
    bindSafariScrollbar();
    bindSheetScrollbar();
    bindImageLightbox();
    bindTextSizeToggle();
    // Build expense reports when entering the expense page, not during startup.
    var startDay = (INITIAL_DAY >= 1 && INITIAL_DAY <= SHARED_TRIP.days.length) ? INITIAL_DAY : (findTodayDayIndex() + 1);
    if (startDay < 1 || startDay > SHARED_TRIP.days.length) startDay = 1;
    selectItineraryView(startDay);
    itineraryLayout.sync();
  }

  function bindImageLightbox() {
    var lightbox = document.getElementById("global-image-lightbox");
    if (!lightbox) return;
    window.__travelLightboxEvents?.abort();
    const lightboxEvents = new AbortController(); window.__travelLightboxEvents = lightboxEvents;
    const bind = (node,type,handler,options={}) => node.addEventListener(type,handler,{...options,signal:lightboxEvents.signal});
    var img = lightbox.querySelector(".lightbox-img");
    var closeBtn = lightbox.querySelector(".lightbox-close");

    var scale = 1, posX = 0, posY = 0;
    var isPanning = false, startX = 0, startY = 0, initialDistance = 0, initialScale = 1;
    var lastTap = 0;

    function applyTransform(withTransition) {
      if (!img) return;
      img.style.transition = withTransition ? "transform .22s cubic-bezier(0.16, 1, 0.3, 1)" : "none";
      img.style.transform = "translate(" + posX + "px, " + posY + "px) scale(" + scale + ")";
      img.classList.toggle("is-zoomed", scale > 1.05);
    }

    function resetZoom() {
      scale = 1; posX = 0; posY = 0;
      isPanning = false; initialDistance = 0; initialScale = 1;
      applyTransform(false);
    }

    function close() {
      lightbox.classList.remove("active");
      resetZoom();
      if (img) {
        img.src = "";
        img.alt = "";
        img.style.display = "none";
      }
    }

    if (closeBtn) closeBtn.onclick = close;
    lightbox.onclick = function(e) {
      if (e.target === lightbox || e.target.classList.contains("lightbox-body")) {
        close();
      }
    };

    document.addEventListener("keydown", function(e) {
      if (e.key === "Escape" && lightbox.classList.contains("active")) {
        close();
      }
    });

    function getOptimalZoom() {
      if (img && img.naturalWidth && img.clientWidth) {
        var ratio = img.naturalWidth / img.clientWidth;
        return Math.max(2.0, Math.min(5.0, ratio));
      }
      return 2.5;
    }

    if (img) {
      // Touch Gesture Support: Pinch-to-zoom & Pan
      bind(img,"touchstart", function(e) {
        if (e.touches.length === 2) {
          isPanning = false;
          var dx = e.touches[0].clientX - e.touches[1].clientX;
          var dy = e.touches[0].clientY - e.touches[1].clientY;
          initialDistance = Math.hypot(dx, dy);
          initialScale = scale;
        } else if (e.touches.length === 1) {
          var now = Date.now();
          if (now - lastTap < 300) {
            if (scale > 1.2) {
              scale = 1; posX = 0; posY = 0;
            } else {
              scale = getOptimalZoom();
            }
            applyTransform(true);
            lastTap = 0;
            return;
          }
          lastTap = now;
          if (scale > 1.02) {
            isPanning = true;
            startX = e.touches[0].clientX - posX;
            startY = e.touches[0].clientY - posY;
          }
        }
      }, { passive: false });

      bind(img,"touchmove", function(e) {
        if (e.touches.length === 2) {
          e.preventDefault();
          var dx = e.touches[0].clientX - e.touches[1].clientX;
          var dy = e.touches[0].clientY - e.touches[1].clientY;
          var currentDist = Math.hypot(dx, dy);
          if (initialDistance > 0) {
            var newScale = initialScale * (currentDist / initialDistance);
            scale = Math.min(Math.max(newScale, 0.8), 6);
            applyTransform(false);
          }
        } else if (e.touches.length === 1 && isPanning) {
          e.preventDefault();
          posX = e.touches[0].clientX - startX;
          posY = e.touches[0].clientY - startY;
          applyTransform(false);
        }
      }, { passive: false });

      bind(img,"touchend", function(e) {
        if (scale < 1) {
          scale = 1; posX = 0; posY = 0;
          applyTransform(true);
        } else if (scale > 6) {
          scale = 6;
          applyTransform(true);
        }
        if (e.touches.length < 2) initialDistance = 0;
        if (e.touches.length === 0) isPanning = false;
      });

      // Desktop Wheel / Pointer Drag Support
      bind(img,"wheel", function(e) {
        e.preventDefault();
        var delta = e.deltaY < 0 ? 0.25 : -0.25;
        scale = Math.min(Math.max(scale + delta, 1), 6);
        if (scale <= 1) { posX = 0; posY = 0; }
        applyTransform(true);
      }, { passive: false });

      var mouseDragging = false, mouseStartX = 0, mouseStartY = 0;
      bind(img,"mousedown", function(e) {
        if (scale > 1.02 && e.button === 0) {
          mouseDragging = true;
          mouseStartX = e.clientX - posX;
          mouseStartY = e.clientY - posY;
          e.preventDefault();
        }
      });
      bind(window,"mousemove", function(e) {
        if (mouseDragging) {
          posX = e.clientX - mouseStartX;
          posY = e.clientY - mouseStartY;
          applyTransform(false);
        }
      });
      bind(window,"mouseup", function() {
        mouseDragging = false;
      });
      bind(img,"dblclick", function(e) {
        e.preventDefault();
        if (scale > 1.2) {
          scale = 1; posX = 0; posY = 0;
        } else {
          scale = getOptimalZoom();
        }
        applyTransform(true);
      });
    }

    content.querySelectorAll(".note-thumb-btn, .stop-attach-btn").forEach(function(btn) {
      btn.onclick = function(e) {
        e.preventDefault();
        e.stopPropagation();
        var src = btn.getAttribute("data-lightbox-src");
        if (!src) return;

        resetZoom();
        if (img) {
          img.src = src;
          img.alt = btn.getAttribute("data-lightbox-alt") || "attachment";
          img.style.display = "block";
        }
        lightbox.classList.add("active");
      };
    });
  }

  function bindTextSizeToggle() {
    var btn = document.getElementById("text-size-toggle");
    if (!btn) return;

    var SIZES = ["normal", "lg", "xl"];
    var LABELS = {
      normal: { titleZh: "字體大小：預設 (點擊放大)", titleEn: "Font size: Standard (click to enlarge)" },
      lg: { titleZh: "字體大小：大 (點擊特大)", titleEn: "Font size: Large (click for extra large)" },
      xl: { titleZh: "字體大小：特大 (點擊還原預設)", titleEn: "Font size: Extra Large (click to reset)" }
    };

    function updateUI(size) {
      document.documentElement.dataset.textSize = size;
      var info = LABELS[size] || LABELS.normal;
      btn.setAttribute("aria-label", lang === "en" ? info.titleEn : info.titleZh);
      btn.setAttribute("title", lang === "en" ? info.titleEn : info.titleZh);
    }

    var current = document.documentElement.dataset.textSize || "normal";
    if (!LABELS[current]) current = "normal";
    updateUI(current);

    if (btn._bound) return;
    btn._bound = true;

    btn.addEventListener("click", function(e) {
      e.preventDefault();
      e.stopPropagation();
      var cur = document.documentElement.dataset.textSize || "normal";
      var idx = SIZES.indexOf(cur);
      var next = SIZES[(idx + 1) % SIZES.length];
      updateUI(next);
      try { localStorage.setItem("travel-font-size", next); } catch(err) {}
      fitTransitPlans();
      itineraryLayout.sync();
    });
  }

  content.addEventListener("change", function(e) {
    if (e && e.target && e.target.classList && e.target.classList.contains("static-lang-input")) {
      fitTransitPlans();
      selectItineraryView(window.__travelSelectedItineraryDay || 1);
    }
  });
  window.addEventListener("resize", fitTransitPlans);
  window.addEventListener("resize", alignMapStickyPosition);
  bindExpenseGlobalEvents();
  if (EDITOR_PREVIEW) {
    window.__travelPreviewReady = true;
    window.__travelPreviewTheme = "${theme}";
    window.__travelInitialDay = INITIAL_DAY;
    window.bindPages = bindPages;
    window.bindTransitModals = bindTransitModals;
    window.bindPacking = bindPacking;
    window.fitTransitPlans = fitTransitPlans;
    window.bindDayNav = bindDayNav;
    window.bindCardNav = bindCardNav;
    window.itineraryLayout = itineraryLayout;
    window.renderExpenseReport = renderExpenseReport;
    window.bindImageLightbox = bindImageLightbox;
    window.bindTextSizeToggle = bindTextSizeToggle;
  }
  window.applyTravelSharedState = function(next) {
    INITIAL_PREVIEW_STATE = next.previewState || {};
    INITIAL_PACKING = Object.fromEntries((next.packingGroups || []).flatMap(g => (g.items || []).map(i => [i.id,Boolean(i.checked)])));
    runtimeStorage.replace(':packing', INITIAL_PREVIEW_STATE.packing || INITIAL_PACKING);
    runtimeStorage.replace(':expenses', INITIAL_PREVIEW_STATE.expenses || next.expenses || []);
    bindPacking();
    if(content.querySelector('.feature-page.active[id^="expenses-"]'))renderExpenseReport();
  };
  window.syncTravelLayout = () => itineraryLayout.sync();
  window.replaceTravelSharedTrip = function(next, html) {
    const parsed = new DOMParser().parseFromString(html, 'text/html');
    const feature = content.querySelector('.feature-page.active')?.id;
    const selected = window.__travelSelectedItineraryDay || 1;
    const all = window.__travelSelectedMapView === 0;
    const scroll = content.querySelector('.day:not([hidden]) .itinerary-card-scroll')?.scrollTop || 0;
    const pageScroll = window.scrollY;
    // Reuse map shells: their gestures and offline hydration listeners stay intact.
    const maps = [...content.querySelectorAll('.trip-map-shell')];
    content.innerHTML = parsed.getElementById('mobile-content').innerHTML;
    content.querySelectorAll('.trip-map-shell').forEach((shell,i) => { if (maps[i]) shell.replaceWith(maps[i]); });
    heroDayNav.innerHTML = parsed.querySelector('.hero-day-nav').innerHTML;
    document.querySelector('.hero-top h1').textContent = next.title || '未命名旅程';
    SHARED_TRIP = next; window.__travelSharedTrip = next;
    INITIAL_PREVIEW_STATE = next.previewState || {};
    INITIAL_PACKING = Object.fromEntries((next.packingGroups || []).flatMap(g => (g.items || []).map(i => [i.id, Boolean(i.checked)])));
    transferTrip = next;
    runtimeStorage.replace(':packing', INITIAL_PREVIEW_STATE.packing || INITIAL_PACKING);
    runtimeStorage.replace(':expenses', INITIAL_PREVIEW_STATE.expenses || next.expenses || []);
    DAYS = [{id:'day-0',date:'行前',title:'行前支出'}].concat(next.days);
    MEMBERS = next.settings?.travelers || []; CATS = next.settings?.expenseCategories || CATS;
    const modal = document.getElementById('global-expense-modal');
    const newModal = parsed.getElementById('global-expense-modal');
    if (modal && newModal) { modal.replaceWith(newModal); newModal.querySelectorAll(".expense-form").forEach(form => form.onsubmit = e => { e.preventDefault(); saveExpenseModal(form); }); }
    // Map bindings already exist. Only rebind feature buttons on the new content.
    content.querySelectorAll('[data-feature-target]').forEach(button => button.onclick = e => {
      e.preventDefault(); const target = button.dataset.featureTarget;
      content.querySelectorAll('.feature-page').forEach(p => p.classList.toggle('active', p.id === target));
      content.querySelectorAll('[data-feature-target]').forEach(b => b.classList.toggle('active', b === button));
      updateTopNav(target); if (target.startsWith('expenses')) renderExpenseReport();
      itineraryLayout.sync(); window.scrollTo(0,0);
    });
    bindTransitModals(); bindPacking(); bindDayNav(); bindCardNav('.subnav-references'); bindCardNav('.subnav-packing');
    bindImageLightbox(); bindSheetScrollbar();
    selectItineraryView(Math.min(selected, Math.max(1,next.days.length)));
    if (all) maps.find(m => m.getBoundingClientRect().width)?.querySelector('[data-map-scope="all"]')?.click();
    const card = content.querySelector('.day:not([hidden]) .itinerary-card-scroll'); if(card) card.scrollTop=scroll;
    if(feature) content.querySelector('[data-feature-target="'+feature+'"]')?.click();
    if (!feature?.startsWith('itinerary')) window.scrollTo(0,pageScroll);
    fitTransitPlans(); itineraryLayout.sync();
  };
  render();
  document.getElementById("travel-boot-day")?.remove();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function() { fitTransitPlans(); alignMapStickyPosition(); });
  if ("serviceWorker" in navigator) {
    try { navigator.serviceWorker.register("./sw.js").catch(function() {}); }
    catch(e) {}
  }
})()</script>${offlineMapImagesScript}${mapAssets.editorPreview ? '<script type="module" src="/js/preview/shared-runtime.js"></script>' : ""}</body></html>`;
}

export function previewDocument(trip, options = {}) { return buildMobileHtml(trip, { editorPreview: true, ...options }); }
