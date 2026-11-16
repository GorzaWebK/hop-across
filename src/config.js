// Shared constants and tiny helpers.

export const COLS_HALF = 4;          // playable columns are -4 .. 4 (9 wide)
export const LANE_WIDTH = 64;        // visual width of each lane strip
export const WRAP = 14;              // moving things loop inside [-WRAP, WRAP]
export const HOP_TIME = 0.12;        // seconds per hop
export const HOP_HEIGHT = 0.45;      // arc height of a hop
export const PLAYER_HALF = 0.28;     // half-width of the player's hitbox
export const AHEAD = 22;             // rows kept generated in front of the player
export const BEHIND = 9;             // rows kept behind the camera before recycling

// Surface height of each lane type (top of the ground block).
export const SURFACE = {
  grass: 0,
  road: -0.06,
  rail: -0.03,
  river: -0.22,
};

export const COLORS = {
  grassA: 0x9be15d,
  grassB: 0x8fd651,
  grassEdge: 0x63a338,
  road: 0x4b4f5c,
  roadEdge: 0x363943,
  stripe: 0xe9edf2,
  water: 0x4fc3f7,
  waterEdge: 0x3aa6d8,
  gravel: 0x9a8c84,
  gravelEdge: 0x80746d,
  trunk: 0x8a5a33,
  leaf: 0x3fa34d,
  leafTop: 0x5cc25f,
  rock: 0x9aa3ad,
  rockTop: 0xb9c1ca,
};

export const CAR_COLORS = [0xff5a5f, 0x3d8bfd, 0xffc93c, 0x7c5cff, 0x2ec4b6, 0xff8c42, 0xf7f7f7];

/** Difficulty factor 0..1 that ramps up with distance. */
export function difficulty(row) {
  return Math.min(1, Math.max(0, row) / 260);
}

export const rand = (a, b) => a + Math.random() * (b - a);
export const randInt = (a, b) => Math.floor(rand(a, b + 1));
export const chance = (p) => Math.random() < p;
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function playableCols() {
  const cols = [];
  for (let c = -COLS_HALF; c <= COLS_HALF; c++) cols.push(c);
  return cols;
}
