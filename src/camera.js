// Fixed-angle isometric orthographic camera that follows the player forward.

import * as THREE from 'three';
import { clamp } from './config.js';

const OFFSET = new THREE.Vector3(3.4, 12, 9);   // fixed viewing angle
const LOOK_AHEAD = 2.6;                            // rows the view centers ahead of the player

export class CameraRig {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 120);
    this.focus = new THREE.Vector3();
    this.row = 0;          // the row the camera is centered on (never decreases)
    this.x = 0;
    this.shake = 0;
  }

  resize(w, h) {
    const aspect = w / h;
    // Portrait: lock the visible width so the 9 columns always fit.
    // Landscape: lock the height so we still see plenty of rows ahead.
    let viewW, viewH;
    if (aspect < 1) {
      viewW = 10.5;
      viewH = viewW / aspect;
      viewH = Math.min(viewH, 19);
    } else {
      viewH = 12.5;
      viewW = viewH * aspect;
    }
    const c = this.camera;
    c.left = -viewW / 2;
    c.right = viewW / 2;
    c.top = viewH / 2;
    c.bottom = -viewH / 2;
    c.updateProjectionMatrix();
  }

  reset(player) {
    this.row = player.row;
    this.x = 0;
    this.shake = 0;
    this.apply(0);
  }

  addShake(amount) {
    this.shake = Math.max(this.shake, amount);
  }

  /**
   * Follow the player forward (never backward).
   * `minAdvance` lets the game push the camera along on its own.
   */
  update(dt, player, minAdvance = 0) {
    const target = player.laneRow;
    if (target > this.row) this.row += (target - this.row) * Math.min(1, dt * 4);
    this.row += minAdvance;
    const tx = clamp(player.x, -2.5, 2.5) * 0.5;
    this.x += (tx - this.x) * Math.min(1, dt * 3);
    this.apply(dt);
  }

  apply(dt) {
    this.focus.set(this.x, 0, -(this.row + LOOK_AHEAD));
    this.camera.position.copy(this.focus).add(OFFSET);
    if (this.shake > 0) {
      const s = this.shake * 0.35;
      this.camera.position.x += (Math.random() - 0.5) * s;
      this.camera.position.y += (Math.random() - 0.5) * s;
      this.shake = Math.max(0, this.shake - dt * 2.5);
    }
    this.camera.lookAt(this.focus.x, this.focus.y, this.focus.z);
  }
}
