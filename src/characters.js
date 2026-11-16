// Playable characters (all original). Each model faces -Z (forward) with its
// origin at the feet. `price` is the coin cost to unlock (0 = free).

import { box, cachedGeometry } from './voxel.js';

const bolt = () => {
  const body = 0xcfd9e6;
  const head = 0xeaf0f6;
  const dark = 0x3a4250;
  return [
    box(0.15, 0.16, 0.18, -0.14, 0.08, 0, dark),
    box(0.15, 0.16, 0.18, 0.14, 0.08, 0, dark),
    box(0.54, 0.38, 0.46, 0, 0.35, 0, body),
    box(0.24, 0.12, 0.02, 0, 0.36, -0.24, 0xff8a3d),
    box(0.1, 0.28, 0.12, -0.33, 0.36, 0, dark),
    box(0.1, 0.28, 0.12, 0.33, 0.36, 0, dark),
    box(0.5, 0.34, 0.44, 0, 0.71, 0, head),
    box(0.42, 0.15, 0.02, 0, 0.73, -0.225, 0x1f2a36),
    box(0.08, 0.06, 0.02, -0.1, 0.74, -0.24, 0x5ff2ff),
    box(0.08, 0.06, 0.02, 0.1, 0.74, -0.24, 0x5ff2ff),
    box(0.04, 0.18, 0.04, 0, 0.97, 0, dark),
    box(0.1, 0.1, 0.1, 0, 1.08, 0, 0xff4d5a),
  ];
};

export const CHARACTERS = [
  { id: 'bolt', name: 'Bolt', blurb: 'A plucky delivery robot.', price: 0, parts: bolt },
];

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function characterGeometry(def) {
  return cachedGeometry(`char:${def.id}`, def.parts);
}
