// Game bootstrap: renderer, state machine and main loop.

import * as THREE from 'three';
import { PLAYER_HALF, COLS_HALF, difficulty } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { UI } from './ui.js';
import { initInput } from './input.js';
import { CHARACTERS, characterById } from './characters.js';
import { voxelMaterial } from './voxel.js';
import * as store from './storage.js';
import { Hunter } from './hunter.js';
import { on, emit } from './events.js';

const SKY = 0x7fd0f5;
const LIGHT_OFFSET = new THREE.Vector3(-6, 14, 5);
const HUNTER_DISTANCE = 4.2;   // rows behind the camera before the sky hunter strikes
const LOCKED_MATERIAL = new THREE.MeshLambertMaterial({ color: 0x2a2f3a });

class Game {
  constructor() {
    this.canvas = document.getElementById('game');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(SKY);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    this.renderer.setPixelRatio(this.pixelRatio);

    this.scene = new THREE.Scene();
    this.rig = new CameraRig();
    this.setupLights();

    this.world = new World(this.scene);
    this.player = new Player(this.world);
    this.player.onLand = () => this.onLand();
    this.scene.add(this.player.root);
    this.hunter = new Hunter(this.scene);
    on('hunterGrab', () => this.rig.addShake(0.8));

    this.ui = new UI();
    this.best = Number(store.load('best', 0)) || 0;
    this.coins = Number(store.load('coins', 0)) || 0;
    this.ui.setBest(this.best);
    this.ui.setCoins(this.coins);

    this.unlocked = new Set(store.load('unlocked', ['bolt']));
    this.unlocked.add('bolt');
    this.charId = store.load('char', 'bolt');
    if (!this.unlocked.has(this.charId)) this.charId = 'bolt';
    this.player.setCharacter(characterById(this.charId));
    this.ui.bind({
      openChars: () => this.openSelect(),
      prev: () => this.browse(-1),
      next: () => this.browse(1),
      confirm: () => this.confirmSelect(),
      close: () => this.closeSelect(),
    });

    initInput(document.getElementById('app'), (a) => this.onAction(a));
    window.addEventListener('resize', () => this.resize());
    this.resize();

    this.reset();
    this.state = 'menu';
    this.ui.showStart();

    this.clock = new THREE.Clock();
    this.renderer.setAnimationLoop(() => this.frame());
  }

  setupLights() {
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x6b8fa8, 2.1));
    const sun = new THREE.DirectionalLight(0xfff4e0, 2.2);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    const s = sun.shadow.camera;
    s.left = -14; s.right = 14; s.top = 14; s.bottom = -14; s.near = 1; s.far = 50;
    sun.shadow.bias = -0.0015;
    sun.shadow.normalBias = 0.02;
    this.scene.add(sun, sun.target);
    this.sun = sun;
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.rig.resize(w, h);
  }

  reset() {
    this.world.reset();
    this.player.reset();
    this.hunter.reset();
    this.rig.reset(this.player);
    this.score = 0;
    this.runCoins = 0;
    this.ui.setScore(0);
  }

  // ------------------------------------------------------------ state

  startRun() {
    this.state = 'playing';
    this.ui.showPlaying();
  }

  onAction(a) {
    const isDir = a === 'up' || a === 'down' || a === 'left' || a === 'right';
    switch (this.state) {
      case 'menu':
        if (a === 'chars') this.openSelect();
        else if (isDir || a === 'tap' || a === 'action') {
          this.startRun();
          this.player.request(a === 'tap' || a === 'action' ? 'up' : a);
        }
        break;
      case 'playing':
        if (isDir) this.player.request(a);
        else if (a === 'tap') this.player.request('up');
        break;
      case 'over':
        if ((a === 'tap' || a === 'action') && performance.now() - this.overAt > 350) {
          this.reset();
          this.startRun();
        } else if (a === 'chars') this.openSelect();
        break;
      case 'select':
        if (a === 'left') this.browse(-1);
        else if (a === 'right') this.browse(1);
        else if (a === 'action') this.confirmSelect();
        else if (a === 'back' || a === 'chars') this.closeSelect();
        break;
      default:
        break;
    }
  }

  // ------------------------------------------------------------ character select

  openSelect() {
    if (this.state !== 'menu' && this.state !== 'over') return;
    if (this.state === 'over') this.reset();   // back to a fresh meadow behind the panel
    this.state = 'select';
    this.selIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === this.charId));
    this.player.root.scale.setScalar(1.25);
    this.rig.setPreview(true);
    this.ui.showSelect();
    this.refreshSelect();
  }

  refreshSelect() {
    const def = CHARACTERS[this.selIndex];
    const unlocked = this.unlocked.has(def.id);
    this.player.setCharacter(def);
    this.player.body.material = unlocked ? voxelMaterial : LOCKED_MATERIAL;
    this.player.squash = 1;
    this.ui.updateSelect(def, this.selIndex, CHARACTERS.length, unlocked, def.id === this.charId, this.coins);
  }

  browse(delta) {
    if (this.state !== 'select') return;
    this.selIndex = (this.selIndex + delta + CHARACTERS.length) % CHARACTERS.length;
    this.refreshSelect();
    emit('select');
  }

  confirmSelect() {
    if (this.state !== 'select') return;
    const def = CHARACTERS[this.selIndex];
    if (this.unlocked.has(def.id)) {
      this.charId = def.id;
      store.save('char', def.id);
      this.closeSelect();
      return;
    }
    if (this.coins >= def.price) {
      this.coins -= def.price;
      this.unlocked.add(def.id);
      store.save('coins', this.coins);
      store.save('unlocked', [...this.unlocked]);
      this.ui.setCoins(this.coins, true);
      this.refreshSelect();
      emit('unlock');
    } else {
      this.ui.denySelect();
      emit('deny');
    }
  }

  closeSelect() {
    if (this.state !== 'select') return;
    this.player.setCharacter(characterById(this.charId));
    this.player.body.material = voxelMaterial;
    this.player.root.scale.setScalar(1);
    this.rig.setPreview(false);
    this.player.facing = this.player.targetFacing = 0;
    this.state = 'menu';
    this.ui.hideSelect();
    this.ui.showStart();
  }

  onLand() {
    if (this.player.row > this.score) {
      this.score = this.player.row;
      this.ui.setScore(this.score);
    }
  }

  die(type, info) {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.player.die(type, info);
    this.dyingFor = 0;
    this.deathType = type;
    if (type === 'hunter') this.hunter.start(this.player);
    else this.rig.addShake(1);
  }

  gameOver() {
    this.state = 'over';
    this.overAt = performance.now();
    const isNewBest = this.score > this.best;
    if (isNewBest) {
      this.best = this.score;
      store.save('best', this.best);
      this.ui.setBest(this.best);
    }
    this.ui.showGameOver(this.score, this.best, isNewBest, this.runCoins);
  }

  // ------------------------------------------------------------ loop

  checkHazards() {
    const p = this.player;
    const lane = this.world.getLane(p.laneRow);
    if (!lane) return;
    if (lane.type === 'river' && !p.hop) {
      // landed in the water, or a log carried us off the edge
      if (!p.attached || Math.abs(p.x) > COLS_HALF + 0.6) this.die('splash');
      return;
    }
    const hit = lane.hitTest(p.x, PLAYER_HALF);
    if (hit) {
      if (lane.type === 'rail') this.die('fling', { dir: lane.dir });
      else this.die('squash', { dir: lane.dir });
      return;
    }
    // Lagging too far behind the scrolling camera?
    if (p.laneRow < this.rig.row - HUNTER_DISTANCE) this.die('hunter');
  }

  checkCoins() {
    const p = this.player;
    const lane = this.world.getLane(p.laneRow);
    if (!lane || !lane.coins.length) return;
    const n = lane.collectCoins(p.x);
    if (n) {
      this.coins += n;
      this.runCoins += n;
      store.save('coins', this.coins);
      this.ui.setCoins(this.coins, true);
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.world.update(dt, this.player.row, this.rig.row);
    this.player.update(dt);

    this.hunter.update(dt);
    if (this.state === 'select') {
      // slow turntable for the character preview
      this.player.facing += dt * 1.6;
      this.player.targetFacing = this.player.facing;
    }

    let scroll = 0;
    if (this.state === 'playing') {
      this.checkCoins();
      this.checkHazards();
      // the camera creeps forward on its own, faster the further you get
      scroll = (0.3 + difficulty(this.score) * 0.6) * dt;
    } else if (this.state === 'dying') {
      this.dyingFor += dt;
      if (this.dyingFor > (this.deathType === 'hunter' ? 1.8 : 1.0)) this.gameOver();
    }

    this.rig.update(dt, this.player, scroll);
    this.sun.position.copy(this.rig.focus).add(LIGHT_OFFSET);
    this.sun.target.position.copy(this.rig.focus);
    this.renderer.render(this.scene, this.rig.camera);
  }
}

window.__game = new Game();
