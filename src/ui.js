// DOM overlays: HUD, start screen, game over screen.

const $ = (id) => document.getElementById(id);

export class UI {
  constructor() {
    this.hud = $('hud');
    this.score = $('score');
    this.best = $('best');
    this.start = $('start');
    this.gameover = $('gameover');
    this.finalScore = $('final-score');
    this.finalBest = $('final-best');
    this.newBest = $('new-best');
    this.coins = $('coins');
    this.coinsText = this.coins.querySelector('span');
    this.lastScore = -1;
  }

  setCoins(n, bump = false) {
    this.coinsText.textContent = n;
    if (bump) {
      this.coins.classList.remove('bump');
      void this.coins.offsetWidth;  // restart the CSS animation
      this.coins.classList.add('bump');
    }
  }

  setScore(n) {
    if (n === this.lastScore) return;  // avoid needless DOM writes every frame
    this.lastScore = n;
    this.score.textContent = n;
  }

  setBest(n) {
    this.best.textContent = `TOP ${n}`;
  }

  showStart() {
    this.start.classList.remove('hidden');
    this.gameover.classList.add('hidden');
    this.score.classList.add('invisible');
  }

  showPlaying() {
    this.start.classList.add('hidden');
    this.gameover.classList.add('hidden');
    this.score.classList.remove('invisible');
  }

  showGameOver(score, best, isNewBest) {
    this.finalScore.textContent = score;
    this.finalBest.textContent = best;
    this.newBest.classList.toggle('hidden', !isNewBest);
    this.gameover.classList.remove('hidden');
  }
}
