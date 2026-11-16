// Voxel model builder.
//
// Every model in the game is a list of colored boxes merged into ONE BufferGeometry
// with per-vertex colors. All meshes then share a single material, so a car, a tree
// or a character is exactly one draw call. Geometries are cached by key and shared
// between every instance, so spawning/recycling lanes never uploads new GPU buffers.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const voxelMaterial = new THREE.MeshLambertMaterial({ vertexColors: true });

/** A box part: size (w,h,d), center (x,y,z), color. */
export function box(w, h, d, x, y, z, color) {
  return { w, h, d, x, y, z, color };
}

const tmpColor = new THREE.Color();

export function buildGeometry(parts) {
  const geos = parts.map((p) => {
    const g = new THREE.BoxGeometry(p.w, p.h, p.d);
    g.translate(p.x, p.y, p.z);
    g.deleteAttribute('uv');
    tmpColor.set(p.color);
    const n = g.attributes.position.count;
    const colors = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      colors[i * 3] = tmpColor.r;
      colors[i * 3 + 1] = tmpColor.g;
      colors[i * 3 + 2] = tmpColor.b;
    }
    g.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return g;
  });
  const merged = mergeGeometries(geos, false);
  geos.forEach((g) => g.dispose());
  merged.computeBoundingSphere();
  return merged;
}

const cache = new Map();

/** Build (once) and return a shared geometry for `key`. */
export function cachedGeometry(key, partsFn) {
  let g = cache.get(key);
  if (!g) {
    g = buildGeometry(partsFn());
    cache.set(key, g);
  }
  return g;
}

export function makeMesh(geometry, { cast = true, receive = false } = {}) {
  const m = new THREE.Mesh(geometry, voxelMaterial);
  m.castShadow = cast;
  m.receiveShadow = receive;
  m.matrixAutoUpdate = true;
  return m;
}

/** Convenience: cached geometry + mesh in one call. */
export function voxelMesh(key, partsFn, opts) {
  return makeMesh(cachedGeometry(key, partsFn), opts);
}
