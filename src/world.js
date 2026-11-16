// World: procedural lane generator + lane lifecycle (spawn ahead, recycle behind).

import { AHEAD, BEHIND, COLS_HALF, difficulty, chance, randInt, shuffle, pick } from './config.js';
import { GrassLane, RoadLane, RiverLane, RailLane } from './lanes.js';

const START_ROWS = 3;        // rows 0..3 are a safe meadow
const WALL_ROW = -3;         // rows <= this are a solid hedge

export class World {
  constructor(scene) {
    this.scene = scene;
    this.lanes = new Map();
    this.plan = [];
    this.nextRow = 0;
    this.lowestRow = 0;
    this.time = 0;
  }

  reset() {
    for (const lane of this.lanes.values()) this.scene.remove(lane.group);
    this.lanes.clear();
    this.plan = [];
    this.nextRow = WALL_ROW - 6;
    this.lowestRow = this.nextRow;
    this.ensure(AHEAD);
  }

  getLane(row) {
    return this.lanes.get(row) || null;
  }

  /** Grid-based check used before a hop starts. */
  canEnter(row, col) {
    if (col < -COLS_HALF || col > COLS_HALF) return false;
    const lane = this.getLane(row);
    return !!lane && !lane.isBlocked(col);
  }

  update(dt, playerRow, cameraRow) {
    this.ensure(Math.max(playerRow, cameraRow) + AHEAD);
    // Recycle lanes that have scrolled off the bottom of the screen.
    const cutoff = Math.floor(cameraRow) - BEHIND;
    while (this.lowestRow < cutoff) {
      const lane = this.lanes.get(this.lowestRow);
      if (lane) {
        this.scene.remove(lane.group);
        this.lanes.delete(this.lowestRow);
      }
      this.lowestRow++;
    }
    this.time += dt;
    for (const lane of this.lanes.values()) {
      lane.update(dt);
      if (lane.coins.length) lane.updateCoins(dt, this.time);
    }
  }

  ensure(upToRow) {
    while (this.nextRow <= upToRow) {
      const row = this.nextRow++;
      const lane = this.makeLane(row);
      this.maybeAddCoin(lane);
      this.lanes.set(row, lane);
      this.scene.add(lane.group);
    }
  }

  // ------------------------------------------------------------ generation

  makeLane(row) {
    const prev = this.getLane(row - 1);
    const d = difficulty(row);
    if (row <= WALL_ROW) return new GrassLane(row, d, { wall: true });
    if (row <= START_ROWS) return new GrassLane(row, d, { start: true, protect: this.protectFrom(prev) });

    if (this.plan.length === 0) this.planCluster(row, prev);
    const type = this.plan.shift();
    switch (type) {
      case 'road': return new RoadLane(row, d, prev);
      case 'rail': return new RailLane(row, d);
      case 'logs': return new RiverLane(row, d, prev);
      case 'pads': return new RiverLane(row, d, prev, { pads: true, mustPad: this.padTargets(prev) });
      default: return new GrassLane(row, d, { protect: this.protectFrom(prev) });
    }
  }

  maybeAddCoin(lane) {
    if (lane.row < 2) return;
    const odds = { grass: 0.1, road: 0.16, river: 0.12, rail: 0.12 }[lane.type] || 0;
    if (!chance(odds)) return;
    const spots = lane.coinSpots().filter((s) => s.platform || Math.abs(s.x) <= COLS_HALF);
    if (spots.length) lane.addCoin(pick(spots));
  }

  /** Columns a new grass lane must keep free so the path never dead-ends. */
  protectFrom(prev) {
    if (!prev) return [];
    if (prev.type === 'grass') {
      const free = shuffle([...prev.reachable]);
      return free.slice(0, 2);
    }
    if (prev.type === 'river' && prev.pads) return prev.reachable;
    return [];
  }

  /** Columns a lily-pad lane should cover so it can be reached from `prev`. */
  padTargets(prev) {
    if (!prev) return [];
    if (prev.type === 'grass') return prev.reachable;
    if (prev.type === 'river' && prev.pads) return prev.reachable;
    return [];   // roads, rails and logs let the player line up freely
  }

  /** Queue the next cluster of lanes (a hazard group followed by a breather). */
  planCluster(row, prev) {
    const d = difficulty(row);
    // Always put at least one grass lane between hazard clusters.
    if (prev && prev.type !== 'grass') {
      const breather = chance(0.55 - d * 0.35) ? 2 : 1;
      for (let i = 0; i < breather; i++) this.plan.push('grass');
      return;
    }
    const weights = [
      ['road', 0.5],
      ['river', row >= 6 ? 0.3 : 0],
      ['rail', row >= 12 ? 0.12 + d * 0.18 : 0],
    ];
    const type = weighted(weights);
    if (type === 'road') {
      const n = randInt(1, 2 + Math.round(d * 3));
      for (let i = 0; i < n; i++) this.plan.push('road');
    } else if (type === 'river') {
      const n = randInt(1, 2 + Math.round(d));
      for (let i = 0; i < n; i++) this.plan.push(chance(0.28 - d * 0.12) ? 'pads' : 'logs');
    } else {
      const n = randInt(1, 1 + Math.round(d * 2));
      for (let i = 0; i < n; i++) this.plan.push('rail');
    }
  }
}

function weighted(list) {
  const total = list.reduce((a, [, w]) => a + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of list) {
    r -= w;
    if (r <= 0) return k;
  }
  return list[0][0];
}
