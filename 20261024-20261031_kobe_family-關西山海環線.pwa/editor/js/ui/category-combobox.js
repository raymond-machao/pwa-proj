// Custom combobox that always shows all category suggestions without filtering
// them out when the input already contains text, while still allowing free-form input.

const STYLE_ID = "travel-category-combobox-style";

function ensureStyles(doc) {
  if (!doc || doc.getElementById(STYLE_ID)) return;
  const style = doc.createElement("style");
  style.id = STYLE_ID;
  style.textContent = `
input.category-combobox-input.has-category-options {
  background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") !important;
  background-repeat: no-repeat !important;
  background-position: right 9px center !important;
  padding-right: 24px !important;
}
.category-combobox-list {
  position: fixed;
  inset: auto;
  margin: 0;
  min-width: 140px;
  max-width: calc(100vw - 16px);
  max-height: 240px;
  overflow: auto;
  z-index: 10000;
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.14);
  padding: 4px;
  box-sizing: border-box;
}
.category-combobox-list[hidden] {
  display: none !important;
}
.category-combobox-list button {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  width: 100% !important;
  min-height: 30px !important;
  border: 0 !important;
  background: transparent !important;
  color: #0f172a !important;
  text-align: left !important;
  padding: 6px 10px !important;
  margin: 0 !important;
  font: inherit !important;
  font-size: 13px !important;
  font-weight: 500 !important;
  border-radius: 5px !important;
  box-shadow: none !important;
  cursor: pointer !important;
}
.category-combobox-list button:hover,
.category-combobox-list button[aria-selected="true"] {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
}
.category-combobox-list button.is-current {
  font-weight: 600 !important;
  color: #2563eb !important;
}
.category-combobox-list .category-combobox-check {
  font-size: 12px;
  margin-left: 8px;
  opacity: 0.85;
  flex: none;
}
`;
  (doc.head || doc.documentElement).appendChild(style);
}

export function bindCategoryCombobox(input, optionsOrGetter, { formatLabel, onSelect } = {}) {
  if (!input) return { dispose() {} };
  const doc = input.ownerDocument || document;
  const win = doc.defaultView || window;
  ensureStyles(doc);

  const getOptions = () => {
    const raw = typeof optionsOrGetter === "function" ? optionsOrGetter() : optionsOrGetter;
    return Array.isArray(raw) ? raw.filter(Boolean) : [];
  };

  input.classList.add("category-combobox-input");
  input.classList.toggle("has-category-options", getOptions().length > 0);
  input.autocomplete = "off";

  const list = doc.createElement("div");
  list.className = "category-combobox-list";
  list.id = "category-options-" + crypto.randomUUID();
  list.setAttribute("role", "listbox");
  list.hidden = true;
  list.setAttribute("popover", "manual");
  (input.parentElement || doc.body).appendChild(list);

  input.setAttribute("role", "combobox");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-controls", list.id);
  input.setAttribute("aria-expanded", "false");

  let items = [];
  let active = -1;
  let positionEvents = null;

  function position() {
    if (!input.isConnected) {
      hide();
      return;
    }
    const rect = input.getBoundingClientRect();
    const width = Math.max(rect.width, 160);
    const clampedWidth = Math.min(width, win.innerWidth - 16);
    const below = win.innerHeight - rect.bottom - 8;
    const above = rect.top - 8;
    const up = below < 160 && above > below;
    list.style.width = clampedWidth + "px";
    list.style.maxHeight = Math.max(60, Math.min(240, up ? above : below)) + "px";
    list.style.left = Math.max(8, Math.min(rect.left, win.innerWidth - clampedWidth - 8)) + "px";
    list.style.top = (up ? Math.max(8, rect.top - list.getBoundingClientRect().height - 4) : rect.bottom + 4) + "px";
  }

  function hide() {
    positionEvents?.abort();
    positionEvents = null;
    try {
      if (list.hidePopover && list.matches(":popover-open")) list.hidePopover();
    } catch {}
    list.hidden = true;
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
    active = -1;
  }

  function dispose() {
    hide();
    list.remove();
  }

  input.addEventListener("category-combobox-dispose", dispose);

  function select(value) {
    input.value = value;
    hide();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    onSelect?.(value);
  }

  function show() {
    items = getOptions();
    input.classList.toggle("has-category-options", items.length > 0);
    if (!items.length) {
      hide();
      return;
    }
    active = -1;
    const currentVal = String(input.value || "").trim();
    list.replaceChildren();
    items.forEach((value, index) => {
      const option = doc.createElement("button");
      option.type = "button";
      option.setAttribute("role", "option");
      option.tabIndex = -1;
      option.id = list.id + "-" + index;
      const isCurrent = currentVal === value;
      if (isCurrent) option.classList.add("is-current");
      option.setAttribute("aria-selected", "false");

      const labelSpan = doc.createElement("span");
      const display = typeof formatLabel === "function" ? formatLabel(value) : value;
      labelSpan.textContent = display || value;
      option.appendChild(labelSpan);

      if (isCurrent) {
        const checkSpan = doc.createElement("span");
        checkSpan.className = "category-combobox-check";
        checkSpan.setAttribute("aria-hidden", "true");
        checkSpan.textContent = "✓";
        option.appendChild(checkSpan);
      }

      option.onpointerdown = event => event.preventDefault();
      option.onclick = () => select(value);
      list.appendChild(option);
    });

    list.hidden = false;
    input.setAttribute("aria-expanded", "true");
    input.removeAttribute("aria-activedescendant");
    try {
      if (list.showPopover) {
        if (!list.matches(":popover-open")) list.showPopover();
      } else {
        (input.closest("dialog") || doc.body).appendChild(list);
      }
    } catch {
      (input.closest("dialog") || doc.body).appendChild(list);
    }
    position();
    if (!positionEvents) {
      positionEvents = new AbortController();
      doc.addEventListener(
        "scroll",
        event => {
          if (!list.contains(event.target)) position();
        },
        { capture: true, passive: true, signal: positionEvents.signal }
      );
      win.addEventListener("resize", position, { signal: positionEvents.signal });
    }
  }

  input.addEventListener("focus", show);
  input.addEventListener("click", () => {
    if (list.hidden) show();
  });
  input.addEventListener("input", event => {
    if (!event.isComposing) show();
  });
  input.addEventListener("compositionend", show);
  input.addEventListener("blur", () => {
    hide();
  });
  input.addEventListener("keydown", event => {
    if (event.isComposing) return;
    if (event.key === "Escape") {
      if (!list.hidden) {
        event.preventDefault();
        event.stopPropagation();
        hide();
      }
      return;
    }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (!items.length && !getOptions().length) return;
      event.preventDefault();
      if (list.hidden) show();
      if (!items.length) return;
      active = (active + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
      [...list.children].forEach((option, index) =>
        option.setAttribute("aria-selected", String(index === active))
      );
      if (list.children[active]) {
        input.setAttribute("aria-activedescendant", list.children[active].id);
        list.children[active].scrollIntoView({ block: "nearest" });
      }
    } else if (event.key === "Enter") {
      if (!list.hidden && active >= 0 && items[active] !== undefined) {
        event.preventDefault();
        event.stopImmediatePropagation();
        select(items[active]);
      } else {
        hide();
      }
    }
  });

  return { show, hide, dispose };
}
