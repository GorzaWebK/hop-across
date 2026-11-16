// Original low-poly voxel models for the world. Every model's origin is at its
// bottom-center. Vehicles are built facing +X (rotated at spawn for -X).

import { box, voxelMesh } from './voxel.js';
import { COLORS, COLS_HALF, LANE_WIDTH } from './config.js';

// ---------------------------------------------------------------- ground strips

/**
 * A lane's ground block: playable middle section plus darker shoulders on both
 * sides (three non-overlapping boxes, so no z-fighting).
 */
export function groundMesh(key, color, edgeColor, topY, depth = 0.8) {
  return voxelMesh(
    `ground:${key}`,
    () => {
      const inner = COLS_HALF * 2 + 1;
      const side = (LANE_WIDTH - inner) / 2;
      const y = topY - depth / 2;
      const sideX = inner / 2 + side / 2;
      return [
        box(inner, depth, 1, 0, y, 0, color),
        box(side, depth, 1, -sideX, y, 0, edgeColor),
        box(side, depth, 1, sideX, y, 0, edgeColor),
      ];
    },
    { cast: false, receive: true },
  );
}

/** Dashed lane divider drawn between two adjacent road lanes. */
export function roadStripes(topY) {
  return voxelMesh(
    'road:stripes',
    () => {
      const parts = [];
      for (let x = -LANE_WIDTH / 2 + 1; x < LANE_WIDTH / 2; x += 1.6) {
        parts.push(box(0.7, 0.02, 0.08, x, topY + 0.01, 0, COLORS.stripe));
      }
      return parts;
    },
    { cast: false, receive: true },
  );
}

// ---------------------------------------------------------------- scenery

export function tree(height = 2) {
  return voxelMesh(`tree:${height}`, () => {
    const canopyH = 0.35 + height * 0.35;
    const trunkH = 0.35;
    return [
      box(0.3, trunkH, 0.3, 0, trunkH / 2, 0, COLORS.trunk),
      box(0.8, canopyH, 0.8, 0, trunkH + canopyH / 2, 0, COLORS.leaf),
      box(0.6, 0.12, 0.6, 0, trunkH + canopyH + 0.06, 0, COLORS.leafTop),
    ];
  });
}

export function rock() {
  return voxelMesh('rock', () => [
    box(0.72, 0.38, 0.66, 0, 0.19, 0, COLORS.rock),
    box(0.5, 0.16, 0.44, -0.04, 0.46, 0.02, COLORS.rockTop),
    box(0.24, 0.18, 0.2, 0.26, 0.09, -0.26, COLORS.rock),
  ]);
}

// ---------------------------------------------------------------- vehicles

const WHEEL = 0x22252b;
const GLASS = 0xbfe6ff;
const LIGHT = 0xfff3a0;
const TAIL = 0xff3b3b;

function wheels(len, z) {
  const parts = [];
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      parts.push(box(0.3, 0.3, 0.12, sx * (len / 2 - 0.3), 0.15, sz * z, WHEEL));
    }
  }
  return parts;
}

/** Small car, 1.4 tiles long. */
export function car(color) {
  return voxelMesh(`car:${color}`, () => [
    box(1.36, 0.42, 0.78, 0, 0.36, 0, color),
    box(0.72, 0.34, 0.68, -0.08, 0.74, 0, 0xffffff),
    box(0.74, 0.22, 0.7, -0.08, 0.76, 0, GLASS),
    box(0.74, 0.08, 0.7, -0.08, 0.95, 0, color),
    box(0.04, 0.1, 0.16, 0.69, 0.42, 0.24, LIGHT),
    box(0.04, 0.1, 0.16, 0.69, 0.42, -0.24, LIGHT),
    box(0.04, 0.08, 0.14, -0.69, 0.44, 0.26, TAIL),
    box(0.04, 0.08, 0.14, -0.69, 0.44, -0.26, TAIL),
    ...wheels(1.36, 0.36),
  ]);
}

/** Box truck, 2.6 tiles long. */
export function truck(color) {
  return voxelMesh(`truck:${color}`, () => [
    // cab (front, +X)
    box(0.7, 0.72, 0.8, 0.95, 0.5, 0, color),
    box(0.06, 0.26, 0.66, 1.3, 0.68, 0, GLASS),
    box(0.04, 0.1, 0.16, 1.31, 0.3, 0.26, LIGHT),
    box(0.04, 0.1, 0.16, 1.31, 0.3, -0.26, LIGHT),
    // cargo box
    box(1.8, 1.0, 0.86, -0.38, 0.68, 0, 0xf2f2ee),
    box(1.82, 0.12, 0.88, -0.38, 0.3, 0, color),
    ...wheels(2.6, 0.38),
    box(0.3, 0.3, 0.12, -0.2, 0.15, 0.38, WHEEL),
    box(0.3, 0.3, 0.12, -0.2, 0.15, -0.38, WHEEL),
  ]);
}
