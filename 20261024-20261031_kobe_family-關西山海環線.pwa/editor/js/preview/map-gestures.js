export const mapGesturesCss = `
.trip-map-canvas[data-map-offline="1"]{touch-action:none;cursor:grab}
.map-gesture-layer{position:absolute;inset:0;transform-origin:0 0;pointer-events:none}
.map-gesture-layer img{user-select:none;-webkit-user-drag:none}
`;

// Embedded in single-file HTML; gestures transform the existing offline image.
export function installMapGestures(content) {
  content.querySelectorAll('[data-map-offline="1"]').forEach(canvas => {
    const layer = document.createElement('div');
    layer.className = 'map-gesture-layer';
    layer.append(...canvas.childNodes); canvas.append(layer);
    let scale = 1, x = 0, y = 0;
    const pointers = new Map();
    const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
    function draw() {
      if (scale >= 1) {
        x = clamp(x, canvas.clientWidth * (1 - scale), 0);
        y = clamp(y, canvas.clientHeight * (1 - scale), 0);
      } else {
        const maxX = canvas.clientWidth * (1 - scale);
        const maxY = canvas.clientHeight * (1 - scale);
        x = clamp(x, 0, maxX);
        y = clamp(y, 0, maxY);
      }
      layer.style.transform = `translate(${x}px,${y}px) scale(${scale})`;
    }
    function reset() { pointers.clear(); scale = 1; x = y = 0; draw(); }
    canvas.closest('.trip-map-shell').addEventListener('travel-map-view-change', reset);
    window.addEventListener('resize', reset);
    canvas.addEventListener('pointerdown', event => {
      if (event.button !== 0) return;
      canvas.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    });
    canvas.addEventListener('pointermove', event => {
      if (!pointers.has(event.pointerId)) return;
      const before = [...pointers.values()];
      pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      const after = [...pointers.values()];
      if (before.length === 1) {
        x += after[0].x - before[0].x; y += after[0].y - before[0].y;
      } else if (before.length === 2) {
        const mid = list => ({ x: (list[0].x + list[1].x) / 2, y: (list[0].y + list[1].y) / 2 });
        const distance = list => Math.hypot(list[0].x - list[1].x, list[0].y - list[1].y);
        const a = mid(before), b = mid(after), r = canvas.getBoundingClientRect();
        const next = clamp(scale * distance(after) / Math.max(1, distance(before)), 0.5, 4);
        x = b.x - r.left - (a.x - r.left - x) * next / scale;
        y = b.y - r.top - (a.y - r.top - y) * next / scale;
        scale = next;
      }
      draw();
    });
    for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) {
      canvas.addEventListener(name, event => pointers.delete(event.pointerId));
    }
  });
}
