export const itineraryLayoutCss = `
html.itinerary-fixed,html.itinerary-fixed body{height:100%;overflow:hidden;overscroll-behavior-y:none}
.itinerary-fixed .wrap{padding-bottom:0}
.itinerary-fixed .feature-page[id^="itinerary-"]{min-height:0}
/* The fixed frame owns the gap between the map and the card, so the shell's own
   margin, bottom border and bottom padding are replaced by one fixed 8px gap.
   Without this, a style with a thick border (brutal) or generous padding (clay,
   bento) changes that spacing per style, which the confirmed layout disallows. */
.itinerary-fixed .trip-map-shell{position:relative;top:auto;margin-bottom:0;border-bottom-width:0;padding-bottom:8px}
.itinerary-fixed .feature-page[id^="itinerary-"]>.day[id^="day-"]{position:relative;margin-top:0!important;padding:0!important;overflow:hidden;height:var(--itinerary-card-height);min-height:0}
.itinerary-card-scroll{height:100%;overflow-y:auto;overscroll-behavior-y:contain;-webkit-overflow-scrolling:touch;padding:16px;scrollbar-width:none;-ms-overflow-style:none}
.itinerary-card-scroll::-webkit-scrollbar{display:none;width:0;height:0}
.itinerary-scroll-indicator{position:absolute;right:2px;top:0;width:3.5px;border-radius:999px;background:rgba(0,0,0,.38);pointer-events:none;z-index:4;opacity:0;transition:opacity .25s ease}
.itinerary-scroll-indicator.visible{opacity:1}
.itinerary-card-scroll:focus-visible{outline:2px solid #b54a14;outline-offset:-3px}
.itinerary-fixed .safari-scroll-indicator{display:none}
.itinerary-fixed .hero{touch-action:pan-x;overscroll-behavior:none}
.itinerary-fixed .hero-day-nav,
.itinerary-fixed .subnav-itinerary{touch-action:pan-x;overscroll-behavior-x:contain;overscroll-behavior-y:none;-webkit-user-drag:none;user-drag:none}
.itinerary-fixed .day-tab{touch-action:pan-x;-webkit-user-drag:none;user-drag:none;-webkit-touch-callout:none}
`;

// Serialized into the standalone export; must not depend on imported helpers.
export function installItineraryLayout(content) {
  const visible = element => element.getBoundingClientRect().width > 0;
  function sync({ reset = false } = {}) {
    content.querySelectorAll('.day[id^="day-"]').forEach(card => {
      if (card.querySelector(':scope > .itinerary-card-scroll')) return;
      const scroll = document.createElement('div');
      scroll.className = 'itinerary-card-scroll'; scroll.tabIndex = 0;
      scroll.setAttribute('role', 'region');
      scroll.setAttribute('aria-label', card.id.endsWith('-en') ? 'Daily itinerary' : '當日行程');
      scroll.append(...card.childNodes); card.append(scroll);
      const bar = document.createElement('span');
      bar.className = 'itinerary-scroll-indicator'; bar.setAttribute('aria-hidden', 'true');
      card.append(bar);
      let timer;
      scroll.addEventListener('scroll', () => {
        const distance = scroll.scrollHeight - scroll.clientHeight;
        if (distance <= 4) { bar.classList.remove('visible'); return; }
        const track = Math.max(0, scroll.clientHeight - 12);
        const thumb = Math.min(track, Math.max(24, track * scroll.clientHeight / scroll.scrollHeight));
        const offset = 6 + (track - thumb) * Math.min(1, Math.max(0, scroll.scrollTop / distance));
        bar.style.height = thumb + 'px';
        bar.style.transform = 'translateY(' + offset + 'px)';
        bar.classList.add('visible');
        clearTimeout(timer);
        timer = setTimeout(() => bar.classList.remove('visible'), 800);
      }, { passive: true });
    });
    const page = [...content.querySelectorAll('.feature-page.active[id^="itinerary-"]')].find(visible);
    document.documentElement.classList.toggle('itinerary-fixed', Boolean(page));
    if (!page) return;
    window.scrollTo({ top: 0, behavior: 'instant' });
    const viewport = window.visualViewport?.height || window.innerHeight;
    const nav = [...content.querySelectorAll('.feature-nav')].find(visible);
    // The feature nav is usually a bottom bar, but a style may dock it to the
    // top instead.  Only a bottom bar shortens the scrollable card.
    const navRect = nav ? nav.getBoundingClientRect() : null;
    const navAtTop = navRect ? navRect.top < viewport / 2 : false;
    const bottom = navRect && !navAtTop
      ? Math.min(viewport, navRect.top) - 8
      : viewport - Math.max(12, parseFloat(getComputedStyle(page).paddingBottom) || 0);
    const shell = page.querySelector('.trip-map-shell');
    const canvas = shell?.querySelector('.trip-map-canvas');
    if (canvas) {
      // Keep usable itinerary space on shorter portrait screens.
      const cap = Math.max(48, bottom - canvas.getBoundingClientRect().top - 140);
      const previous = canvas.getBoundingClientRect().height;
      canvas.style.maxHeight = cap + 'px';
      if (Math.abs(previous - canvas.getBoundingClientRect().height) > 0.5) {
        try { shell._tripMap?.resize(); } catch { /* Layout must not depend on map success. */ }
      }
    }
    page.querySelectorAll('.day[id^="day-"]').forEach(card => {
      if (!visible(card)) return;
      card.style.setProperty('--itinerary-card-height', Math.max(48, bottom - card.getBoundingClientRect().top) + 'px');
      if (reset) card.querySelector('.itinerary-card-scroll').scrollTop = 0;
    });
  }
  window.visualViewport?.addEventListener('resize', () => sync());
  // The desktop frame applies its device safe area after the document loads,
  // and font-size/theme changes resize headers that recalculate card height.
  new MutationObserver(() => sync()).observe(document.documentElement, { attributes: true, attributeFilter: ['style', 'class', 'data-text-size'] });
  return { sync };
}
