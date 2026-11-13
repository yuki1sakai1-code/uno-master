import { Game } from './game.js';
import { canPlay, cardLabel, PLAYER_NAMES } from './cards.js';
import { initThemes } from './themes.js';
import { initField, updateField } from './field.js';
import { playCardEffect } from './effects.js';
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

const game = new Game();
let selectedIndex = -1;
let lastTopCardKey = null;

startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', () => {
  resultModal.classList.add('hidden');
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

  if (playerIndex === 0) {
    // プレイヤー（あなた）が4秒以上長考したら、AIがランダムにつぶやく
    humanThinkingTimer = setTimeout(() => {
      if (game.phase === 'human' && game.winner === null) {
        triggerHumanThinkingThought();
      }
    }, 4000);
  } else {
    triggerAiTurnThought(game, playerIndex);
  }
};

game.onUnoCalled = (playerIndex) => {
  triggerUnoReaction(playerIndex);
};

game.onGameOver = (winnerIndex) => {
  if (humanThinkingTimer) clearTimeout(humanThinkingTimer);
  triggerGameOverThoughts(winnerIndex);
  const won = winnerIndex === 0;
  resultTitle.textContent = won ? 'YOU WIN!' : 'GAME OVER';
  resultMessage.textContent = won
    ? 'おめでとう！静かな夜、最高の勝利。'
    : `${PLAYER_NAMES[winnerIndex]} の勝利… 次はリベンジ。`;
  setTimeout(() => resultModal.classList.remove('hidden'), 900);
};

function startGame() {
  titleScreen.classList.remove('active');
  gameScreen.classList.add('active');
  selectedIndex = -1;
  lastTopCardKey = null;
  if (humanThinkingTimer) clearTimeout(humanThinkingTimer);
  hideAllThoughts();
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

  unoBtn.disabled = !(game.phase === 'human' && hand.length === 1);
  passBtn.disabled = game.phase !== 'human';

  drawPile.style.opacity = isHumanTurn ? '1' : '0.5';
  drawPile.style.pointerEvents = isHumanTurn ? 'auto' : 'none';
}

render();
initThemes();
initField();
