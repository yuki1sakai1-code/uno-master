import { Game } from './game.js';
import { canPlay, cardLabel, PLAYER_NAMES } from './cards.js';
import { initThemes } from './themes.js';
import { initField, updateField } from './field.js';
import { playCardEffect } from './effects.js';
import { audioManager } from './audio.js';
import {
  triggerAiTurnThought,
  triggerGameStartThoughts,
  triggerUnoReaction,
  triggerGameOverThoughts,
  triggerHumanThinkingThought,
  hideAllThoughts
} from './thoughts.js';

const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

const titleScreen = $('#title-screen');
const gameScreen = $('#game-screen');
const startBtn = $('#start-btn');
const restartBtn = $('#restart-btn');
const drawPile = $('#draw-pile');
const discardPile = $('#discard-pile');
const playerHand = $('#player-hand');
const deckCount = $('#deck-count');
const messageBar = $('#message-bar');
const unoBtn = $('#uno-btn');
const passBtn = $('#pass-btn');
const colorModal = $('#color-modal');
const resultModal = $('#result-modal');
const resultTitle = $('#result-title');
const resultMessage = $('#result-message');

// Audio & Settings Elements
const bgmToggleBtn = $('#bgm-toggle-btn');
const bgmIcon = $('#bgm-icon');
const settingsToggleBtn = $('#settings-toggle-btn');
const settingsModal = $('#settings-modal');
const settingsCloseBtn = $('#settings-close-btn');
const settingsConfirmBtn = $('#settings-confirm-btn');
const modalBgmToggleBtn = $('#modal-bgm-toggle-btn');
const modalBgmIcon = $('#modal-bgm-icon');
const modalBgmStatus = $('#modal-bgm-status');
const volumeSlider = $('#volume-slider');
const volumeValue = $('#volume-value');

const game = new Game();
let selectedIndex = -1;
let lastTopCardKey = null;

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  resultModal.classList.add('hidden');
  const cutinEl = $('#winner-cutin');
  if (cutinEl) cutinEl.classList.add('hidden');
  startGame();
});

drawPile.addEventListener('click', () => game.humanDraw());
unoBtn.addEventListener('click', () => game.callUno());
passBtn.addEventListener('click', () => game.humanPass());

$$('.color-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    colorModal.classList.add('hidden');
    game.humanPickColor(btn.dataset.color);
  });
});

let humanThinkingTimer = null;

game.onUpdate = render;
game.onMessage = showMessage;
game.onColorPick = () => {
  colorModal.classList.remove('hidden');
};
game.onCardPlayed = (card) => playCardEffect(card);

game.onGameStart = () => {
  hideAllThoughts();
  triggerGameStartThoughts();
};

game.onTurnStart = (playerIndex) => {
  if (humanThinkingTimer) {
    clearTimeout(humanThinkingTimer);
    humanThinkingTimer = null;
  }

  // ターン交代時に前ターンの吹き出しを確実にクリア
  hideAllThoughts();

  if (playerIndex === 0) {
    // プレイヤー（あなた）が4.5秒以上長考したら、AIがランダムにつぶやく
    humanThinkingTimer = setTimeout(() => {
      if (game.phase === 'human' && game.winner === null) {
        triggerHumanThinkingThought();
      }
    }, 4500);
  } else {
    triggerAiTurnThought(game, playerIndex);
  }
};

game.onUnoCalled = (playerIndex) => {
  triggerUnoReaction(playerIndex);
};

const WINNER_VICTORY_DATA = {
  1: { // プレイヤーA
    avatar: 'assets/avatars/jockey-a-win.png',
    quote: '俺の勝ちだ。',
    name: 'プレイヤーA'
  },
  2: { // プレイヤーB
    avatar: 'assets/avatars/jockey-b-win.png',
    quote: '俺の勝ちだ。',
    name: 'プレイヤーB'
  },
  3: { // プレイヤーC
    avatar: 'assets/avatars/jockey-c-win.png',
    quote: '私の勝ちね',
    name: 'プレイヤーC'
  }
};

game.onGameOver = (winnerIndex) => {
  if (humanThinkingTimer) clearTimeout(humanThinkingTimer);
  triggerGameOverThoughts(winnerIndex);
  const won = winnerIndex === 0;
  resultTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
  resultMessage.textContent = won
    ? 'おめでとう！最高の勝利。'
    : `${PLAYER_NAMES[winnerIndex]} の勝利… 次はリベンジ。`;

  // 自分以外のプレイヤーが勝利した時の演出設定 (笑顔画像 & 吹き出し)
  const cutinEl = $('#winner-cutin');
  if (cutinEl) {
    if (!won && WINNER_VICTORY_DATA[winnerIndex]) {
      const data = WINNER_VICTORY_DATA[winnerIndex];
      const imgEl = $('#winner-avatar-img');
      const textEl = $('#winner-speech-text');
      if (imgEl) imgEl.src = data.avatar;
      if (textEl) textEl.textContent = data.quote;
      cutinEl.classList.remove('hidden');
    } else {
      cutinEl.classList.add('hidden');
    }
  }

  setTimeout(() => resultModal.classList.remove('hidden'), 900);
};

function startGame() {
  titleScreen.classList.remove('active');
  gameScreen.classList.add('active');
  selectedIndex = -1;
  lastTopCardKey = null;
  if (humanThinkingTimer) clearTimeout(humanThinkingTimer);
  hideAllThoughts();
  audioManager.play();
  game.start();
  requestAnimationFrame(() => {
    updateField();
  });
}

function showMessage(msg, important = false) {
  messageBar.textContent = msg;
  messageBar.classList.toggle('important', important);
}

function renderCardElement(card, options = {}) {
  const { playable = false, index = -1, fan = false, fanIndex = 0, fanTotal = 1 } = options;
  const el = document.createElement('div');
  const isWild = card.color === 'wild';
  el.className = `card ${isWild ? 'wild' : card.color}`;
  if (playable) el.classList.add('playable');
  if (index === selectedIndex) el.classList.add('selected');

  const label = cardLabel(card);

  el.innerHTML = `
    <div class="card-surface">
      <div class="card-oval" aria-hidden="true"></div>
      <div class="card-shine" aria-hidden="true"></div>
      <span class="card-corner top-left">${label}</span>
      <span class="card-value">${label}</span>
      <span class="card-corner bottom-right">${label}</span>
    </div>
  `;

  if (fan && fanTotal > 1) {
    const spread = Math.min(fanTotal * 14, 280);
    const start = -spread / 2;
    const step = spread / (fanTotal - 1 || 1);
    const angle = fanTotal > 1 ? -12 + (24 / (fanTotal - 1)) * fanIndex : 0;
    el.style.transform = `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.3}px)`;
    el.style.zIndex = fanIndex;
  }

  if (playable && index >= 0) {
    el.addEventListener('click', () => {
      if (game.phase !== 'human') return;
      selectedIndex = index;
      game.humanPlay(index);
      selectedIndex = -1;
    });
  }

  return el;
}

// ===== キャラクター表情管理 (通常 / 有利 / 不利) =====
export const AVATAR_EXPRESSIONS = {
  1: { // プレイヤーA
    normal: 'assets/avatars/jockey-a.png',
    advantage: 'assets/avatars/jockey-a-win.png',
    disadvantage: 'assets/avatars/jockey-a-lose.png',
  },
  2: { // プレイヤーB
    normal: 'assets/avatars/jockey-b.png',
    advantage: 'assets/avatars/jockey-b-win.png',
    disadvantage: 'assets/avatars/jockey-b-lose.png',
  },
  3: { // プレイヤーC
    normal: 'assets/avatars/jockey-c.png',
    advantage: 'assets/avatars/jockey-c-win.png',
    disadvantage: 'assets/avatars/jockey-c-lose.png',
  }
};

function updateOpponentEmotions() {
  if (!game || !game.players) return;

  for (let p = 1; p <= 3; p++) {
    const oppEl = $(`[data-player="${p}"]`);
    if (!oppEl) continue;
    const imgEl = oppEl.querySelector('.avatar-img');
    if (!imgEl) continue;

    const count = (game.players[p] && game.players[p].length) || 0;
    let state = 'normal';

    // ゲーム進行中のみ判定
    if (game.phase && game.phase !== 'init' && count > 0) {
      if (count <= 2) {
        // 有利: 残り2枚以下（UNO直前・優勢）
        state = 'advantage';
      } else if (count >= 8) {
        // 不利: 8枚以上（ドロー累積・劣勢）
        state = 'disadvantage';
      } else {
        // 通常: 3〜7枚
        state = 'normal';
      }
    }

    const expMap = AVATAR_EXPRESSIONS[p];
    if (expMap) {
      const targetSrc = expMap[state] || expMap.normal;
      const currentEmotion = imgEl.getAttribute('data-emotion');
      if (currentEmotion !== state) {
        imgEl.setAttribute('data-emotion', state);
        const testImg = new Image();
        testImg.onload = () => {
          imgEl.src = targetSrc;
        };
        testImg.onerror = () => {
          // 画像が未配置または404の場合は通常画像へフォールバック
          imgEl.src = expMap.normal;
        };
        testImg.src = targetSrc;
      }
    }
  }
}

function render() {
  deckCount.textContent = game.deck.length;

  discardPile.innerHTML = '';
  if (game.topCard) {
    const top = renderCardElement(game.topCard);
    const topKey = `${game.discard.length}-${game.topCard.color}-${game.topCard.value}`;
    if (topKey !== lastTopCardKey && game.topCard.type !== 'number') {
      top.classList.add('fx-discard-pop');
    }
    lastTopCardKey = topKey;
    discardPile.appendChild(top);
  }

  playerHand.innerHTML = '';
  const hand = game.players[0];
  const isHumanTurn = game.phase === 'human' || game.phase === 'picking-color';

  hand.forEach((card, i) => {
    const playable = isHumanTurn && canPlay(card, game.topCard, game.currentColor);
    const el = renderCardElement(card, {
      playable,
      index: i,
      fan: true,
      fanIndex: i,
      fanTotal: hand.length,
    });
    playerHand.appendChild(el);
  });

  for (let p = 1; p <= 3; p++) {
    const bar = $(`#bar-${p}`);
    const count = game.players[p].length;
    bar.innerHTML = '';
    const segments = Math.min(count, 10);
    for (let s = 0; s < 10; s++) {
      const seg = document.createElement('div');
      seg.className = 'segment' + (s < segments ? ' filled' : '');
      bar.appendChild(seg);
    }
  }

  $$('.opponent').forEach(el => {
    const idx = parseInt(el.dataset.player, 10);
    el.classList.toggle('active', game.currentPlayer === idx);
  });

  updateOpponentEmotions();

  unoBtn.disabled = !(game.phase === 'human' && hand.length === 1);
  passBtn.disabled = game.phase !== 'human';

  drawPile.style.opacity = isHumanTurn ? '1' : '0.5';
  drawPile.style.pointerEvents = isHumanTurn ? 'auto' : 'none';
}

render();
initThemes();
initField();

// ===== Audio & Settings Integration =====
function updateAudioUI(state) {
  const isEnabled = state.enabled;
  if (bgmIcon) bgmIcon.textContent = isEnabled ? '🔊' : '🔇';
  if (bgmToggleBtn) {
    bgmToggleBtn.classList.toggle('muted', !isEnabled);
    bgmToggleBtn.title = isEnabled ? '音楽 OFF (ミュート)' : '音楽 ON';
  }
  if (modalBgmIcon) modalBgmIcon.textContent = isEnabled ? '🔊' : '🔇';
  if (modalBgmStatus) modalBgmStatus.textContent = isEnabled ? 'ON' : 'OFF';
  if (modalBgmToggleBtn) modalBgmToggleBtn.classList.toggle('active', isEnabled);

  $$('.track-btn').forEach(btn => {
    const isActive = btn.dataset.track === state.currentTrackId;
    btn.classList.toggle('active', isActive);
    const icon = btn.querySelector('.track-status-icon');
    if (icon) icon.textContent = isActive ? (isEnabled ? '▶' : '⏸') : '';
  });

  if (volumeSlider) volumeSlider.value = Math.round(state.volume * 100);
  if (volumeValue) volumeValue.textContent = `${Math.round(state.volume * 100)}%`;
}

bgmToggleBtn?.addEventListener('click', () => {
  audioManager.toggle();
});

modalBgmToggleBtn?.addEventListener('click', () => {
  audioManager.toggle();
});

settingsToggleBtn?.addEventListener('click', () => {
  settingsModal?.classList.remove('hidden');
});

settingsCloseBtn?.addEventListener('click', () => {
  settingsModal?.classList.add('hidden');
});

settingsConfirmBtn?.addEventListener('click', () => {
  settingsModal?.classList.add('hidden');
});

settingsModal?.addEventListener('click', (e) => {
  if (e.target === settingsModal) {
    settingsModal.classList.add('hidden');
  }
});

$$('.track-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    audioManager.setTrack(btn.dataset.track);
  });
});

volumeSlider?.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  audioManager.setVolume(val / 100);
});

window.audioManager = audioManager;
audioManager.onStateChange = updateAudioUI;
updateAudioUI({
  enabled: audioManager.enabled,
  currentTrackId: audioManager.currentTrackId,
  volume: audioManager.volume,
  isPlaying: false
});

// ユーザーが画面上の任意の場所をクリックした際に音声再生可能状態にする
const unlockAudio = () => {
  if (audioManager.enabled && audioManager.audio.paused) {
    audioManager.play();
  }
  window.removeEventListener('click', unlockAudio);
};
window.addEventListener('click', unlockAudio);

if (new URLSearchParams(window.location.search).has('autostart')) {
  setTimeout(startGame, 150);
}
