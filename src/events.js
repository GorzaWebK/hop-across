// Tiny event bus so gameplay code can trigger sounds/effects without importing them.

const listeners = new Map();

export function on(name, fn) {
  if (!listeners.has(name)) listeners.set(name, []);
  listeners.get(name).push(fn);
}

export function emit(name, data) {
  const fns = listeners.get(name);
  if (fns) for (const fn of fns) fn(data);
}
