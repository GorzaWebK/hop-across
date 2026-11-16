// The player: grid hopping with a snappy arc, one queued input, squash & stretch.

import * as THREE from 'three';
import { HOP_TIME, HOP_HEIGHT, COLS_HALF, SURFACE, lerp } from './config.js';
import { makeMesh } from './voxel.js';
import { characterGeometry } from './characters.js';
import { RiverLane } from './lanes.js';

export const DIRS = {
  up: { dr: 1, dc: 0, rot: 0 },
  down: { dr: -1, dc: 0, rot: Math.PI },
  left: { dr: 0, dc: -1, rot: Math.PI / 2 },
  right: { dr: 0, dc: 1, rot: -Math.PI / 2 },
};

function angleLerp(a, b, t) {
  let d = ((b - a + Math.PI) % (Math.PI * 2)) - Math.PI;
  if (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class Player {
  constructor(world) {
    this.world = world;
    this.root = new THREE.Group();          // position + facing
    this.body = makeMesh(new THREE.BufferGeometry()); // squash & stretch
    this.root.add(this.body);
    this.onLand = null;                     // (player) => void, set by the game
    this.onHop = null;
    this.reset();
  }

  setCharacter(def) {
    this.body.geometry = characterGeometry(def);
  }

  reset() {
    this.row = 0;
    this.x = 0;
    this.y = SURFACE.grass;
    this.hop = null;
    this.queued = null;
    this.alive = true;
    this.facing = 0;
    this.targetFacing = 0;
    this.squash = 0;        // landing squash, decays to 0
    this.bump = 0;          // blocked-move wobble
    this.death = null;
    this.attached = null;   // { lane, p, offset } while riding a log / pad
    this.root.visible = true;
    this.root.rotation.set(0, 0, 0);
    this.body.scale.set(1, 1, 1);
    this.body.position.set(0, 0, 0);
    this.body.rotation.set(0, 0, 0);
    this.syncTransform();
  }

  /** The lane row whose hazards can currently hit the player. */
  get laneRow() {
    if (!this.hop) return this.row;
    return this.hop.t < 0.5 ? this.hop.fromRow : this.hop.toRow;
  }

  get busy() { return !!this.hop; }

  request(dir) {
    if (!this.alive) return;
    if (this.hop) {
      if (!this.queued) this.queued = dir;   // queue at most one input
      return;
    }
    this.startHop(dir);
  }

  startHop(dirName) {
    const d = DIRS[dirName];
    this.targetFacing = d.rot;
    const toRow = this.row + d.dr;
    const lane = this.world.getLane(toRow);
    let toX = this.x + d.dc;
    if (!lane) return this.blocked();
    if (lane.type === 'river') {
      // On water we keep a continuous x (logs drift); the landing decides.
      if (Math.abs(toX) > COLS_HALF + 0.45) return this.blocked();
    } else {
      toX = Math.round(toX);
      if (!this.world.canEnter(toRow, toX)) return this.blocked();
    }
    // Hopping along/between logs keeps the drift of the log you jumped from.
    const vx = this.attached && lane.type === 'river' && !this.attached.lane.pads
      ? this.attached.lane.velocity : 0;
    this.hop = {
      t: 0,
      fromX: this.x, toX,
      fromY: this.y, toY: lane.standY,
      fromRow: this.row, toRow,
      vx,
    };
    this.detach();
    if (this.onHop) this.onHop(this);
  }

  blocked() {
    this.bump = 1;
    this.queued = null;
  }

  // ------------------------------------------------------------ riding

  attach(lane, p) {
    this.attached = { lane, p, offset: RiverLane.snapOffset(p, this.x) };
    p.dip = 1;
  }

  detach() {
    this.attached = null;
  }

  update(dt) {
    if (this.death) {
      this.updateDeath(dt);
      this.syncTransform();
      return;
    }

    this.facing = angleLerp(this.facing, this.targetFacing, Math.min(1, dt * 30));

    if (this.hop) {
      const h = this.hop;
      h.t += dt / HOP_TIME;
      h.fromX += h.vx * dt;
      h.toX += h.vx * dt;
      const p = Math.min(1, h.t);
      this.x = lerp(h.fromX, h.toX, p);
      this.y = lerp(h.fromY, h.toY, p) + Math.sin(Math.PI * p) * HOP_HEIGHT;
      // stretch while airborne
      const s = Math.sin(Math.PI * p);
      this.body.scale.set(1 - 0.12 * s, 1 + 0.22 * s, 1 - 0.12 * s);
      if (p >= 1) this.land();
    } else {
      if (this.attached) {
        const a = this.attached;
        this.x = a.p.x + a.offset;
        this.y += (a.p.top - this.y) * Math.min(1, dt * 20);
      }
      const sq = this.squash;
      const b = Math.sin(this.bump * Math.PI) * 0.12;
      this.body.scale.set(1 + 0.22 * sq + b, 1 - 0.3 * sq - b, 1 + 0.22 * sq + b);
    }
    this.squash = Math.max(0, this.squash - dt * 9);
    this.bump = Math.max(0, this.bump - dt * 6);
    this.syncTransform();
  }

  land() {
    const h = this.hop;
    this.hop = null;
    this.row = h.toRow;
    this.x = h.toX;
    this.y = h.toY;
    this.squash = 1;
    const lane = this.world.getLane(this.row);
    if (lane && lane.type === 'river') {
      const p = lane.platformAt(this.x);
      if (p) this.attach(lane, p);   // no platform = splash (the game checks)
    }
    if (this.onLand) this.onLand(this);
    if (this.alive && this.queued) {
      const q = this.queued;
      this.queued = null;
      this.startHop(q);
    }
  }

  syncTransform() {
    const z = this.hop ? lerp(this.hop.fromRow, this.hop.toRow, Math.min(1, this.hop.t)) : this.row;
    this.root.position.set(this.x, this.y, -z);
    this.root.rotation.y = this.facing;
  }

  // ------------------------------------------------------------ death

  die(type, info = {}) {
    if (!this.alive) return;
    this.alive = false;
    this.queued = null;
    this.death = { type, t: 0, vx: (info.dir || 1) * 9, vy: 7 };
    if (this.hop) {
      // freeze the hop where it is, settle on the ground of the current lane
      const lane = this.world.getLane(this.laneRow);
      this.row = this.laneRow;
      this.hop = null;
      if (lane) this.y = lane.surface;
    }
  }

  updateDeath(dt) {
    const d = this.death;
    d.t += dt;
    if (d.type === 'squash') {
      const k = Math.min(1, d.t * 20);
      this.body.scale.set(1 + 0.45 * k, 1 - 0.88 * k, 1 + 0.45 * k);
    } else if (d.type === 'splash') {
      // sink below the surface, then vanish
      this.y -= dt * 2.2;
      this.body.rotation.z += dt * 3;
      if (d.t > 0.45) this.root.visible = false;
    } else if (d.type === 'fling') {
      // knocked flying by a train
      d.vy -= 30 * dt;
      this.x += d.vx * dt;
      this.y += d.vy * dt;
      this.body.rotation.x += dt * 14;
      this.body.rotation.z += dt * 9;
      if (d.t > 1.2) this.root.visible = false;
    }
  }
}
