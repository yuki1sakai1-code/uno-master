import {
  createDeck, shuffle, canPlay, isActionStart,
  mostCommonColor, PLAYER_NAMES, COLOR_LABELS
} from './cards.js';

export class Game {
  constructor() {
    this.players = [[], [], [], []];
    this.deck = [];
    this.discard = [];
    this.currentPlayer = 0;
    this.direction = 1;
    this.currentColor = null;
    this.phase = 'idle';
    this.pendingDraw = 0;
    this.unoCalled = [false, false, false, false];
    this.winner = null;
    this.onUpdate = null;
    this.onMessage = null;
    this.onColorPick = null;
    this.onGameOver = null;
    this.onCardPlayed = null;
  }

  start() {
    this.deck = shuffle(createDeck());
    this.discard = [];
    this.players = [[], [], [], []];
    this.currentPlayer = 0;
    this.direction = 1;
    this.currentColor = null;
    this.phase = 'playing';
    this.pendingDraw = 0;
    this.unoCalled = [false, false, false, false];
    this.winner = null;

    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 7; j++) {
        this.players[i].push(this.deck.pop());
      }
    }

    let top = this.deck.pop();
    while (isActionStart(top)) {
      this.deck.unshift(top);
      this.deck = shuffle(this.deck);
      top = this.deck.pop();
    }
    this.discard.push(top);
    this.currentColor = top.color;

    this.emitUpdate();
    this.emitMessage('ゲーム開始！');
    this.runTurn();
  }

  get topCard() {
    return this.discard[this.discard.length - 1];
  }

  get playableColor() {
    return this.currentColor || this.topCard.color;
  }

  getValidPlays(playerIndex) {
    return this.players[playerIndex].filter(c => canPlay(c, this.topCard, this.currentColor));
  }

  emitUpdate() {
    this.onUpdate?.();
  }

  emitMessage(msg, important = false) {
    this.onMessage?.(msg, important);
  }

  async runTurn() {
    if (this.winner !== null) return;

    this.emitUpdate();

    if (this.currentPlayer === 0) {
      this.phase = 'human';
      this.emitUpdate();
      return;
    }

    this.phase = 'ai';
    this.emitUpdate();
    await delay(800 + Math.random() * 600);
    this.aiTurn(this.currentPlayer);
  }

  aiTurn(idx) {
    if (this.winner !== null) return;

    const hand = this.players[idx];
    const name = PLAYER_NAMES[idx];

    if (this.pendingDraw > 0) {
      const count = this.pendingDraw;
      this.drawCards(idx, count);
      this.pendingDraw = 0;
      this.emitMessage(`${name} が ${count}枚引いた`);
      this.advancePlayer();
      this.runTurn();
      return;
    }

    const valid = this.getValidPlays(idx);

    if (valid.length === 0) {
      const drawn = this.drawOne(idx);
      this.emitMessage(`${name} がカードを引いた`);
      if (drawn && canPlay(drawn, this.topCard, this.currentColor)) {
        this.playCard(idx, drawn);
        return;
      }
      this.advancePlayer();
      this.runTurn();
      return;
    }

    const card = this.pickAiCard(valid, hand);
    this.playCard(idx, card);
  }

  pickAiCard(valid, hand) {
    const wild4 = valid.find(c => c.value === 'wild4');
    const wild = valid.find(c => c.value === 'wild');
    const draw2 = valid.find(c => c.value === 'draw2');
    const skip = valid.find(c => c.value === 'skip');
    const action = valid.find(c => c.type === 'action' || c.type === 'wild');

    if (hand.length <= 2 && (wild4 || wild)) return wild4 || wild;
    if (draw2) return draw2;
    if (skip) return skip;
    if (action) return action;

    const numbers = valid.filter(c => c.type === 'number');
    return numbers[Math.floor(Math.random() * numbers.length)] || valid[0];
  }

  drawOne(playerIndex) {
    if (this.deck.length === 0) this.reshuffleDeck();
    if (this.deck.length === 0) return null;
    const card = this.deck.pop();
    this.players[playerIndex].push(card);
    return card;
  }

  drawCards(playerIndex, count) {
    for (let i = 0; i < count; i++) {
      this.drawOne(playerIndex);
    }
  }

  reshuffleDeck() {
    if (this.discard.length <= 1) return;
    const top = this.discard.pop();
    this.deck = shuffle(this.discard);
    this.discard = [top];
  }

  humanDraw() {
    if (this.phase !== 'human' || this.winner !== null) return;

    if (this.pendingDraw > 0) {
      this.drawCards(0, this.pendingDraw);
      this.emitMessage(`あなたが ${this.pendingDraw}枚引きました`);
      this.pendingDraw = 0;
      this.advancePlayer();
      this.runTurn();
      return;
    }

    const drawn = this.drawOne(0);
    if (drawn) {
      this.emitMessage('カードを引きました');
      if (canPlay(drawn, this.topCard, this.currentColor)) {
        this.emitUpdate();
        return;
      }
    }
    this.advancePlayer();
    this.runTurn();
  }

  humanPlay(cardIndex) {
    if (this.phase !== 'human' || this.winner !== null) return false;

    const hand = this.players[0];
    const card = hand[cardIndex];
    if (!card || !canPlay(card, this.topCard, this.currentColor)) return false;

    if (card.color === 'wild') {
      this.phase = 'picking-color';
      this._pendingWild = cardIndex;
      this.onColorPick?.(card);
      this.emitUpdate();
      return true;
    }

    this.playCard(0, card);
    return true;
  }

  humanPickColor(color) {
    if (this.phase !== 'picking-color') return;
    const idx = this._pendingWild;
    const card = this.players[0][idx];
    this.currentColor = color;
    this.phase = 'human';
    this.playCard(0, card);
  }

  aiPickColor(hand) {
    return mostCommonColor(hand);
  }

  playCard(playerIndex, card) {
    const hand = this.players[playerIndex];
    const idx = hand.indexOf(card);
    if (idx === -1) return;

    hand.splice(idx, 1);
    this.discard.push(card);

    this.onCardPlayed?.(card, playerIndex);

    if (card.color !== 'wild') {
      this.currentColor = card.color;
    }

    const name = PLAYER_NAMES[playerIndex];

    if (hand.length === 1) {
      this.unoCalled[playerIndex] = true;
    }

    if (hand.length === 0) {
      this.winner = playerIndex;
      this.phase = 'over';
      this.emitUpdate();
      this.onGameOver?.(playerIndex);
      return;
    }

    if (hand.length === 1 && playerIndex !== 0) {
      this.emitMessage(`${name} — UNO!`);
    }

    this.applyCardEffect(card);

    this.emitMessage(`${name} が ${this.describeCard(card)} を出した`);
    this.emitUpdate();

    if (this.winner !== null) return;

    if (card.color === 'wild' && playerIndex !== 0) {
      this.currentColor = this.aiPickColor(hand);
      this.emitMessage(`${name} が ${COLOR_LABELS[this.currentColor]}を選択`);
    }

    this.runTurn();
  }

  applyCardEffect(card) {
    switch (card.value) {
      case 'skip':
        this.advancePlayer();
        this.advancePlayer();
        break;
      case 'reverse':
        this.direction *= -1;
        this.advancePlayer();
        break;
      case 'draw2':
        this.pendingDraw += 2;
        this.advancePlayer();
        break;
      case 'wild4':
        this.pendingDraw += 4;
        this.advancePlayer();
        break;
      default:
        this.advancePlayer();
    }
  }

  describeCard(card) {
    if (card.type === 'number') return `${COLOR_LABELS[card.color] || ''}${card.value}`;
    if (card.value === 'skip') return 'スキップ';
    if (card.value === 'reverse') return 'リバース';
    if (card.value === 'draw2') return 'ドロー2';
    if (card.value === 'wild') return 'ワイルド';
    if (card.value === 'wild4') return 'ワイルドドロー4';
    return '?';
  }

  advancePlayer() {
    let next = this.currentPlayer;
    do {
      next = (next + this.direction + 4) % 4;
    } while (this.players[next].length === 0 && this.players.some(p => p.length > 0));
    this.currentPlayer = next;
  }

  callUno() {
    if (this.players[0].length === 1) {
      this.unoCalled[0] = true;
      this.emitMessage('UNO!', true);
    }
  }

  humanPass() {
    if (this.phase !== 'human') return;
    this.advancePlayer();
    this.runTurn();
  }
}

function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}
