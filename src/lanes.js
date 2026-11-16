// Lane types. Each lane owns a THREE.Group positioned at z = -row and knows how
// to update its hazards and answer collision queries.

import * as THREE from 'three';
import {
  COLORS, CAR_COLORS, COLS_HALF, SURFACE, WRAP,
  rand, randInt, chance, pick, shuffle, playableCols,
} from './config.js';
import * as M from './models.js';

class Lane {
  constructor(row, type) {
    this.row = row;
    this.type = type;
    this.surface = SURFACE[type];
    this.group = new THREE.Group();
    this.group.position.z = -row;
    this.blocked = new Set();          // grid-blocked columns (trees, rocks)
  }
  update() {}
  /** Return a hazard overlapping [x-half, x+half], or null. */
  hitTest() { return null; }
  isBlocked(col) { return this.blocked.has(col); }
  freeCols() { return playableCols().filter((c) => !this.blocked.has(c)); }
}

// ---------------------------------------------------------------- grass

export class GrassLane extends Lane {
  /**
   * opts.wall    – every playable column blocked (the hedge behind the start)
   * opts.start   – the safe starting area: sparse, center column always free
   * opts.protect – columns that must stay free (keeps a path open)
   */
  constructor(row, d, opts = {}) {
    super(row, 'grass');
    const even = ((row % 2) + 2) % 2 === 0;
    this.group.add(M.groundMesh(even ? 'grassA' : 'grassB',
      even ? COLORS.grassA : COLORS.grassB, COLORS.grassEdge, this.surface));

    if (opts.wall) {
      for (const c of playableCols()) this.blocked.add(c);
    } else {
      const protect = new Set(opts.protect || []);
      if (opts.start) protect.add(0);
      const maxBlocked = opts.start ? 2 : 2 + Math.round(d * 2);
      const count = randInt(0, maxBlocked);
      const candidates = shuffle(playableCols().filter((c) => !protect.has(c)));
      for (let i = 0; i < count && i < candidates.length; i++) this.blocked.add(candidates[i]);
    }

    for (const c of this.blocked) this.addObstacle(c);

    // Decorative scenery outside the playable area frames the board.
    for (let c = COLS_HALF + 1; c <= COLS_HALF + 8; c++) {
      for (const side of [-1, 1]) {
        const p = c === COLS_HALF + 1 ? 0.75 : 0.4;
        if (chance(p)) this.addObstacle(side * c);
      }
    }
  }

  addObstacle(col) {
    const m = chance(0.25) ? M.rock() : M.tree(randInt(1, 3));
    m.position.set(col, this.surface, 0);
    m.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
    this.group.add(m);
  }
}

// ---------------------------------------------------------------- road

export class RoadLane extends Lane {
  constructor(row, d, prev) {
    super(row, 'road');
    this.group.add(M.groundMesh('road', COLORS.road, COLORS.roadEdge, this.surface));
    if (prev && prev.type === 'road') {
      const s = M.roadStripes(this.surface);
      s.position.z = 0.5;
      this.group.add(s);
    }

    this.dir = chance(0.5) ? 1 : -1;
    this.speed = rand(1.4, 2.5) + d * 3.2;
    const truckOdds = 0.15 + d * 0.2;
    const minGap = 3.4 - d * 1.3;
    const maxGap = minGap + 4.5 - d * 1.5;

    // Lay vehicles around a loop of length 2*WRAP so that wrap-around keeps gaps valid.
    this.vehicles = [];
    const span = WRAP * 2;
    const color = pick(CAR_COLORS);
    let cursor = rand(0, 3);
    for (;;) {
      const isTruck = chance(truckOdds);
      const len = isTruck ? 2.6 : 1.36;
      if (cursor + len + minGap > span) break;
      const mesh = isTruck ? M.truck(chance(0.5) ? color : pick(CAR_COLORS)) : M.car(pick(CAR_COLORS));
      mesh.rotation.y = this.dir > 0 ? 0 : Math.PI;
      mesh.position.y = this.surface;
      const v = { x: cursor + len / 2 - WRAP, len, mesh };
      mesh.position.x = v.x;
      this.group.add(mesh);
      this.vehicles.push(v);
      cursor += len + rand(minGap, maxGap);
    }
  }

  update(dt) {
    const dx = this.dir * this.speed * dt;
    const span = WRAP * 2;
    for (const v of this.vehicles) {
      v.x += dx;
      if (this.dir > 0 && v.x - v.len / 2 > WRAP) v.x -= span;
      else if (this.dir < 0 && v.x + v.len / 2 < -WRAP) v.x += span;
      v.mesh.position.x = v.x;
    }
  }

  hitTest(x, half) {
    for (const v of this.vehicles) {
      if (Math.abs(x - v.x) < half + v.len / 2 - 0.08) return v;
    }
    return null;
  }
}
