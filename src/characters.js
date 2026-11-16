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

const sprout = () => {
  const cap = 0xe8433f;
  const spot = 0xfff6ea;
  const stem = 0xf3e6c8;
  return [
    box(0.14, 0.12, 0.18, -0.12, 0.06, 0, 0x6b4a32),
    box(0.14, 0.12, 0.18, 0.12, 0.06, 0, 0x6b4a32),
    box(0.4, 0.42, 0.36, 0, 0.33, 0, stem),
    box(0.06, 0.08, 0.02, -0.09, 0.42, -0.185, 0x1d1d22),
    box(0.06, 0.08, 0.02, 0.09, 0.42, -0.185, 0x1d1d22),
    box(0.07, 0.04, 0.02, -0.15, 0.35, -0.185, 0xff9aa8),
    box(0.07, 0.04, 0.02, 0.15, 0.35, -0.185, 0xff9aa8),
    box(0.74, 0.24, 0.68, 0, 0.66, 0, cap),
    box(0.52, 0.12, 0.48, 0, 0.84, 0, cap),
    box(0.14, 0.04, 0.14, -0.12, 0.92, -0.08, spot),
    box(0.12, 0.04, 0.12, 0.13, 0.92, 0.1, spot),
    box(0.14, 0.12, 0.02, 0.2, 0.66, -0.345, spot),
    box(0.12, 0.1, 0.02, -0.22, 0.7, -0.345, spot),
    box(0.02, 0.12, 0.14, 0.375, 0.66, 0.1, spot),
    box(0.02, 0.12, 0.14, -0.375, 0.68, -0.08, spot),
  ];
};

const nimbus = () => {
  const wool = 0xf7f7fa;
  const dark = 0x2d2d35;
  const parts = [];
  for (const x of [-0.15, 0.15]) for (const z of [-0.13, 0.15]) parts.push(box(0.1, 0.18, 0.1, x, 0.09, z, dark));
  parts.push(
    box(0.62, 0.42, 0.6, 0, 0.39, 0.02, wool),
    box(0.48, 0.12, 0.48, 0, 0.66, 0.04, wool),
    box(0.08, 0.3, 0.42, -0.34, 0.4, 0.02, wool),
    box(0.08, 0.3, 0.42, 0.34, 0.4, 0.02, wool),
    box(0.34, 0.3, 0.2, 0, 0.5, -0.36, dark),
    box(0.07, 0.07, 0.02, -0.08, 0.54, -0.465, 0xffffff),
    box(0.07, 0.07, 0.02, 0.08, 0.54, -0.465, 0xffffff),
    box(0.15, 0.06, 0.08, -0.23, 0.56, -0.34, dark),
    box(0.15, 0.06, 0.08, 0.23, 0.56, -0.34, dark),
    box(0.22, 0.09, 0.16, 0, 0.69, -0.34, wool),
  );
  return parts;
};

const ember = () => {
  const fur = 0xff8a3d;
  const white = 0xfff4e6;
  const dark = 0x3b2a20;
  const parts = [];
  for (const x of [-0.14, 0.14]) for (const z of [-0.16, 0.16]) parts.push(box(0.12, 0.16, 0.12, x, 0.08, z, dark));
  parts.push(
    box(0.44, 0.32, 0.6, 0, 0.32, 0.02, fur),
    box(0.3, 0.22, 0.04, 0, 0.3, -0.29, white),
    box(0.46, 0.36, 0.4, 0, 0.62, -0.18, fur),
    box(0.24, 0.14, 0.16, 0, 0.54, -0.44, white),
    box(0.08, 0.06, 0.04, 0, 0.59, -0.53, 0x1d1d22),
    box(0.06, 0.08, 0.02, -0.11, 0.7, -0.385, 0x1d1d22),
    box(0.06, 0.08, 0.02, 0.11, 0.7, -0.385, 0x1d1d22),
    box(0.12, 0.16, 0.1, -0.15, 0.88, -0.16, fur),
    box(0.12, 0.16, 0.1, 0.15, 0.88, -0.16, fur),
    box(0.12, 0.06, 0.1, -0.15, 0.99, -0.16, dark),
    box(0.12, 0.06, 0.1, 0.15, 0.99, -0.16, dark),
    box(0.18, 0.18, 0.36, 0, 0.44, 0.46, fur),
    box(0.18, 0.18, 0.12, 0, 0.44, 0.7, white),
  );
  return parts;
};

const orbit = () => {
  const suit = 0xf2f4f7;
  const grey = 0xb8c0cb;
  return [
    box(0.16, 0.14, 0.2, -0.12, 0.07, 0, grey),
    box(0.16, 0.14, 0.2, 0.12, 0.07, 0, grey),
    box(0.5, 0.36, 0.4, 0, 0.32, 0, suit),
    box(0.4, 0.36, 0.14, 0, 0.42, 0.26, grey),
    box(0.16, 0.1, 0.02, -0.04, 0.36, -0.21, 0x3d8bfd),
    box(0.05, 0.05, 0.02, 0.1, 0.36, -0.21, 0xff4d5a),
    box(0.1, 0.26, 0.12, -0.3, 0.34, 0, suit),
    box(0.1, 0.26, 0.12, 0.3, 0.34, 0, suit),
    box(0.54, 0.42, 0.48, 0, 0.72, 0, suit),
    box(0.42, 0.25, 0.02, 0, 0.72, -0.245, 0xffb84d),
    box(0.09, 0.07, 0.02, -0.12, 0.78, -0.255, 0xffe7b0),
    box(0.04, 0.14, 0.04, 0.19, 0.99, 0.05, grey),
    box(0.07, 0.07, 0.07, 0.19, 1.07, 0.05, 0x5ff2ff),
  ];
};

export const CHARACTERS = [
  { id: 'bolt', name: 'Bolt', blurb: 'A plucky delivery robot.', price: 0, parts: bolt, palette: [0xcfd9e6, 0xeaf0f6, 0x3a4250, 0xff8a3d] },
  { id: 'sprout', name: 'Sprout', blurb: 'A mushroom kid with a spotty cap.', price: 20, parts: sprout, palette: [0xe8433f, 0xf3e6c8, 0xfff6ea] },
  { id: 'nimbus', name: 'Nimbus', blurb: 'Half sheep, half cloud, all fluff.', price: 40, parts: nimbus, palette: [0xf7f7fa, 0xf7f7fa, 0x2d2d35] },
  { id: 'ember', name: 'Ember', blurb: 'A quick little fox with a bright tail.', price: 75, parts: ember, palette: [0xff8a3d, 0xff8a3d, 0xfff4e6, 0x3b2a20] },
  { id: 'orbit', name: 'Orbit', blurb: 'Took a wrong turn at the moon.', price: 120, parts: orbit, palette: [0xf2f4f7, 0xb8c0cb, 0xffb84d] },
];

export function characterById(id) {
  return CHARACTERS.find((c) => c.id === id) || CHARACTERS[0];
}

export function characterGeometry(def) {
  return cachedGeometry(`char:${def.id}`, def.parts);
}
