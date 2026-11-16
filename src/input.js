// Keyboard (arrows / WASD / space) and touch (tap = forward, swipe = direction).

const KEYMAP = {
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  Space: 'action', Enter: 'action',
};

const SWIPE_PX = 24;

/**
 * @param {HTMLElement} surface element that receives touches/clicks
 * @param {(action: string, source: string) => void} onAction
 */
export function initInput(surface, onAction) {
  window.addEventListener('keydown', (e) => {
    const a = KEYMAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (e.repeat) return;      // holding a key should not machine-gun hops
    onAction(a, 'key');
  });

  let start = null;
  surface.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button, .no-tap')) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId, swiped: false };
  });
  surface.addEventListener('pointermove', (e) => {
    if (!start || start.swiped || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) < SWIPE_PX) return;
    start.swiped = true;           // fire as soon as the swipe is recognised
    if (Math.abs(dx) > Math.abs(dy)) onAction(dx > 0 ? 'right' : 'left', 'swipe');
    else onAction(dy > 0 ? 'down' : 'up', 'swipe');
  });
  const end = (e) => {
    if (!start || e.pointerId !== start.id) return;
    if (!start.swiped) onAction('tap', 'tap');
    start = null;
  };
  surface.addEventListener('pointerup', end);
  surface.addEventListener('pointercancel', () => { start = null; });

  // Stop iOS double-tap zoom / long-press menus on the play surface.
  surface.addEventListener('contextmenu', (e) => e.preventDefault());
}
