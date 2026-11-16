// Lane types. Each lane owns a THREE.Group positioned at z = -row and knows how
// to update its hazards and answer collision queries.

import * as THREE from 'three';
import {
  COLORS, CAR_COLORS, COLS_HALF, SURFACE, WRAP,
  rand, randInt, chance, pick, shuffle, playableCols, clamp,
} from './config.js';
import * as M from './models.js';
import { emit } from './events.js';

class Lane {
  constructor(row, type) {
    this.row = row;
    this.type = type;
    this.surface = SURFACE[type];
    this.standY = this.surface;        // height the player stands at
    this.group = new THREE.Group();
    this.group.position.z = -row;
    this.blocked = new Set();          // grid-blocked columns (trees, rocks)
    this.coins = [];
  }
  update() {}

  /** Places a coin could sit: { x } on the ground or { platform, offset } on a log/pad. */
  coinSpots() {
    return this.freeCols().map((x) => ({ x }));
  }

  addCoin(spot) {
    const mesh = M.coin();
    const c = { x: spot.x ?? 0, platform: spot.platform || null, offset: spot.offset || 0, mesh, taken: false, t: 0 };
    this.positionCoin(c);
    this.group.add(mesh);
    this.coins.push(c);
  }

  positionCoin(c) {
    if (c.platform) c.x = c.platform.x + c.offset;
    const base = c.platform ? c.platform.top : this.standY;
    c.mesh.position.set(c.x, base + 0.42, 0);
  }

  updateCoins(dt, time) {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const c = this.coins[i];
      this.positionCoin(c);
      if (c.taken) {
        // pop: rise, spin fast, shrink away
        c.t += dt;
        const k = c.t / 0.35;
        c.mesh.position.y += k * 1.4;
        c.mesh.rotation.y += dt * 30;
        c.mesh.scale.setScalar(Math.max(0.01, 1 - k * k));
        if (k >= 1) {
          this.group.remove(c.mesh);
          this.coins.splice(i, 1);
        }
      } else {
        c.mesh.rotation.y = time * 3 + this.row;
        c.mesh.position.y += Math.sin(time * 4 + this.row) * 0.06;
      }
    }
  }

  /** Take any coin within reach of x. Returns how many were collected. */
  collectCoins(x) {
    let n = 0;
    for (const c of this.coins) {
      if (!c.taken && Math.abs(c.x - x) < 0.5) {
        c.taken = true;
        n++;
      }
    }
    return n;
  }
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

// ---------------------------------------------------------------- river

export class RiverLane extends Lane {
  /**
   * Either drifting logs or static lily pads.
   * opts.pads    – make a lily-pad lane
   * opts.mustPad – columns of which at least one must get a pad (path guarantee)
   */
  constructor(row, d, prev, opts = {}) {
    super(row, 'river');
    this.group.add(M.groundMesh('water', COLORS.water, COLORS.waterEdge, this.surface));
    this.standY = this.surface + 0.17;
    this.platforms = [];
    this.pads = !!opts.pads;

    if (this.pads) {
      this.dir = 0;
      this.speed = 0;
      const cols = new Set();
      const must = (opts.mustPad || []).filter((c) => Math.abs(c) <= COLS_HALF);
      if (must.length) cols.add(pick(must));
      const want = randInt(3, 5) - Math.round(d);
      for (const c of shuffle(playableCols())) {
        if (cols.size >= Math.max(2, want)) break;
        cols.add(c);
      }
      for (const c of cols) {
        const mesh = M.lilyPad();
        mesh.position.set(c, this.surface + 0.03, 0);
        mesh.rotation.y = pick([0, Math.PI / 2, Math.PI, -Math.PI / 2]);
        this.group.add(mesh);
        this.platforms.push({ x: c, len: 1, mesh, top: this.surface + 0.07, pad: true });
      }
      this.padCols = [...cols];
      return;
    }

    // Logs: alternate direction with a neighbouring log lane for a nice weave.
    this.dir = prev && prev.type === 'river' && prev.dir ? -prev.dir : (chance(0.5) ? 1 : -1);
    this.speed = rand(1.0, 1.7) + d * 1.5;
    const maxLen = d > 0.6 ? 3 : 4;
    const minLen = d > 0.3 ? 2 : 3;
    const minGap = 1.1 + d * 0.8;
    const maxGap = 2.2 + d * 1.4;
    const span = WRAP * 2;
    let cursor = rand(0, 1.5);
    for (;;) {
      const len = randInt(minLen, maxLen);
      if (cursor + len + minGap > span) break;
      const mesh = M.log(len);
      const p = { x: cursor + len / 2 - WRAP, len, mesh, top: this.standY, phase: Math.random() * 6, dip: 0 };
      mesh.position.set(p.x, this.standY - 0.17, 0);
      this.group.add(mesh);
      this.platforms.push(p);
      cursor += len + rand(minGap, maxGap);
    }
    this.time = 0;
  }

  get velocity() { return this.dir * this.speed; }

  coinSpots() {
    return this.platforms.map((p) => ({
      platform: p,
      offset: p.len <= 1 ? 0 : Math.floor(Math.random() * p.len) - p.len / 2 + 0.5,
    }));
  }

  update(dt) {
    if (this.pads) return;
    this.time += dt;
    const dx = this.velocity * dt;
    const span = WRAP * 2;
    for (const p of this.platforms) {
      p.x += dx;
      if (this.dir > 0 && p.x - p.len / 2 > WRAP) p.x -= span;
      else if (this.dir < 0 && p.x + p.len / 2 < -WRAP) p.x += span;
      p.dip = Math.max(0, p.dip - dt * 3);
      p.mesh.position.x = p.x;
      p.mesh.position.y = this.standY - 0.17 + Math.sin(this.time * 2 + p.phase) * 0.015 - p.dip * 0.06;
    }
  }

  /** The log / pad under x, or null (= water). */
  platformAt(x) {
    for (const p of this.platforms) {
      if (Math.abs(x - p.x) <= p.len / 2 + (p.pad ? 0.1 : 0.12)) return p;
    }
    return null;
  }

  /** Snap a rider onto the nearest whole cell of a log. Returns the offset from its center. */
  static snapOffset(p, x) {
    if (p.len <= 1) return 0;
    const cell = clamp(Math.round(x - p.x + p.len / 2 - 0.5), 0, p.len - 1);
    return cell - p.len / 2 + 0.5;
  }
}

// ---------------------------------------------------------------- railway

const WARN_TIME = 1.25;

export class RailLane extends Lane {
  constructor(row, d) {
    super(row, 'rail');
    this.group.add(M.groundMesh('gravel', COLORS.gravel, COLORS.gravelEdge, this.surface));
    this.group.add(M.railTrack(this.surface));
    this.d = d;

    const post = M.signalPost();
    post.position.set(-(COLS_HALF + 0.75), this.surface, 0.44);
    this.group.add(post);
    // Red wash over the track while a train is coming.
    this.warnGlow = new THREE.Mesh(GLOW_GEO, GLOW_MAT);
    this.warnGlow.position.set(0, this.surface + 0.12, 0);
    this.warnGlow.visible = false;
    this.group.add(this.warnGlow);
    this.lamps = [-0.11, 0.11].map((dx) => {
      const lamp = new THREE.Mesh(LAMP_GEO, LAMP_MAT);
      lamp.position.set(post.position.x + dx, this.surface + 1.38, 0.44 + 0.085);
      lamp.visible = false;
      this.group.add(lamp);
      return lamp;
    });

    this.dir = chance(0.5) ? 1 : -1;
    const t = M.train(randInt(2, 4) + Math.round(d * 2));
    this.train = t.mesh;
    this.trainLen = t.len;
    this.train.rotation.y = this.dir > 0 ? 0 : Math.PI;
    this.train.position.y = this.surface + 0.05;
    this.train.visible = false;
    this.group.add(this.train);

    this.state = 'idle';
    this.timer = rand(1.5, 6);
    this.trainX = 0;
  }

  nextGap() {
    return Math.max(1.6, rand(3.5, 7.5) - this.d * 3);
  }

  update(dt) {
    this.timer -= dt;
    if (this.state === 'idle') {
      if (this.timer <= 0) {
        this.state = 'warn';
        this.timer = WARN_TIME;
        emit('trainWarn', this);
      }
    } else if (this.state === 'warn') {
      this.flash();
      if (this.timer <= 0) {
        this.state = 'pass';
        this.speed = 22 + this.d * 10;
        this.trainX = -this.dir * (WRAP + this.trainLen / 2);
        this.train.visible = true;
        emit('trainPass', this);
      }
    } else if (this.state === 'pass') {
      this.flash();
      this.trainX += this.dir * this.speed * dt;
      this.train.position.x = this.trainX;
      if (Math.abs(this.trainX) > WRAP + this.trainLen / 2 + 0.5) {
        this.state = 'idle';
        this.timer = this.nextGap();
        this.train.visible = false;
        this.lamps[0].visible = this.lamps[1].visible = false;
        this.warnGlow.visible = false;
      }
    }
  }

  flash() {
    const on = Math.floor(this.timer * 8) % 2 === 0;
    this.lamps[0].visible = on;
    this.lamps[1].visible = !on;
    this.warnGlow.visible = on;
  }

  coinSpots() {
    return playableCols().map((x) => ({ x }));
  }

  hitTest(x, half) {
    if (this.state !== 'pass') return null;
    return Math.abs(x - this.trainX) < half + this.trainLen / 2 ? this : null;
  }
}

const LAMP_GEO = new THREE.BoxGeometry(0.15, 0.15, 0.04);
const GLOW_GEO = new THREE.BoxGeometry(COLS_HALF * 2 + 1, 0.02, 0.9);
const GLOW_MAT = new THREE.MeshBasicMaterial({ color: 0xff3030, transparent: true, opacity: 0.28, depthWrite: false });
const LAMP_MAT = new THREE.MeshBasicMaterial({ color: 0xff2b2b });
