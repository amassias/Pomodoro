// Keep the workspace usable when storage access is blocked or its quota is full.
// The fallback lasts for this page only; the UI reports that persistence is unavailable.
export const createResilientStorage = (getNativeStorage, kind) => {
  const memory = new Map();
  const pending = new Set();
  let persistent = true;
  const setPersistent = value => {
    if (persistent === value) return;
    persistent = value;
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('browser-storage-state', { detail: { kind, persistent } }));
  };
  const flush = key => {
    const storage = getNativeStorage();
    if (memory.has(key)) storage.setItem(key, memory.get(key));
    else storage.removeItem(key);
    pending.delete(key);
    if (pending.size === 0) setPersistent(true);
  };
  return {
    get persistent() { return persistent; },
    getItem(key) {
      key = String(key);
      try {
        if (pending.has(key)) flush(key);
        const value = getNativeStorage().getItem(key);
        if (value == null) memory.delete(key);
        else memory.set(key, value);
        if (pending.size === 0) setPersistent(true);
        return value;
      } catch {
        setPersistent(false);
        return memory.get(key) ?? null;
      }
    },
    setItem(key, value) {
      key = String(key); memory.set(key, String(value)); pending.add(key);
      try { flush(key); } catch { setPersistent(false); }
    },
    removeItem(key) {
      key = String(key); memory.delete(key); pending.add(key);
      try { flush(key); } catch { setPersistent(false); }
    },
  };
};

export const browserLocalStorage = createResilientStorage(() => globalThis.localStorage, 'local');
export const browserSessionStorage = createResilientStorage(() => globalThis.sessionStorage, 'session');
