// Game bootstrap: renderer, state machine and main loop.

import * as THREE from 'three';
import { PLAYER_HALF, COLS_HALF } from './config.js';
import { World } from './world.js';
import { Player } from './player.js';
import { CameraRig } from './camera.js';
import { UI } from './ui.js';
import { initInput } from './input.js';
import { CHARACTERS } from './characters.js';
import * as store from './storage.js';

const SKY = 0x7fd0f5;
const LIGHT_OFFSET = new THREE.Vector3(-6, 14, 5);

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
    this.player.setCharacter(CHARACTERS[0]);
    this.player.onLand = () => this.onLand();
    this.scene.add(this.player.root);

    this.ui = new UI();
    this.best = Number(store.load('best', 0)) || 0;
    this.ui.setBest(this.best);

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
    this.rig.reset(this.player);
    this.score = 0;
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
        if (isDir || a === 'tap' || a === 'action') {
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
        }
        break;
      default:
        break;
    }
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
    this.rig.addShake(1);
    this.dyingFor = 0;
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
    this.ui.showGameOver(this.score, this.best, isNewBest);
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
    }
  }

  frame() {
    const dt = Math.min(this.clock.getDelta(), 1 / 20);
    this.world.update(dt, this.player.row, this.rig.row);
    this.player.update(dt);

    if (this.state === 'playing') {
      this.checkHazards();
    } else if (this.state === 'dying') {
      this.dyingFor += dt;
      if (this.dyingFor > 0.9) this.gameOver();
    }

    this.rig.update(dt, this.player);
    this.sun.position.copy(this.rig.focus).add(LIGHT_OFFSET);
    this.sun.target.position.copy(this.rig.focus);
    this.renderer.render(this.scene, this.rig.camera);
  }
}

window.__game = new Game();
