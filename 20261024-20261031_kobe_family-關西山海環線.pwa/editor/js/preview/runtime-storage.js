// Self-contained factory: embedded in exported HTML, never loaded from the network.
export function createRuntimeStorage({ key, legacyKey, legacyKeys = [], editor, initial, authoritative, storage, onFailure }) {
  const memory = Object.create(null);
  const failed = new Set();
  const local = new Set();
  return {
    replace(suffix, value) { memory[suffix] = JSON.parse(JSON.stringify(value)); },
    hasSaved(suffix) { return local.has(suffix); },
    read(suffix) {
      if (Object.hasOwn(memory, suffix)) return memory[suffix];
      if (editor && authoritative) return JSON.parse(JSON.stringify(initial[suffix]));
      try {
        let saved = storage().getItem(key + suffix);
        if (saved === null) {
          for (const alias of [legacyKey, ...legacyKeys].filter(Boolean)) {
            saved = storage().getItem(alias + suffix);
            if (saved !== null) break;
          }
          if (saved !== null && !editor) { try { storage().setItem(key + suffix, saved); } catch { /* Keep reading the legacy value when migration writes are unavailable. */ } }
        }
        if (saved !== null) {
          const value = JSON.parse(saved);
          if (Array.isArray(initial[suffix]) ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value)) { if (!editor) local.add(suffix); return value; }
        }
      } catch { /* Read-only/unavailable storage can still use the embedded data. */ }
      return JSON.parse(JSON.stringify(initial[suffix]));
    },
    write(suffix, value) {
      memory[suffix] = value;
      if (editor) return;
      try { storage().setItem(key + suffix, JSON.stringify(value)); local.add(suffix); failed.delete(suffix); }
      catch {
        if (!failed.has(suffix)) { failed.add(suffix); onFailure(); }
      }
    },
  };
}
