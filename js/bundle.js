(() => {
  // js/cards.js
  var COLORS = ["red", "green", "blue", "yellow"];
  var COLOR_LABELS = { red: "\u8D64", green: "\u7DD1", blue: "\u9752", yellow: "\u9EC4" };
  var ACTIONS = ["skip", "reverse", "draw2"];
  function createDeck() {
    const deck = [];
    for (const color of COLORS) {
      deck.push({ color, value: 0, type: "number" });
      for (let n = 1; n <= 9; n++) {
        deck.push({ color, value: n, type: "number" });
        deck.push({ color, value: n, type: "number" });
      }
      for (const action of ACTIONS) {
        deck.push({ color, value: action, type: "action" });
        deck.push({ color, value: action, type: "action" });
      }
    }
    deck.push({ color: "wild", value: "wild", type: "wild" });
    deck.push({ color: "wild", value: "wild", type: "wild" });
    deck.push({ color: "wild", value: "wild4", type: "wild" });
    deck.push({ color: "wild", value: "wild4", type: "wild" });
    return deck;
  }
  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function cardLabel(card) {
    if (card.type === "number") return String(card.value);
    if (card.value === "skip") return "\u2298";
    if (card.value === "reverse") return "\u21C4";
    if (card.value === "draw2") return "+2";
    if (card.value === "wild") return "W";
    if (card.value === "wild4") return "+4";
    return "?";
  }
  function canPlay(card, topCard, currentColor) {
    if (card.color === "wild") return true;
    const matchColor = currentColor || topCard.color;
    if (card.color === matchColor) return true;
    if (card.value === topCard.value) return true;
    return false;
  }
  function isActionStart(card) {
    return card.type === "action" || card.type === "wild";
  }
  function mostCommonColor(hand) {
    const counts = {};
    for (const c of COLORS) counts[c] = 0;
    for (const card of hand) {
      if (card.color !== "wild") counts[card.color]++;
    }
    return COLORS.reduce((a, b) => counts[a] >= counts[b] ? a : b);
  }
  var PLAYER_NAMES = ["\u3042\u306A\u305F", "\u30D7\u30EC\u30A4\u30E4\u30FCA", "\u30D7\u30EC\u30A4\u30E4\u30FCB", "\u30D7\u30EC\u30A4\u30E4\u30FCC"];

  // js/game.js
  var Game = class {
    constructor() {
      this.players = [[], [], [], []];
      this.deck = [];
      this.discard = [];
      this.currentPlayer = 0;
      this.direction = 1;
      this.currentColor = null;
      this.phase = "idle";
      this.pendingDraw = 0;
      this.unoCalled = [false, false, false, false];
      this.winner = null;
      this.onUpdate = null;
      this.onMessage = null;
      this.onColorPick = null;
      this.onGameOver = null;
      this.onCardPlayed = null;
      this.onTurnStart = null;
      this.onUnoCalled = null;
      this.onGameStart = null;
    }
    start() {
      this.deck = shuffle(createDeck());
      this.discard = [];
      this.players = [[], [], [], []];
      this.currentPlayer = 0;
      this.direction = 1;
      this.currentColor = null;
      this.phase = "playing";
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
      this.emitMessage("\u30B2\u30FC\u30E0\u958B\u59CB\uFF01");
      this.onGameStart?.();
      this.runTurn();
    }
    get topCard() {
      return this.discard[this.discard.length - 1];
    }
    get playableColor() {
      return this.currentColor || this.topCard.color;
    }
    getValidPlays(playerIndex) {
      return this.players[playerIndex].filter((c) => canPlay(c, this.topCard, this.currentColor));
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
        this.phase = "human";
        this.emitUpdate();
        this.onTurnStart?.(0);
        return;
      }
      this.phase = "ai";
      this.emitUpdate();
      this.onTurnStart?.(this.currentPlayer);
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
        this.emitMessage(`${name} \u304C ${count}\u679A\u5F15\u3044\u305F`);
        this.advancePlayer();
        this.runTurn();
        return;
      }
      const valid = this.getValidPlays(idx);
      if (valid.length === 0) {
        const drawn = this.drawOne(idx);
        this.emitMessage(`${name} \u304C\u30AB\u30FC\u30C9\u3092\u5F15\u3044\u305F`);
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
      const wild4 = valid.find((c) => c.value === "wild4");
      const wild = valid.find((c) => c.value === "wild");
      const draw2 = valid.find((c) => c.value === "draw2");
      const skip = valid.find((c) => c.value === "skip");
      const action = valid.find((c) => c.type === "action" || c.type === "wild");
      if (hand.length <= 2 && (wild4 || wild)) return wild4 || wild;
      if (draw2) return draw2;
      if (skip) return skip;
      if (action) return action;
      const numbers = valid.filter((c) => c.type === "number");
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
      if (this.phase !== "human" || this.winner !== null) return;
      if (this.pendingDraw > 0) {
        this.drawCards(0, this.pendingDraw);
        this.emitMessage(`\u3042\u306A\u305F\u304C ${this.pendingDraw}\u679A\u5F15\u304D\u307E\u3057\u305F`);
        this.pendingDraw = 0;
        this.advancePlayer();
        this.runTurn();
        return;
      }
      const drawn = this.drawOne(0);
      if (drawn) {
        this.emitMessage("\u30AB\u30FC\u30C9\u3092\u5F15\u304D\u307E\u3057\u305F");
        if (canPlay(drawn, this.topCard, this.currentColor)) {
          this.emitUpdate();
          return;
        }
      }
      this.advancePlayer();
      this.runTurn();
    }
    humanPlay(cardIndex) {
      if (this.phase !== "human" || this.winner !== null) return false;
      const hand = this.players[0];
      const card = hand[cardIndex];
      if (!card || !canPlay(card, this.topCard, this.currentColor)) return false;
      if (card.color === "wild") {
        this.phase = "picking-color";
        this._pendingWild = cardIndex;
        this.onColorPick?.(card);
        this.emitUpdate();
        return true;
      }
      this.playCard(0, card);
      return true;
    }
    humanPickColor(color) {
      if (this.phase !== "picking-color") return;
      const idx = this._pendingWild;
      const card = this.players[0][idx];
      this.currentColor = color;
      this.phase = "human";
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
      if (card.color !== "wild") {
        this.currentColor = card.color;
      }
      const name = PLAYER_NAMES[playerIndex];
      if (hand.length === 1) {
        this.unoCalled[playerIndex] = true;
      }
      if (hand.length === 0) {
        this.winner = playerIndex;
        this.phase = "over";
        this.emitUpdate();
        this.onGameOver?.(playerIndex);
        return;
      }
      if (hand.length === 1 && playerIndex !== 0) {
        this.emitMessage(`${name} \u2014 UNO!`);
        this.onUnoCalled?.(playerIndex);
      }
      this.applyCardEffect(card);
      this.emitMessage(`${name} \u304C ${this.describeCard(card)} \u3092\u51FA\u3057\u305F`);
      this.emitUpdate();
      if (this.winner !== null) return;
      if (card.color === "wild" && playerIndex !== 0) {
        this.currentColor = this.aiPickColor(hand);
        this.emitMessage(`${name} \u304C ${COLOR_LABELS[this.currentColor]}\u3092\u9078\u629E`);
      }
      this.runTurn();
    }
    applyCardEffect(card) {
      switch (card.value) {
        case "skip":
          this.advancePlayer();
          this.advancePlayer();
          break;
        case "reverse":
          this.direction *= -1;
          this.advancePlayer();
          break;
        case "draw2":
          this.pendingDraw += 2;
          this.advancePlayer();
          break;
        case "wild4":
          this.pendingDraw += 4;
          this.advancePlayer();
          break;
        default:
          this.advancePlayer();
      }
    }
    describeCard(card) {
      if (card.type === "number") return `${COLOR_LABELS[card.color] || ""}${card.value}`;
      if (card.value === "skip") return "\u30B9\u30AD\u30C3\u30D7";
      if (card.value === "reverse") return "\u30EA\u30D0\u30FC\u30B9";
      if (card.value === "draw2") return "\u30C9\u30ED\u30FC2";
      if (card.value === "wild") return "\u30EF\u30A4\u30EB\u30C9";
      if (card.value === "wild4") return "\u30EF\u30A4\u30EB\u30C9\u30C9\u30ED\u30FC4";
      return "?";
    }
    advancePlayer() {
      let next = this.currentPlayer;
      do {
        next = (next + this.direction + 4) % 4;
      } while (this.players[next].length === 0 && this.players.some((p) => p.length > 0));
      this.currentPlayer = next;
    }
    callUno() {
      if (this.players[0].length === 1) {
        this.unoCalled[0] = true;
        this.emitMessage("UNO!", true);
        this.onUnoCalled?.(0);
      }
    }
    humanPass() {
      if (this.phase !== "human") return;
      this.advancePlayer();
      this.runTurn();
    }
  };
  function delay(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  // js/themes.js
  var THEMES = [
    { id: "neon-tokyo", label: "Neon Tokyo" },
    { id: "kyoto-zen", label: "Kyoto Zen" },
    { id: "akiba-98", label: "Akiba '98" },
    { id: "shimokita-lofi", label: "Shimokita Lo-Fi" },
    { id: "roppongi-void", label: "Roppongi Void" }
  ];
  var THEME_SVG_PALETTES = {
    "akiba-98": {
      fillTop: "#002288",
      fillMid1: "#001870",
      fillMid2: "#001050",
      fillBot: "#000a38",
      glowCore: "#00e5ff",
      glowMid: "#0077ff",
      stroke: "#00e5ff",
      strokeOuter: "#0088ff",
      slotStroke: "#00e5ff"
    },
    "neon-tokyo": {
      fillTop: "#1e0538",
      fillMid1: "#150428",
      fillMid2: "#0e021c",
      fillBot: "#06000e",
      glowCore: "#ff007f",
      glowMid: "#bf5af2",
      stroke: "#ff007f",
      strokeOuter: "#bf5af2",
      slotStroke: "#ff007f"
    },
    "kyoto-zen": {
      fillTop: "#2b2216",
      fillMid1: "#201810",
      fillMid2: "#17110a",
      fillBot: "#0c0905",
      glowCore: "#d4af37",
      glowMid: "#5a785d",
      stroke: "#d4af37",
      strokeOuter: "#a8882d",
      slotStroke: "#d4af37"
    },
    "shimokita-lofi": {
      fillTop: "#321a10",
      fillMid1: "#25120a",
      fillMid2: "#1a0c06",
      fillBot: "#0d0603",
      glowCore: "#ff7a3d",
      glowMid: "#e06d53",
      stroke: "#ff7a3d",
      strokeOuter: "#e06d53",
      slotStroke: "#ff7a3d"
    },
    "roppongi-void": {
      fillTop: "#18181e",
      fillMid1: "#101014",
      fillMid2: "#0a0a0d",
      fillBot: "#000000",
      glowCore: "#ffffff",
      glowMid: "#ff1744",
      stroke: "#ffffff",
      strokeOuter: "#ff1744",
      slotStroke: "#ffffff"
    }
  };
  var STORAGE_KEY = "foth-theme";
  function getSavedTheme() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "akiba-98";
    } catch (e) {
      return "akiba-98";
    }
  }
  function updateSvgGradients(themeId) {
    const p = THEME_SVG_PALETTES[themeId] || THEME_SVG_PALETTES["akiba-98"];
    if (!p) return;
    const top = document.getElementById("stop-table-top");
    const mid1 = document.getElementById("stop-table-mid1");
    const mid2 = document.getElementById("stop-table-mid2");
    const bot = document.getElementById("stop-table-bot");
    const glowCore = document.getElementById("stop-glow-core");
    const glowMid = document.getElementById("stop-glow-mid");
    const feShadow1 = document.getElementById("fe-shadow-1");
    const feShadow2 = document.getElementById("fe-shadow-2");
    const feSlot = document.getElementById("fe-slot-shadow");
    if (top) top.setAttribute("stop-color", p.fillTop);
    if (mid1) mid1.setAttribute("stop-color", p.fillMid1);
    if (mid2) mid2.setAttribute("stop-color", p.fillMid2);
    if (bot) bot.setAttribute("stop-color", p.fillBot);
    if (glowCore) glowCore.setAttribute("stop-color", p.glowCore);
    if (glowMid) glowMid.setAttribute("stop-color", p.glowMid);
    if (feShadow1) feShadow1.setAttribute("flood-color", p.stroke);
    if (feShadow2) feShadow2.setAttribute("flood-color", p.strokeOuter);
    if (feSlot) feSlot.setAttribute("flood-color", p.slotStroke);
  }
  function applyTheme(themeId) {
    document.documentElement.dataset.theme = themeId;
    try {
      localStorage.setItem(STORAGE_KEY, themeId);
    } catch (e) {
    }
    updateSvgGradients(themeId);
    window.dispatchEvent(new CustomEvent("themechanged", { detail: { themeId } }));
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.theme === themeId);
    });
    const current = THEMES.find((t) => t.id === themeId);
    const currentLabel = document.querySelector(".theme-current-label");
    if (currentLabel && current) {
      currentLabel.textContent = current.label;
    }
  }
  function initThemes() {
    const saved = getSavedTheme();
    applyTheme(saved);
    const menu = document.getElementById("theme-menu");
    const toggleBtn = document.getElementById("theme-toggle-btn");
    if (toggleBtn && menu) {
      toggleBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        menu.classList.toggle("open");
      });
      document.addEventListener("click", (e) => {
        if (!menu.contains(e.target)) {
          menu.classList.remove("open");
        }
      });
    }
    document.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        applyTheme(btn.dataset.theme);
        menu?.classList.remove("open");
      });
    });
  }

  // js/field.js
  var resizeObserver = null;
  function buildTablePath(W, H, inset = 0) {
    const isPortrait = H > W;
    const isMobile = W < 768;
    const cx = W / 2;
    let topY, botY, topHalfW, botHalfW, chamferX, chamferY;
    if (isPortrait) {
      const pad = Math.max(8, Math.min(14, Math.round(W * 0.025)));
      topY = pad + inset;
      botY = H - pad - inset;
      topHalfW = Math.round(W / 2 - pad) - inset;
      botHalfW = topHalfW;
      chamferX = Math.min(28, Math.round(topHalfW * 0.14));
      chamferY = Math.min(28, Math.round((botY - topY) * 0.04));
    } else {
      topY = Math.max(20, Math.round(H * 0.075)) + inset;
      botY = Math.min(H - 20, Math.round(H * 0.88)) - inset;
      const tableH = botY - topY;
      topHalfW = isMobile ? Math.max(120, Math.min(W * 0.45, 340) - inset) : Math.max(200, Math.min(W * 0.38, 480) - inset);
      botHalfW = isMobile ? Math.max(140, Math.min(W * 0.48, 380) - inset) : Math.max(260, Math.min(W * 0.48, 620) - inset);
      chamferX = isMobile ? Math.round(topHalfW * 0.12) : 55;
      chamferY = Math.round(tableH * 0.11);
    }
    const p1x = Math.round(cx - topHalfW + chamferX);
    const p2x = Math.round(cx + topHalfW - chamferX);
    const p3x = Math.round(cx + topHalfW);
    const p3y = Math.round(topY + chamferY * 0.65);
    const p4x = Math.round(cx + topHalfW + (botHalfW - topHalfW) * 0.15);
    const p4y = Math.round(topY + chamferY);
    const p5x = Math.round(cx + botHalfW);
    const p5y = Math.round(botY - 20);
    const p6x = Math.round(cx + botHalfW - 20);
    const p7x = Math.round(cx - botHalfW + 20);
    const p8x = Math.round(cx - botHalfW);
    const p8y = p5y;
    const p9x = Math.round(cx - topHalfW - (botHalfW - topHalfW) * 0.15);
    const p9y = p4y;
    const p10x = Math.round(cx - topHalfW);
    const p10y = p3y;
    return `M ${p1x},${topY} L ${p2x},${topY} Q ${p2x + 12},${topY} ${p2x + 20},${topY + 7} L ${p3x},${p3y} Q ${p3x + 7},${p3y + 8} ${p4x},${p4y} L ${p5x},${p5y} Q ${p5x},${botY} ${p6x},${botY} L ${p7x},${botY} Q ${p8x},${botY} ${p8x},${p8y} L ${p9x},${p9y} Q ${p9x - 7},${p9y - 8} ${p10x},${p10y} L ${p1x - 20},${topY + 7} Q ${p1x - 12},${topY} ${p1x},${topY} Z`;
  }
  function updateField() {
    const gameScreen2 = document.getElementById("game-screen");
    const svg = document.getElementById("cyber-table-svg");
    if (!gameScreen2 || !svg) return;
    const rect = gameScreen2.getBoundingClientRect();
    const W = Math.round(rect.width || window.innerWidth);
    const H = Math.round(rect.height || window.innerHeight);
    if (W <= 0 || H <= 0) return;
    const isPortrait = H > W;
    const isCompact = W < 960 || isPortrait;
    const isMobile = W < 768;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", `${W}`);
    svg.setAttribute("height", `${H}`);
    const drawPile2 = document.getElementById("draw-pile");
    const discardPile2 = document.getElementById("discard-pile");
    let cardW = isMobile ? 60 : 88;
    let cardH = isMobile ? 90 : 132;
    let gap = isMobile ? 24 : 40;
    let drawX = Math.round(W / 2 - gap / 2 - cardW);
    let drawY = Math.round(H * 0.5 - cardH * 0.5);
    let discardX = Math.round(W / 2 + gap / 2);
    let discardY = drawY;
    let cardRadius = isMobile ? 8 : 10;
    if (drawPile2 && discardPile2) {
      const dRect = drawPile2.getBoundingClientRect();
      const disRect = discardPile2.getBoundingClientRect();
      if (dRect.width > 0 && dRect.height > 0) {
        cardW = Math.round(dRect.width);
        cardH = Math.round(dRect.height);
        drawX = Math.round(dRect.left - rect.left);
        drawY = Math.round(dRect.top - rect.top);
        if (disRect.width > 0) {
          discardX = Math.round(disRect.left - rect.left);
          discardY = Math.round(disRect.top - rect.top);
          gap = discardX - (drawX + cardW);
        } else {
          discardX = drawX + cardW + gap;
          discardY = drawY;
        }
        const style = window.getComputedStyle(drawPile2);
        const r = parseInt(style.borderRadius, 10);
        if (!isNaN(r) && r > 0) cardRadius = r;
      }
    }
    const centerX = Math.round((drawX + discardX + cardW) / 2);
    const centerY = Math.round(drawY + cardH / 2);
    const currentTheme = document.documentElement.dataset.theme || getSavedTheme() || "akiba-98";
    const p = THEME_SVG_PALETTES[currentTheme] || THEME_SVG_PALETTES["akiba-98"];
    const outerPath = buildTablePath(W, H, 0);
    const innerPath = buildTablePath(W, H, isPortrait ? 6 : 14);
    const radarRx1 = Math.round(Math.min(W * 0.38, Math.max(cardW * 3.2, isPortrait ? 220 : 260)));
    const radarRy1 = Math.round(Math.min(H * (isPortrait ? 0.22 : 0.3), Math.max(cardH * 1.5, 130)));
    const radarRx2 = Math.round(radarRx1 * 0.65);
    const radarRy2 = Math.round(radarRy1 * 0.65);
    const radarRx3 = Math.round(radarRx1 * 0.32);
    const radarRy3 = Math.round(radarRy1 * 0.32);
    const ghostLeftX = drawX - gap - cardW;
    const ghostRightX = discardX + cardW + gap;
    const showGhostSlots = !isCompact && (ghostLeftX >= 160 && ghostRightX + cardW <= W - 160);
    const guideY = centerY;
    const pad = isPortrait ? Math.max(8, Math.min(14, Math.round(W * 0.025))) : 20;
    const guideLeftX1 = isPortrait ? Math.round(pad + 10) : Math.round(Math.max(20, W * 0.08));
    const guideLeftX2 = showGhostSlots ? ghostLeftX - 16 : drawX - 16;
    const guideRightX1 = showGhostSlots ? ghostRightX + cardW + 16 : discardX + cardW + 16;
    const guideRightX2 = isPortrait ? Math.round(W - pad - 10) : Math.round(Math.min(W - 20, W * 0.92));
    let slotsHtml = "";
    if (showGhostSlots) {
      slotsHtml += `
      <rect class="table-slot" x="${ghostLeftX}" y="${drawY}" width="${cardW}" height="${cardH}" rx="${cardRadius}" fill="none" stroke="${p.slotStroke}" stroke-width="1.5" stroke-opacity="0.32" filter="url(#slotGlow)"/>
      <rect class="table-slot" x="${ghostRightX}" y="${discardY}" width="${cardW}" height="${cardH}" rx="${cardRadius}" fill="none" stroke="${p.slotStroke}" stroke-width="1.5" stroke-opacity="0.32" filter="url(#slotGlow)"/>
    `;
    }
    slotsHtml += `
    <rect class="table-slot" x="${drawX}" y="${drawY}" width="${cardW}" height="${cardH}" rx="${cardRadius}" fill="none" stroke="${p.slotStroke}" stroke-width="1.8" stroke-opacity="0.45" filter="url(#slotGlow)"/>
    <rect class="table-slot" x="${discardX}" y="${discardY}" width="${cardW}" height="${cardH}" rx="${cardRadius}" fill="none" stroke="${p.slotStroke}" stroke-width="1.8" stroke-opacity="0.45" filter="url(#slotGlow)"/>
  `;
    const hudTopY = Math.max(35, Math.round(H * 0.075) + 14);
    const hudLineX1 = centerX + Math.round(cardW * 1.2);
    const hudLineX2 = hudLineX1 + Math.round(cardW * 1);
    svg.innerHTML = `
    <defs>
      <linearGradient id="cyberTableFill" x1="0" y1="0" x2="0" y2="1">
        <stop id="stop-table-top" offset="0%" stop-color="${p.fillTop}"/>
        <stop id="stop-table-mid1" offset="35%" stop-color="${p.fillMid1}"/>
        <stop id="stop-table-mid2" offset="70%" stop-color="${p.fillMid2}"/>
        <stop id="stop-table-bot" offset="100%" stop-color="${p.fillBot}"/>
      </linearGradient>

      <radialGradient id="cyberTableGlow" cx="50%" cy="50%" r="50%">
        <stop id="stop-glow-core" offset="0%" stop-color="${p.glowCore}" stop-opacity="0.25"/>
        <stop id="stop-glow-mid" offset="35%" stop-color="${p.glowMid}" stop-opacity="0.10"/>
        <stop id="stop-glow-outer" offset="100%" stop-color="#000000" stop-opacity="0"/>
      </radialGradient>

      <filter id="tableBorderGlow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow id="fe-shadow-1" dx="0" dy="0" stdDeviation="4" flood-color="${p.stroke}" flood-opacity="0.75"/>
        <feDropShadow id="fe-shadow-2" dx="0" dy="0" stdDeviation="12" flood-color="${p.strokeOuter}" flood-opacity="0.30"/>
      </filter>

      <filter id="slotGlow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow id="fe-slot-shadow" dx="0" dy="0" stdDeviation="2.5" flood-color="${p.slotStroke}" flood-opacity="0.40"/>
      </filter>
    </defs>

    <!-- 3D Perspective Table Board -->
    <path class="table-outer-base" d="${outerPath}" fill="url(#cyberTableFill)" stroke="${p.stroke}" stroke-width="2" filter="url(#tableBorderGlow)"/>

    <!-- Center Radial Highlight on Table -->
    <ellipse cx="${centerX}" cy="${centerY}" rx="${radarRx1 + 60}" ry="${radarRy1 + 50}" fill="url(#cyberTableGlow)"/>

    <!-- Inset Tech Border Line -->
    <path class="table-inner-line" d="${innerPath}" fill="none" stroke="${p.strokeOuter}" stroke-width="1.2" stroke-opacity="0.45"/>

    <!-- Top & Corner Tech HUD Accents (\u6A2A\u753B\u9762\u306E\u307F\u8868\u793A) -->
    ${!isPortrait ? `<line class="table-hud-accent" x1="${hudLineX1}" y1="${hudTopY}" x2="${hudLineX2}" y2="${hudTopY}" stroke="${p.stroke}" stroke-width="2" stroke-dasharray="10 4 4 4 4 4" stroke-opacity="0.85"/>` : ""}

    <!-- Concentric Perspective Radar Rings (\u30AB\u30FC\u30C9\u4E2D\u5FC3\u306B\u540C\u5FC3\u5186\u3067\u914D\u7F6E) -->
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx1}" ry="${radarRy1}" fill="none" stroke="${p.strokeOuter}" stroke-width="1.2" stroke-opacity="0.22" stroke-dasharray="14 8"/>
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx2}" ry="${radarRy2}" fill="none" stroke="${p.strokeOuter}" stroke-width="1" stroke-opacity="0.25"/>
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx3}" ry="${radarRy3}" fill="none" stroke="${p.strokeOuter}" stroke-width="1" stroke-opacity="0.18"/>

    <!-- Horizontal Guide Lines -->
    <line class="table-guide-line" x1="${guideLeftX1}" y1="${guideY}" x2="${guideLeftX2}" y2="${guideY}" stroke="${p.strokeOuter}" stroke-width="1.5" stroke-dasharray="6 6" stroke-opacity="0.45"/>
    <line class="table-guide-line" x1="${guideRightX1}" y1="${guideY}" x2="${guideRightX2}" y2="${guideY}" stroke="${p.strokeOuter}" stroke-width="1.5" stroke-dasharray="6 6" stroke-opacity="0.45"/>

    <!-- Card Placement Slots (\u30D7\u30ED\u30B0\u30E9\u30E0\u306B\u3088\u308B\u30D4\u30AF\u30BB\u30EB\u5B8C\u5168\u4E00\u81F4\u67A0) -->
    ${slotsHtml}
  `;
  }
  function initField() {
    window.addEventListener("resize", () => {
      requestAnimationFrame(updateField);
    });
    const gameScreen2 = document.getElementById("game-screen");
    const playArea = document.querySelector(".play-area");
    if (window.ResizeObserver) {
      resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(updateField);
      });
      if (gameScreen2) resizeObserver.observe(gameScreen2);
      if (playArea) resizeObserver.observe(playArea);
    }
  }

  // js/effects.js
  var FX_LABELS = {
    skip: "SKIP!",
    reverse: "REVERSE!",
    draw2: "+2",
    wild: "WILD!",
    wild4: "+4"
  };
  function playCardEffect(card) {
    if (card.type === "number") return;
    const layer = document.getElementById("fx-layer");
    if (!layer) return;
    const type = card.value;
    if (!FX_LABELS[type]) return;
    layer.className = `fx-layer fx-${type}`;
    layer.innerHTML = buildFxContent(type, card);
    requestAnimationFrame(() => layer.classList.add("fx-active"));
    const duration = type === "wild4" ? 1400 : type === "wild" ? 1200 : 1e3;
    setTimeout(() => {
      layer.classList.remove("fx-active");
      layer.className = "fx-layer";
      layer.innerHTML = "";
    }, duration);
    if (type === "reverse") spinTurnRing();
    if (type === "draw2" || type === "wild4") shakeScreen();
    spawnParticles(type);
  }
  function buildFxContent(type, card) {
    const label = FX_LABELS[type];
    let extra = "";
    if (type === "wild" || type === "wild4") {
      extra = '<div class="fx-rainbow-ring"></div>';
    }
    if (type === "reverse") {
      extra = '<div class="fx-arrows">\u21C4</div>';
    }
    if (type === "skip") {
      extra = '<div class="fx-slash"></div>';
    }
    return `
    <div class="fx-flash"></div>
    <div class="fx-burst"></div>
    ${extra}
    <div class="fx-label">${label}</div>
    <div class="fx-particles" id="fx-particles"></div>
  `;
  }
  function spinTurnRing() {
    const ring = document.querySelector(".turn-ring");
    if (!ring) return;
    ring.classList.remove("fx-spin");
    void ring.offsetWidth;
    ring.classList.add("fx-spin");
    setTimeout(() => ring.classList.remove("fx-spin"), 1e3);
  }
  function shakeScreen() {
    const screen = document.getElementById("game-screen");
    if (!screen) return;
    screen.classList.remove("fx-shake");
    void screen.offsetWidth;
    screen.classList.add("fx-shake");
    setTimeout(() => screen.classList.remove("fx-shake"), 600);
  }
  function spawnParticles(type) {
    const container = document.getElementById("fx-particles");
    if (!container) return;
    const colors = {
      skip: ["#ff6b6b", "#ffd93d"],
      reverse: ["#4ecdc4", "#a8e6cf"],
      draw2: ["#ffd60a", "#ff9f1c"],
      wild: ["#e63946", "#2dc653", "#4361ee", "#ffd60a"],
      wild4: ["#ff0066", "#ffcc00", "#ffffff"]
    };
    const palette = colors[type] || ["#ffd700"];
    const count = type === "wild4" ? 24 : 16;
    for (let i = 0; i < count; i++) {
      const p = document.createElement("div");
      p.className = "fx-particle";
      const angle = Math.PI * 2 * i / count + Math.random() * 0.5;
      const dist = 80 + Math.random() * 160;
      p.style.setProperty("--tx", `${Math.cos(angle) * dist}px`);
      p.style.setProperty("--ty", `${Math.sin(angle) * dist}px`);
      p.style.background = palette[i % palette.length];
      p.style.animationDelay = `${Math.random() * 0.2}s`;
      p.style.width = `${4 + Math.random() * 8}px`;
      p.style.height = p.style.width;
      container.appendChild(p);
    }
  }

  // js/audio.js
  var TRACKS = [
    {
      id: "dealers-choice",
      title: "Dealer's Choice",
      badge: "\u30C7\u30D5\u30A9\u30EB\u30C8",
      file: "Dealer's Choice.mp3"
    },
    {
      id: "tabletop-shuffle",
      title: "Tabletop Shuffle",
      badge: "",
      file: "Tabletop Shuffle.mp3"
    }
  ];
  var AudioManager = class {
    constructor() {
      this.audio = new Audio();
      this.audio.loop = true;
      this.tracks = TRACKS;
      this.currentTrackId = this.loadSavedTrack();
      this.enabled = this.loadSavedEnabled();
      this.volume = this.loadSavedVolume();
      this.audio.volume = this.volume;
      this.applyTrackSource();
      this.onStateChange = null;
    }
    loadSavedTrack() {
      try {
        const saved = localStorage.getItem("uno-bgm-track");
        if (saved && this.tracks.some((t) => t.id === saved)) {
          return saved;
        }
      } catch (e) {
      }
      return "dealers-choice";
    }
    loadSavedEnabled() {
      try {
        const saved = localStorage.getItem("uno-bgm-enabled");
        if (saved !== null) return saved === "true";
      } catch (e) {
      }
      return true;
    }
    loadSavedVolume() {
      try {
        const saved = localStorage.getItem("uno-bgm-volume");
        if (saved !== null) {
          const v = parseFloat(saved);
          if (!isNaN(v) && v >= 0 && v <= 1) return v;
        }
      } catch (e) {
      }
      return 0.4;
    }
    getCurrentTrack() {
      return this.tracks.find((t) => t.id === this.currentTrackId) || this.tracks[0];
    }
    applyTrackSource() {
      const track = this.getCurrentTrack();
      const wasPlaying = !this.audio.paused;
      this.audio.src = encodeURI(track.file);
      if (wasPlaying && this.enabled) {
        this.play();
      }
    }
    setTrack(trackId) {
      if (this.currentTrackId === trackId) return;
      const track = this.tracks.find((t) => t.id === trackId);
      if (!track) return;
      this.currentTrackId = trackId;
      try {
        localStorage.setItem("uno-bgm-track", trackId);
      } catch (e) {
      }
      this.applyTrackSource();
      if (this.enabled) {
        this.play();
      }
      this.notify();
    }
    setVolume(vol) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.volume = clamped;
      this.audio.volume = clamped;
      try {
        localStorage.setItem("uno-bgm-volume", String(clamped));
      } catch (e) {
      }
      this.notify();
    }
    toggle() {
      this.setEnabled(!this.enabled);
    }
    setEnabled(val) {
      this.enabled = !!val;
      try {
        localStorage.setItem("uno-bgm-enabled", String(this.enabled));
      } catch (e) {
      }
      if (this.enabled) {
        this.play();
      } else {
        this.audio.pause();
      }
      this.notify();
    }
    play() {
      if (!this.enabled) return;
      const p = this.audio.play();
      if (p !== void 0) {
        p.catch(() => {
        });
      }
      this.notify();
    }
    pause() {
      this.audio.pause();
      this.notify();
    }
    notify() {
      if (typeof this.onStateChange === "function") {
        this.onStateChange({
          enabled: this.enabled,
          currentTrackId: this.currentTrackId,
          volume: this.volume,
          isPlaying: !this.audio.paused
        });
      }
    }
  };
  var audioManager = new AudioManager();

  // js/thoughts.js
  var THOUGHTS = {
    1: {
      // プレイヤーA (熱血・アグレッシブ)
      start: [
        "\u4E00\u756A\u4E57\u308A\u3067\u4E0A\u304C\u3063\u3066\u3084\u308B\u305C\uFF01\u{1F525}",
        "\u6C17\u5408\u3044\u5165\u308C\u3066\u3044\u304F\u305E\uFF01",
        "\u6700\u521D\u304B\u3089\u5168\u529B\u52DD\u8CA0\u3060\uFF01"
      ],
      turn_normal: [
        "\u3088\u3057\u3001\u653B\u3081\u308B\u305C\uFF01",
        "\u6D41\u308C\u306F\u3053\u3063\u3061\u306B\u3042\u308B\uFF01",
        "\u3053\u306E\u30AB\u30FC\u30C9\u3067\u52DD\u8CA0\u3060\uFF01",
        "\u3069\u3093\u3069\u3093\u624B\u672D\u3092\u6E1B\u3089\u3059\u305C\uFF01",
        "\u3088\u3057\u3001\u898B\u5207\u3063\u305F\uFF01"
      ],
      turn_few_cards: [
        "\u3042\u3068\u5C11\u3057\u2026\uFF01\u52DD\u8CA0\u3060\uFF01\u26A1",
        "UNO\u304C\u898B\u3048\u3066\u304D\u305F\u305C\uFF01",
        "\u3053\u306E\u307E\u307E\u9003\u3052\u5207\u3063\u3066\u3084\u308B\uFF01"
      ],
      turn_many_cards: [
        "\u304F\u3063\u3001\u624B\u672D\u304C\u91CD\u3044\u305C\u2026\u{1F4A6}",
        "\u3053\u3053\u304B\u3089\u5DFB\u304D\u8FD4\u3057\u3066\u3084\u308B\uFF01",
        "\u7126\u308B\u306A\u3001\u307E\u3060\u30C1\u30E3\u30F3\u30B9\u306F\u3042\u308B\uFF01"
      ],
      play_wild4: [
        "\u55B0\u3089\u3048\uFF01\u30C9\u30ED\u30FC4\u3060\uFF01\u{1F525}",
        "\u60AA\u3044\u306A\u3001\u5BB9\u8D66\u3057\u306D\u3047\u305C\uFF01",
        "\u3053\u308C\u3067\u4E00\u6C17\u306B\u9006\u8EE2\u3060\uFF01"
      ],
      play_wild: [
        "\u4FFA\u306E\u5F97\u610F\u306A\u8272\u306B\u5909\u3048\u308B\u305C\uFF01",
        "\u3053\u306E\u8272\u306A\u3089\u3069\u3046\u3060\uFF01\uFF1F"
      ],
      play_draw2: [
        "2\u679A\u5F15\u3044\u3066\u3082\u3089\u3046\u305C\uFF01\u26A1",
        "\u3053\u308C\u3067\u3082\u55B0\u3089\u3044\u306A\uFF01"
      ],
      play_skip: [
        "\u60AA\u3044\u306A\u3001\u304A\u524D\u306F\u30D1\u30B9\u3060\uFF01",
        "\u304A\u524D\u306E\u624B\u756A\u306F\u98DB\u3070\u3059\u305C\uFF01"
      ],
      play_reverse: [
        "\u9006\u56DE\u8EE2\u3060\uFF01\u623B\u308C\uFF01",
        "\u6D41\u308C\u3092\u3072\u3063\u304F\u308A\u8FD4\u3059\u305C\uFF01"
      ],
      uno: [
        "UNO\uFF01\u6B21\u3067\u7D42\u308F\u308A\u3060\uFF01\u{1F525}",
        "\u30EA\u30FC\u30C1\uFF01\u4FFA\u306E\u52DD\u3061\u3060\uFF01"
      ],
      draw_frustrated: [
        "\u304F\u305D\u3063\u3001\u51FA\u305B\u308B\u672D\u304C\u306A\u3044\u2026",
        "\u5F15\u304F\u3057\u304B\u306A\u3044\u304B\u2026\uFF01",
        "\u983C\u3080\u3001\u3044\u3044\u30AB\u30FC\u30C9\u6765\u3044\uFF01"
      ],
      draw_attacked: [
        "\u3046\u308F\u3063\u3001\u5F15\u304B\u305B\u308B\u306A\u3088\uFF01\u{1F4A6}",
        "\u30DE\u30B8\u304B\u3088\u3001\u307E\u3068\u3081\u3066\u55B0\u3089\u3063\u305F\uFF01"
      ],
      watch_uno: [
        "\u304A\u3044\u304A\u3044\u3001\u3082\u3046UNO\u304B\u3088\uFF01\uFF1F",
        "\u3042\u3044\u3064\u306E\u624B\u672D\u3001\u6B62\u3081\u306D\u3047\u3068\uFF01"
      ],
      human_thinking: [
        "\u3058\u3063\u304F\u308A\u8003\u3048\u3066\u308B\u306A\u2026",
        "\u4F55\u3092\u51FA\u3057\u3066\u304F\u308B\u3093\u3060\uFF1F",
        "\u8D64\u3060\u3051\u306F\u52D8\u5F01\u3057\u3066\u304F\u308C\u3088\uFF01"
      ],
      win: [
        "\u3088\u3063\u3057\u3083\u30FC\u30FC\uFF01\u5B8C\u5168\u52DD\u5229\u3060\uFF01\u{1F3C6}",
        "\u4FFA\u306E\u52DD\u3061\u3060\uFF01\u6700\u9AD8\u306E\u52DD\u8CA0\u3060\u3063\u305F\u305C\uFF01"
      ],
      lose: [
        "\u304F\u305D\u3063\u3001\u8CA0\u3051\u305F\u304B\u2026\uFF01\u6094\u3057\u3044\u305C\uFF01",
        "\u6B21\u306F\u7D76\u5BFE\u306B\u52DD\u3064\u304B\u3089\u306A\uFF01"
      ]
    },
    2: {
      // プレイヤーB (冷静・ベテラン策士)
      start: [
        "\u3075\u3080\u3001\u3044\u3044\u52DD\u8CA0\u3092\u671F\u5F85\u3057\u3066\u3044\u308B\u3088\u3002",
        "\u624B\u5805\u304F\u76E4\u9762\u3092\u8AAD\u3080\u3068\u3057\u3088\u3046\u3002",
        "\u7126\u3089\u305A\u3001\u78BA\u5B9F\u306B\u3044\u304F\u3055\u3002"
      ],
      turn_normal: [
        "\u3075\u3080\u3001\u624B\u5805\u304F\u4E00\u624B\u9032\u3081\u308B\u304B\u3002",
        "\u76E4\u9762\u3092\u30B3\u30F3\u30C8\u30ED\u30FC\u30EB\u3057\u3088\u3046\u3002",
        "\u3053\u306E\u8272\u3067\u63FA\u3055\u3076\u308A\u3092\u304B\u3051\u308B\u304B\u3002",
        "\u9759\u304B\u306B\u597D\u6A5F\u3092\u5F85\u3064\u3002"
      ],
      turn_few_cards: [
        "\u4ED5\u639B\u3051\u3069\u3053\u308D\u3060\u306A\u3002",
        "\u52DD\u6A5F\u304C\u898B\u3048\u3066\u304D\u305F\u3002",
        "\u3053\u306E\u307E\u307E\u7D42\u5C40\u3078\u3068\u5C0E\u3053\u3046\u3002"
      ],
      turn_many_cards: [
        "\u624B\u672D\u306E\u6574\u7406\u304C\u5FC5\u8981\u3060\u306A\u2026",
        "\u7126\u308A\u306F\u7981\u7269\u3060\u3002",
        "\u4E00\u624B\u305A\u3064\u78BA\u5B9F\u306B\u6E1B\u3089\u3057\u3066\u3044\u304F\u304B\u3002"
      ],
      play_wild4: [
        "\u3053\u3053\u306F\u5F37\u786C\u624B\u6BB5\u306B\u51FA\u308B\u3002",
        "4\u679A\u3001\u53D7\u3051\u53D6\u3063\u3066\u3082\u3089\u304A\u3046\u3002",
        "\u52DD\u8CA0\u6240\u3092\u898B\u8AA4\u308B\u306A\u3088\u3002"
      ],
      play_wild: [
        "\u6D41\u308C\u306E\u8272\u3092\u5909\u3048\u3088\u3046\u3002",
        "\u3053\u306E\u8272\u306B\u6307\u5B9A\u3055\u305B\u3066\u3082\u3089\u3046\u3002"
      ],
      play_draw2: [
        "2\u679A\u3001\u5F15\u3044\u3066\u3082\u3089\u304A\u3046\u3002",
        "\u624B\u672D\u3092\u88DC\u5145\u3057\u3066\u304A\u304D\u306A\u3055\u3044\u3002"
      ],
      play_skip: [
        "\u624B\u756A\u3092\u98DB\u3070\u3055\u305B\u3066\u3082\u3089\u3046\u3002",
        "\u5C11\u3057\u4F11\u3093\u3067\u3044\u306A\u3055\u3044\u3002"
      ],
      play_reverse: [
        "\u6D41\u308C\u3092\u53CD\u8EE2\u3055\u305B\u3088\u3046\u3002",
        "\u601D\u60D1\u901A\u308A\u306B\u306F\u3055\u305B\u3093\u3088\u3002"
      ],
      uno: [
        "UNO\u3002\u3053\u308C\u3067\u8A70\u307F\u3060\u306A\u3002",
        "\u6B8B\u308A1\u679A\u3002\u7D42\u5C40\u3060\u3002"
      ],
      draw_frustrated: [
        "\u3053\u3053\u306F1\u679A\u5F15\u3044\u3066\u69D8\u5B50\u898B\u304B\u3002",
        "\u672D\u304C\u565B\u307F\u5408\u308F\u3093\u306A\u2026",
        "\u7126\u3089\u305A\u5C71\u672D\u3092\u5F15\u304F\u3068\u3059\u308B\u304B\u3002"
      ],
      draw_attacked: [
        "\u307B\u3046\u3001\u3084\u3063\u3066\u304F\u308C\u305F\u306A\u2026",
        "\u3044\u3044\u653B\u3081\u624B\u3060\u304C\u3001\u307E\u3060\u7D42\u308F\u3089\u3093\u3088\u3002"
      ],
      watch_uno: [
        "\u30EA\u30FC\u30C1\u304B\u2026\u8B66\u6212\u305B\u306D\u3070\u306A\u3002",
        "\u6B21\u306E\u4E00\u624B\u3001\u898B\u6975\u3081\u304C\u5FC5\u8981\u3060\u3002"
      ],
      human_thinking: [
        "\u9577\u8003\u304B\u2026\u4F55\u3092\u72D9\u3063\u3066\u3044\u308B\uFF1F",
        "\u614E\u91CD\u306A\u6307\u3057\u624B\u3060\u306A\u3002",
        "\u7DD1\u306A\u3089\u53D7\u3051\u3066\u7ACB\u3064\u304C\u3002"
      ],
      win: [
        "\u30C1\u30A7\u30C3\u30AF\u30E1\u30A4\u30C8\u3060\u306A\u3002\u898B\u4E8B\u306A\u52DD\u8CA0\u3060\u3063\u305F\u3002",
        "\u8A08\u7B97\u901A\u308A\u306E\u7D50\u672B\u3060\u3002\u793C\u3092\u8A00\u3046\u3088\u3002"
      ],
      lose: [
        "\u304A\u898B\u4E8B\u3002\u5B8C\u6557\u3060\u306A\u2026\u6B21\u306E\u4E00\u624B\u3092\u7DF4\u308A\u76F4\u3059\u304B\u3002",
        "\u898B\u4E8B\u306A\u8A66\u5408\u904B\u3073\u3060\u3063\u305F\u3088\u3002"
      ]
    },
    3: {
      // プレイヤーC (スマート・計算＆お茶目)
      start: [
        "\u3075\u3075\u3001\u3088\u308D\u3057\u304F\u306D\u301C\uFF01\u2728",
        "\u307F\u3093\u306A\u5F37\u305D\u3046\uFF01\u8CA0\u3051\u306A\u3044\u3088\u301C\u266A",
        "\u697D\u3057\u304F\u52DD\u3063\u3061\u3083\u304A\u301C\u3063\u3068\uFF01"
      ],
      turn_normal: [
        "\u8A08\u7B97\u901A\u308A\u306D\u266A",
        "\u6B21\u306F\u3069\u3053\u3078\u56DE\u305D\u3046\u304B\u306A\uFF1F",
        "\u3075\u3075\u3001\u3044\u3044\u30AB\u30FC\u30C9\u63C3\u3063\u3066\u308B\u308F\u3088\u3002",
        "\u30EA\u30BA\u30E0\u3088\u304F\u3044\u3053\u301C\uFF01"
      ],
      turn_few_cards: [
        "\u3082\u3046\u3059\u3050\u4E0A\u304C\u308C\u3061\u3083\u3046\u304B\u3082\uFF01\u2728",
        "UNO\u306E\u6E96\u5099\u3001\u30D0\u30C3\u30C1\u30EA\uFF01",
        "\u52DD\u3063\u3061\u3083\u3063\u305F\u3089\u3054\u3081\u3093\u306D\u266A"
      ],
      turn_many_cards: [
        "\u3042\u3061\u3083\u301C\u3001\u624B\u672D\u304C\u3044\u3063\u3071\u3044\u2026\u{1F4A6}",
        "\u65E9\u304F\u6E1B\u3089\u3055\u306A\u304D\u3083\uFF01",
        "\u3069\u308C\u304B\u3089\u51FA\u3059\u304B\u60A9\u3080\u306A\u301C"
      ],
      play_wild4: [
        "\u3054\u3081\u3093\u306D\u301C\uFF01\u30C9\u30ED\u30FC4\u3060\u3088\u266A\u{1F608}",
        "4\u679A\u30D7\u30EC\u30BC\u30F3\u30C8\u301C\uFF01",
        "\u3053\u3053\u306F\u5BB9\u8D66\u306A\u304F\u3044\u3063\u3061\u3083\u3046\uFF01"
      ],
      play_wild: [
        "\u79C1\u306E\u597D\u304D\u306A\u8272\u306B\u5909\u3048\u3061\u3083\u304A\u301C\uFF01",
        "\u3053\u306E\u8272\u3067\u52DD\u8CA0\u3088\uFF01"
      ],
      play_draw2: [
        "\u30C9\u30ED\u30FC2\uFF01\u3082\u3089\u3063\u3066\u306D\u301C\u26A1",
        "2\u679A\u5F15\u3044\u3061\u3083\u3063\u3066\uFF01"
      ],
      play_skip: [
        "\u3061\u3087\u3063\u3068\u30B9\u30C8\u30C3\u30D7\u306D\uFF01",
        "\u30B9\u30AD\u30C3\u30D7\u3057\u3061\u3083\u3044\u307E\u301C\u3059\u266A"
      ],
      play_reverse: [
        "\u304F\u308B\u3063\u3068\u53CD\u8EE2\u301C\uFF01\u623B\u308C\u301C\uFF01",
        "\u306F\u3044\u3001\u9006\u56DE\u8EE2\u3060\u3088\uFF01"
      ],
      uno: [
        "UNO\uFF01\u3042\u30681\u679A\u3060\u3088\u301C\uFF01\u{1F389}",
        "\u30EA\u30FC\u30C1\uFF01\u52DD\u3063\u3061\u3083\u3046\u3088\u301C\uFF01"
      ],
      draw_frustrated: [
        "\u51FA\u305B\u308B\u306E\u306A\u3044\u3084\u2026\u5F15\u304F\u306D\u301C",
        "\u3044\u3044\u30AB\u30FC\u30C9\u6765\u3066\u301C\uFF01",
        "\u3046\u30FC\u3093\u3001\u565B\u307F\u5408\u308F\u306A\u3044\u306A\u3041\u2026"
      ],
      draw_attacked: [
        "\u3072\u3069\u301C\u3044\uFF01\u624B\u672D\u5897\u3048\u3061\u3083\u3063\u305F\u{1F4A6}",
        "\u3082\u3046\uFF01\u72D9\u3044\u6483\u3061\u3057\u306A\u3044\u3067\u3088\u301C\uFF01"
      ],
      watch_uno: [
        "\u3048\u3063\uFF01\u3082\u3046UNO\u306A\u306E\uFF01\uFF1F",
        "\u30D4\u30F3\u30C1\uFF01\u8AB0\u304B\u6B62\u3081\u3066\u301C\uFF01"
      ],
      human_thinking: [
        "\u4F55\u51FA\u305D\u3046\u304B\u8FF7\u3063\u3066\u308B\u306E\u304B\u306A\uFF1F",
        "\u9752\u306B\u3057\u3066\u304F\u308C\u305F\u3089\u5B09\u3057\u3044\u306A\u301C\u266A",
        "\u3058\u301C\u3063\u2026\uFF08\u89B3\u5BDF\u4E2D\uFF09"
      ],
      win: [
        "\u3084\u3063\u305F\u301C\uFF01\u79C1\u306E\u52DD\u3061\u301C\uFF01\u{1F389}\u2728",
        "\u3048\u3078\u3078\u3001\u52DD\u3063\u3061\u3083\u3063\u305F\uFF01\u697D\u3057\u304B\u3063\u305F\u301C\uFF01"
      ],
      lose: [
        "\u3042\u301C\u3093\u3001\u60DC\u3057\u304B\u3063\u305F\u301C\uFF01\u6B21\u306F\u8CA0\u3051\u306A\u3044\u304B\u3089\u306D\uFF01",
        "\u3064\u3001\u5F37\u3044\u2026\uFF01\u3082\u3046\u4E00\u56DE\u52DD\u8CA0\u3057\u3066\uFF01"
      ]
    }
  };
  var timers = {};
  function pickRandom(arr) {
    if (!arr || arr.length === 0) return "";
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function showThought(playerIndex, text, duration = 1800) {
    if (playerIndex < 1 || playerIndex > 3) return;
    for (let i = 1; i <= 3; i++) {
      if (i !== playerIndex) {
        const otherBubble = document.getElementById(`thought-${i}`);
        if (otherBubble) otherBubble.classList.remove("show");
        if (timers[i]) {
          clearTimeout(timers[i]);
          timers[i] = null;
        }
      }
    }
    const bubble = document.getElementById(`thought-${playerIndex}`);
    if (!bubble) return;
    const textEl = bubble.querySelector(".thought-text");
    if (textEl) {
      textEl.textContent = text;
    }
    bubble.classList.remove("show");
    void bubble.offsetWidth;
    bubble.classList.add("show");
    if (timers[playerIndex]) {
      clearTimeout(timers[playerIndex]);
    }
    timers[playerIndex] = setTimeout(() => {
      bubble.classList.remove("show");
      timers[playerIndex] = null;
    }, duration);
  }
  function hideAllThoughts() {
    for (let i = 1; i <= 3; i++) {
      const bubble = document.getElementById(`thought-${i}`);
      if (bubble) bubble.classList.remove("show");
      if (timers[i]) {
        clearTimeout(timers[i]);
        timers[i] = null;
      }
    }
  }
  function triggerAiTurnThought(game2, idx) {
    if (idx < 1 || idx > 3) return;
    const pThoughts = THOUGHTS[idx];
    const hand = game2.players[idx];
    if (game2.pendingDraw > 0) {
      showThought(idx, pickRandom(pThoughts.draw_attacked), 1700);
      return;
    }
    const valid = game2.getValidPlays(idx);
    if (valid.length === 0) {
      showThought(idx, pickRandom(pThoughts.draw_frustrated), 1700);
      return;
    }
    const nextCard = game2.pickAiCard(valid, hand);
    if (!nextCard) return;
    if (hand.length === 2) {
      showThought(idx, pickRandom(pThoughts.turn_few_cards), 1900);
    } else if (nextCard.value === "wild4") {
      showThought(idx, pickRandom(pThoughts.play_wild4), 1900);
    } else if (nextCard.value === "wild") {
      showThought(idx, pickRandom(pThoughts.play_wild), 1800);
    } else if (nextCard.value === "draw2") {
      showThought(idx, pickRandom(pThoughts.play_draw2), 1800);
    } else if (nextCard.value === "skip") {
      showThought(idx, pickRandom(pThoughts.play_skip), 1700);
    } else if (nextCard.value === "reverse") {
      showThought(idx, pickRandom(pThoughts.play_reverse), 1700);
    } else if (hand.length >= 8) {
      if (Math.random() < 0.7) {
        showThought(idx, pickRandom(pThoughts.turn_many_cards), 1700);
      }
    } else {
      if (Math.random() < 0.25) {
        showThought(idx, pickRandom(pThoughts.turn_normal), 1500);
      }
    }
  }
  function triggerGameStartThoughts() {
    hideAllThoughts();
    setTimeout(() => showThought(1, pickRandom(THOUGHTS[1].start), 1400), 400);
    setTimeout(() => showThought(2, pickRandom(THOUGHTS[2].start), 1400), 2e3);
    setTimeout(() => showThought(3, pickRandom(THOUGHTS[3].start), 1400), 3600);
  }
  function triggerUnoReaction(unoPlayerIndex) {
    if (unoPlayerIndex >= 1 && unoPlayerIndex <= 3) {
      showThought(unoPlayerIndex, pickRandom(THOUGHTS[unoPlayerIndex].uno), 1800);
    }
    const opponents = [1, 2, 3].filter((i) => i !== unoPlayerIndex);
    if (opponents.length > 0) {
      const reactor = opponents[Math.floor(Math.random() * opponents.length)];
      setTimeout(() => {
        showThought(reactor, pickRandom(THOUGHTS[reactor].watch_uno), 1800);
      }, 1900);
    }
  }
  function triggerGameOverThoughts(winnerIndex) {
    if (winnerIndex >= 1 && winnerIndex <= 3) {
      const victoryQuote = winnerIndex === 3 ? "\u79C1\u306E\u52DD\u3061\u306D" : "\u4FFA\u306E\u52DD\u3061\u3060\u3002";
      setTimeout(() => showThought(winnerIndex, victoryQuote, 2200), 200);
    } else {
      const loser = Math.floor(Math.random() * 3) + 1;
      setTimeout(() => showThought(loser, pickRandom(THOUGHTS[loser].lose), 2e3), 500);
    }
  }
  function triggerHumanThinkingThought() {
    const randomAi = Math.floor(Math.random() * 3) + 1;
    showThought(randomAi, pickRandom(THOUGHTS[randomAi].human_thinking), 1800);
  }

  // js/main.js
  var $ = (sel) => document.querySelector(sel);
  var $$ = (sel) => document.querySelectorAll(sel);
  var titleScreen = $("#title-screen");
  var gameScreen = $("#game-screen");
  var startBtn = $("#start-btn");
  var restartBtn = $("#restart-btn");
  var drawPile = $("#draw-pile");
  var discardPile = $("#discard-pile");
  var playerHand = $("#player-hand");
  var deckCount = $("#deck-count");
  var messageBar = $("#message-bar");
  var unoBtn = $("#uno-btn");
  var passBtn = $("#pass-btn");
  var colorModal = $("#color-modal");
  var resultModal = $("#result-modal");
  var resultTitle = $("#result-title");
  var resultMessage = $("#result-message");
  var bgmToggleBtn = $("#bgm-toggle-btn");
  var bgmIcon = $("#bgm-icon");
  var settingsToggleBtn = $("#settings-toggle-btn");
  var settingsModal = $("#settings-modal");
  var settingsCloseBtn = $("#settings-close-btn");
  var settingsConfirmBtn = $("#settings-confirm-btn");
  var modalBgmToggleBtn = $("#modal-bgm-toggle-btn");
  var modalBgmIcon = $("#modal-bgm-icon");
  var modalBgmStatus = $("#modal-bgm-status");
  var volumeSlider = $("#volume-slider");
  var volumeValue = $("#volume-value");
  var game = new Game();
  var selectedIndex = -1;
  var lastTopCardKey = null;
  startBtn.addEventListener("click", startGame);
  restartBtn.addEventListener("click", () => {
    resultModal.classList.add("hidden");
    const cutinEl = $("#winner-cutin");
    if (cutinEl) cutinEl.classList.add("hidden");
    startGame();
  });
  drawPile.addEventListener("click", () => game.humanDraw());
  unoBtn.addEventListener("click", () => game.callUno());
  passBtn.addEventListener("click", () => game.humanPass());
  $$(".color-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      colorModal.classList.add("hidden");
      game.humanPickColor(btn.dataset.color);
    });
  });
  var humanThinkingTimer = null;
  game.onUpdate = render;
  game.onMessage = showMessage;
  game.onColorPick = () => {
    colorModal.classList.remove("hidden");
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
    hideAllThoughts();
    if (playerIndex === 0) {
      humanThinkingTimer = setTimeout(() => {
        if (game.phase === "human" && game.winner === null) {
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
  var WINNER_VICTORY_DATA = {
    1: {
      // プレイヤーA
      avatar: "assets/avatars/jockey-a-win.png",
      quote: "\u4FFA\u306E\u52DD\u3061\u3060\u3002",
      name: "\u30D7\u30EC\u30A4\u30E4\u30FCA"
    },
    2: {
      // プレイヤーB
      avatar: "assets/avatars/jockey-b-win.png",
      quote: "\u4FFA\u306E\u52DD\u3061\u3060\u3002",
      name: "\u30D7\u30EC\u30A4\u30E4\u30FCB"
    },
    3: {
      // プレイヤーC
      avatar: "assets/avatars/jockey-c-win.png",
      quote: "\u79C1\u306E\u52DD\u3061\u306D",
      name: "\u30D7\u30EC\u30A4\u30E4\u30FCC"
    }
  };
  game.onGameOver = (winnerIndex) => {
    if (humanThinkingTimer) clearTimeout(humanThinkingTimer);
    triggerGameOverThoughts(winnerIndex);
    const won = winnerIndex === 0;
    resultTitle.textContent = won ? "YOU WIN!" : "GAME OVER";
    resultMessage.textContent = won ? "\u304A\u3081\u3067\u3068\u3046\uFF01\u6700\u9AD8\u306E\u52DD\u5229\u3002" : `${PLAYER_NAMES[winnerIndex]} \u306E\u52DD\u5229\u2026 \u6B21\u306F\u30EA\u30D9\u30F3\u30B8\u3002`;
    const cutinEl = $("#winner-cutin");
    if (cutinEl) {
      if (!won && WINNER_VICTORY_DATA[winnerIndex]) {
        const data = WINNER_VICTORY_DATA[winnerIndex];
        const imgEl = $("#winner-avatar-img");
        const textEl = $("#winner-speech-text");
        if (imgEl) imgEl.src = data.avatar;
        if (textEl) textEl.textContent = data.quote;
        cutinEl.classList.remove("hidden");
      } else {
        cutinEl.classList.add("hidden");
      }
    }
    setTimeout(() => resultModal.classList.remove("hidden"), 900);
  };
  function startGame() {
    titleScreen.classList.remove("active");
    gameScreen.classList.add("active");
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
    messageBar.classList.toggle("important", important);
  }
  function renderCardElement(card, options = {}) {
    const { playable = false, index = -1, fan = false, fanIndex = 0, fanTotal = 1 } = options;
    const el = document.createElement("div");
    const isWild = card.color === "wild";
    el.className = `card ${isWild ? "wild" : card.color}`;
    if (playable) el.classList.add("playable");
    if (index === selectedIndex) el.classList.add("selected");
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
      const angle = fanTotal > 1 ? -12 + 24 / (fanTotal - 1) * fanIndex : 0;
      el.style.transform = `rotate(${angle}deg) translateY(${Math.abs(angle) * 0.3}px)`;
      el.style.zIndex = fanIndex;
    }
    if (playable && index >= 0) {
      el.addEventListener("click", () => {
        if (game.phase !== "human") return;
        selectedIndex = index;
        game.humanPlay(index);
        selectedIndex = -1;
      });
    }
    return el;
  }
  var AVATAR_EXPRESSIONS = {
    1: {
      // プレイヤーA
      normal: "assets/avatars/jockey-a.png",
      advantage: "assets/avatars/jockey-a-win.png",
      disadvantage: "assets/avatars/jockey-a-lose.png"
    },
    2: {
      // プレイヤーB
      normal: "assets/avatars/jockey-b.png",
      advantage: "assets/avatars/jockey-b-win.png",
      disadvantage: "assets/avatars/jockey-b-lose.png"
    },
    3: {
      // プレイヤーC
      normal: "assets/avatars/jockey-c.png",
      advantage: "assets/avatars/jockey-c-win.png",
      disadvantage: "assets/avatars/jockey-c-lose.png"
    }
  };
  function updateOpponentEmotions() {
    if (!game || !game.players) return;
    for (let p = 1; p <= 3; p++) {
      const oppEl = $(`[data-player="${p}"]`);
      if (!oppEl) continue;
      const imgEl = oppEl.querySelector(".avatar-img");
      if (!imgEl) continue;
      const count = game.players[p] && game.players[p].length || 0;
      let state = "normal";
      if (game.phase && game.phase !== "init" && count > 0) {
        if (count <= 2) {
          state = "advantage";
        } else if (count >= 8) {
          state = "disadvantage";
        } else {
          state = "normal";
        }
      }
      const expMap = AVATAR_EXPRESSIONS[p];
      if (expMap) {
        const targetSrc = expMap[state] || expMap.normal;
        const currentEmotion = imgEl.getAttribute("data-emotion");
        if (currentEmotion !== state) {
          imgEl.setAttribute("data-emotion", state);
          const testImg = new Image();
          testImg.onload = () => {
            imgEl.src = targetSrc;
          };
          testImg.onerror = () => {
            imgEl.src = expMap.normal;
          };
          testImg.src = targetSrc;
        }
      }
    }
  }
  function render() {
    deckCount.textContent = game.deck.length;
    discardPile.innerHTML = "";
    if (game.topCard) {
      const top = renderCardElement(game.topCard);
      const topKey = `${game.discard.length}-${game.topCard.color}-${game.topCard.value}`;
      if (topKey !== lastTopCardKey && game.topCard.type !== "number") {
        top.classList.add("fx-discard-pop");
      }
      lastTopCardKey = topKey;
      discardPile.appendChild(top);
    }
    playerHand.innerHTML = "";
    const hand = game.players[0];
    const isHumanTurn = game.phase === "human" || game.phase === "picking-color";
    hand.forEach((card, i) => {
      const playable = isHumanTurn && canPlay(card, game.topCard, game.currentColor);
      const el = renderCardElement(card, {
        playable,
        index: i,
        fan: true,
        fanIndex: i,
        fanTotal: hand.length
      });
      playerHand.appendChild(el);
    });
    for (let p = 1; p <= 3; p++) {
      const bar = $(`#bar-${p}`);
      const count = game.players[p].length;
      bar.innerHTML = "";
      const segments = Math.min(count, 10);
      for (let s = 0; s < 10; s++) {
        const seg = document.createElement("div");
        seg.className = "segment" + (s < segments ? " filled" : "");
        bar.appendChild(seg);
      }
    }
    $$(".opponent").forEach((el) => {
      const idx = parseInt(el.dataset.player, 10);
      el.classList.toggle("active", game.currentPlayer === idx);
    });
    updateOpponentEmotions();
    unoBtn.disabled = !(game.phase === "human" && hand.length === 1);
    passBtn.disabled = game.phase !== "human";
    drawPile.style.opacity = isHumanTurn ? "1" : "0.5";
    drawPile.style.pointerEvents = isHumanTurn ? "auto" : "none";
  }
  render();
  initThemes();
  initField();
  function updateAudioUI(state) {
    const isEnabled = state.enabled;
    if (bgmIcon) bgmIcon.textContent = isEnabled ? "\u{1F50A}" : "\u{1F507}";
    if (bgmToggleBtn) {
      bgmToggleBtn.classList.toggle("muted", !isEnabled);
      bgmToggleBtn.title = isEnabled ? "\u97F3\u697D OFF (\u30DF\u30E5\u30FC\u30C8)" : "\u97F3\u697D ON";
    }
    if (modalBgmIcon) modalBgmIcon.textContent = isEnabled ? "\u{1F50A}" : "\u{1F507}";
    if (modalBgmStatus) modalBgmStatus.textContent = isEnabled ? "ON" : "OFF";
    if (modalBgmToggleBtn) modalBgmToggleBtn.classList.toggle("active", isEnabled);
    $$(".track-btn").forEach((btn) => {
      const isActive = btn.dataset.track === state.currentTrackId;
      btn.classList.toggle("active", isActive);
      const icon = btn.querySelector(".track-status-icon");
      if (icon) icon.textContent = isActive ? isEnabled ? "\u25B6" : "\u23F8" : "";
    });
    if (volumeSlider) volumeSlider.value = Math.round(state.volume * 100);
    if (volumeValue) volumeValue.textContent = `${Math.round(state.volume * 100)}%`;
  }
  bgmToggleBtn?.addEventListener("click", () => {
    audioManager.toggle();
  });
  modalBgmToggleBtn?.addEventListener("click", () => {
    audioManager.toggle();
  });
  settingsToggleBtn?.addEventListener("click", () => {
    settingsModal?.classList.remove("hidden");
  });
  settingsCloseBtn?.addEventListener("click", () => {
    settingsModal?.classList.add("hidden");
  });
  settingsConfirmBtn?.addEventListener("click", () => {
    settingsModal?.classList.add("hidden");
  });
  settingsModal?.addEventListener("click", (e) => {
    if (e.target === settingsModal) {
      settingsModal.classList.add("hidden");
    }
  });
  $$(".track-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      audioManager.setTrack(btn.dataset.track);
    });
  });
  volumeSlider?.addEventListener("input", (e) => {
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
  var unlockAudio = () => {
    if (audioManager.enabled && audioManager.audio.paused) {
      audioManager.play();
    }
    window.removeEventListener("click", unlockAudio);
  };
  window.addEventListener("click", unlockAudio);
  if (new URLSearchParams(window.location.search).has("autostart")) {
    setTimeout(startGame, 150);
  }
})();
