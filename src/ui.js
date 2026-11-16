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
    this.select = $('select');
    this.selName = $('sel-name');
    this.selBlurb = $('sel-blurb');
    this.selCount = $('sel-count');
    this.selGo = $('sel-go');
    this.runCoins = $('run-coins');
    this.lastScore = -1;
  }

  /** Wire button callbacks: { openChars, prev, next, confirm, close } */
  bind(h) {
    document.querySelectorAll('.open-chars').forEach((b) => b.addEventListener('click', h.openChars));
    $('sel-prev').addEventListener('click', h.prev);
    $('sel-next').addEventListener('click', h.next);
    this.selGo.addEventListener('click', h.confirm);
    $('sel-close').addEventListener('click', h.close);
  }

  showSelect() {
    this.start.classList.add('hidden');
    this.gameover.classList.add('hidden');
    this.score.classList.add('invisible');
    this.select.classList.remove('hidden');
  }

  hideSelect() {
    this.select.classList.add('hidden');
  }

  updateSelect(def, index, total, unlocked, selected, coins) {
    this.selName.textContent = unlocked ? def.name : `${def.name} \u{1F512}`;
    this.selBlurb.textContent = def.blurb;
    this.selCount.textContent = `${index + 1} / ${total}`;
    const go = this.selGo;
    go.classList.remove('locked');
    if (unlocked) {
      go.textContent = selected ? 'PLAY' : 'SELECT';
    } else {
      go.textContent = `UNLOCK \u25C6 ${def.price}`;
      if (coins < def.price) go.classList.add('locked');
    }
  }

  denySelect() {
    this.selGo.classList.remove('shake');
    void this.selGo.offsetWidth;
    this.selGo.classList.add('shake');
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

  showGameOver(score, best, isNewBest, runCoins = 0) {
    this.runCoins.textContent = runCoins ? `+${runCoins} coin${runCoins > 1 ? 's' : ''}` : '';
    this.finalScore.textContent = score;
    this.finalBest.textContent = best;
    this.newBest.classList.toggle('hidden', !isNewBest);
    this.gameover.classList.remove('hidden');
  }
}
