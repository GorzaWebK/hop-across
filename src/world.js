// World: procedural lane generator + lane lifecycle (spawn ahead, recycle behind).

import { AHEAD, BEHIND, COLS_HALF, difficulty, chance, randInt, shuffle } from './config.js';
import { GrassLane, RoadLane } from './lanes.js';

const START_ROWS = 3;        // rows 0..3 are a safe meadow
const WALL_ROW = -3;         // rows <= this are a solid hedge

export class World {
  constructor(scene) {
    this.scene = scene;
    this.lanes = new Map();
    this.plan = [];
    this.nextRow = 0;
    this.lowestRow = 0;
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
    for (const lane of this.lanes.values()) lane.update(dt);
  }

  ensure(upToRow) {
    while (this.nextRow <= upToRow) {
      const row = this.nextRow++;
      const lane = this.makeLane(row);
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
      default: return new GrassLane(row, d, { protect: this.protectFrom(prev) });
    }
  }

  /** Columns a new grass lane must keep free so the path never dead-ends. */
  protectFrom(prev) {
    if (!prev) return [];
    if (prev.type === 'grass') {
      const free = shuffle(prev.freeCols());
      return free.slice(0, 2);
    }
    return [];
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
    const n = randInt(1, 2 + Math.round(d * 3));
    for (let i = 0; i < n; i++) this.plan.push('road');
  }
}
