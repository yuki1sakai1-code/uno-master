/** UNO deck and card utilities */

export const COLORS = ['red', 'green', 'blue', 'yellow'];
export const COLOR_LABELS = { red: '赤', green: '緑', blue: '青', yellow: '黄' };

const NUMBERS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const ACTIONS = ['skip', 'reverse', 'draw2'];

export function createDeck() {
  const deck = [];

  for (const color of COLORS) {
    deck.push({ color, value: 0, type: 'number' });

    for (let n = 1; n <= 9; n++) {
      deck.push({ color, value: n, type: 'number' });
      deck.push({ color, value: n, type: 'number' });
    }

    for (const action of ACTIONS) {
      deck.push({ color, value: action, type: 'action' });
      deck.push({ color, value: action, type: 'action' });
    }
  }

  deck.push({ color: 'wild', value: 'wild', type: 'wild' });
  deck.push({ color: 'wild', value: 'wild', type: 'wild' });
  deck.push({ color: 'wild', value: 'wild4', type: 'wild' });
  deck.push({ color: 'wild', value: 'wild4', type: 'wild' });

  return deck;
}

export function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function cardId(card) {
  return `${card.color}-${card.value}`;
}

export function cardLabel(card) {
  if (card.type === 'number') return String(card.value);
  if (card.value === 'skip') return '⊘';
  if (card.value === 'reverse') return '⇄';
  if (card.value === 'draw2') return '+2';
  if (card.value === 'wild') return 'W';
  if (card.value === 'wild4') return '+4';
  return '?';
}

export function symbolClass(card) {
  if (card.type === 'number') return '';
  return `symbol-${card.value}`;
}

export function canPlay(card, topCard, currentColor) {
  if (card.color === 'wild') return true;
  const matchColor = currentColor || topCard.color;
  if (card.color === matchColor) return true;
  if (card.value === topCard.value) return true;
  return false;
}

export function isActionStart(card) {
  return card.type === 'action' || card.type === 'wild';
}

export function mostCommonColor(hand) {
  const counts = {};
  for (const c of COLORS) counts[c] = 0;
  for (const card of hand) {
    if (card.color !== 'wild') counts[card.color]++;
  }
  return COLORS.reduce((a, b) => (counts[a] >= counts[b] ? a : b));
}

export const PLAYER_NAMES = ['あなた', 'プレイヤーA', 'プレイヤーB', 'プレイヤーC'];
