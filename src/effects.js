// Particle puffs: one InstancedMesh of little cubes = one draw call for every particle.

import * as THREE from 'three';
import { rand, pick } from './config.js';

const tmpMatrix = new THREE.Matrix4();
const tmpQuat = new THREE.Quaternion();
const tmpEuler = new THREE.Euler();
const tmpScale = new THREE.Vector3();
const tmpPos = new THREE.Vector3();
const tmpColor = new THREE.Color();

export class Particles {
  constructor(scene, max = 320) {
    this.max = max;
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
    this.mesh = new THREE.InstancedMesh(geo, mat, max);
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(max * 3), 3);
    this.mesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);
    this.list = [];
  }

  clear() {
    this.list.length = 0;
    this.mesh.count = 0;
  }

  /**
   * Spawn a burst.
   * opts: count, colors[], speed, up, size, life, gravity, floor, spread
   */
  burst(x, y, z, opts = {}) {
    const {
      count = 8, colors = [0xffffff], speed = 2, up = 2, size = 0.12,
      life = 0.5, gravity = 9, floor = -Infinity, spread = 0.2,
    } = opts;
    for (let i = 0; i < count; i++) {
      if (this.list.length >= this.max) this.list.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * rand(0.4, 1);
      this.list.push({
        x: x + rand(-spread, spread), y, z: z + rand(-spread, spread),
        vx: Math.cos(a) * s, vy: up * rand(0.6, 1.2), vz: Math.sin(a) * s,
        rx: Math.random() * 3, ry: Math.random() * 3,
        spin: rand(-8, 8),
        size: size * rand(0.7, 1.3),
        life: life * rand(0.7, 1.2), age: 0,
        gravity, floor,
        color: pick(colors),
      });
    }
  }

  update(dt) {
    const list = this.list;
    let n = 0;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      p.age += dt;
      if (p.age >= p.life) continue;
      p.vy -= p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      if (p.y < p.floor) {
        p.y = p.floor;
        p.vy *= -0.3;
        p.vx *= 0.6;
        p.vz *= 0.6;
      }
      p.rx += p.spin * dt;
      p.ry += p.spin * 0.7 * dt;
      const k = 1 - p.age / p.life;
      const sc = p.size * (0.3 + 0.7 * k);
      tmpPos.set(p.x, p.y, p.z);
      tmpQuat.setFromEuler(tmpEuler.set(p.rx, p.ry, 0));
      tmpScale.set(sc, sc, sc);
      tmpMatrix.compose(tmpPos, tmpQuat, tmpScale);
      this.mesh.setMatrixAt(n, tmpMatrix);
      this.mesh.setColorAt(n, tmpColor.set(p.color));
      list[n++] = p;
    }
    list.length = n;
    this.mesh.count = n;
    if (n) {
      this.mesh.instanceMatrix.needsUpdate = true;
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}
