// localStorage wrapped in try/catch: private mode or blocked storage must never break the game.

const PREFIX = 'hopAcross.';
const memory = new Map();   // fallback for when storage is unavailable

export function load(key, fallback) {
  try {
    const raw = window.localStorage.getItem(PREFIX + key);
    if (raw !== null) return JSON.parse(raw);
  } catch {
    if (memory.has(key)) return memory.get(key);
  }
  return fallback;
}

export function save(key, value) {
  memory.set(key, value);
  try {
    window.localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch {
    /* storage unavailable – keep the in-memory copy */
  }
}
