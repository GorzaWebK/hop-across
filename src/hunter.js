// The sky hunter: swoops in and carries off a player who lags too far behind the camera.

import * as THREE from 'three';
import { hunterBody, hunterWing } from './models.js';
import { emit } from './events.js';

const SWOOP = 0.55;   // seconds to reach the player
const CARRY = 1.1;    // seconds flying away with them

export class Hunter {
  constructor(scene) {
    this.root = new THREE.Group();          // position + pitch
    const model = new THREE.Group();        // faces +Z (toward the camera)
    model.rotation.y = Math.PI;
    this.root.add(model);
    model.add(hunterBody());
    this.wings = [1, -1].map((side) => {
      const pivot = new THREE.Group();
      pivot.position.set(side * 0.4, 0.15, 0.1);
      const w = hunterWing();
      if (side < 0) w.rotation.y = Math.PI;   // mirror toward -X
      pivot.add(w);
      model.add(pivot);
      return pivot;
    });
    this.root.scale.setScalar(0.8);
    this.root.visible = false;
    scene.add(this.root);
    this.active = false;
  }

  reset() {
    this.active = false;
    this.root.visible = false;
  }

  /** Begin the snatch. `player` must already be dead (frozen). */
  start(player) {
    this.player = player;
    this.active = true;
    this.grabbed = false;
    this.t = 0;
    this.target = new THREE.Vector3(player.x, player.y + 1.0, -player.row);
    this.from = this.target.clone().add(new THREE.Vector3(1.5, 9, -12));
    this.root.position.copy(this.from);
    this.root.rotation.set(0.5, 0, 0);
    this.root.visible = true;
    emit('hunterScreech');
  }

  update(dt) {
    if (!this.active) return;
    this.t += dt;
    const flap = Math.sin(this.t * (this.grabbed ? 16 : 9));
    this.wings[0].rotation.z = flap * 0.7;
    this.wings[1].rotation.z = -flap * 0.7;

    if (!this.grabbed) {
      const k = Math.min(1, this.t / SWOOP);
      const e = k * k * (3 - 2 * k);
      this.root.position.lerpVectors(this.from, this.target, e);
      this.root.rotation.x = 0.5 * (1 - e);
      if (k >= 1) {
        this.grabbed = true;
        this.t = 0;
        emit('hunterGrab', this.player);
      }
    } else {
      // climb away toward the camera, player dangling from the talons
      const k = this.t / CARRY;
      this.root.position.x = this.target.x + k * 2;
      this.root.position.y = this.target.y + k * k * 9;
      this.root.position.z = this.target.z + k * 7;
      this.root.rotation.x = -0.35 * Math.min(1, k * 3);
      const p = this.player;
      p.x = this.root.position.x;
      p.y = this.root.position.y - 1.15;
      p.row = -this.root.position.z;
      if (k >= 1) {
        this.root.visible = false;
        p.root.visible = false;
        this.active = false;
      }
    }
  }
}
