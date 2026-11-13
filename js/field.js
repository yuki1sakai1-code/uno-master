import { THEME_SVG_PALETTES, getSavedTheme } from './themes.js';

/**
 * UNO 2.0 — Programmatic Cyber Field & Card Slot Generator
 * カードの実際の実装サイズ・位置をDOMからリアルタイムに取得し、
 * テーブル外枠、同心円レーダー、カードスロット枠をピクセル単位で完全一致させて描画します。
 */

let resizeObserver = null;

function buildTablePath(W, H, inset = 0) {
  const isPortrait = H > W;
  const isMobile = W < 768;
  const topY = Math.max(20, Math.round(H * (isPortrait ? 0.055 : 0.075))) + inset;
  const botY = Math.min(H - 20, Math.round(H * (isPortrait ? 0.91 : 0.88))) - inset;
  const tableH = botY - topY;
  const cx = W / 2;

  const topHalfW = isPortrait
    ? Math.max(140, Math.min(W * 0.44, 440) - inset)
    : (isMobile
        ? Math.max(120, Math.min(W * 0.45, 340) - inset)
        : Math.max(200, Math.min(W * 0.38, 480) - inset));

  const botHalfW = isPortrait
    ? Math.max(160, Math.min(W * 0.48, 480) - inset)
    : (isMobile
        ? Math.max(140, Math.min(W * 0.48, 380) - inset)
        : Math.max(260, Math.min(W * 0.48, 620) - inset));

  const chamferX = (isMobile || isPortrait) ? Math.round(topHalfW * 0.12) : 55;
  const chamferY = Math.round(tableH * (isPortrait ? 0.08 : 0.11));

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

  return `M ${p1x},${topY} ` +
    `L ${p2x},${topY} ` +
    `Q ${p2x + 12},${topY} ${p2x + 20},${topY + 7} ` +
    `L ${p3x},${p3y} ` +
    `Q ${p3x + 7},${p3y + 8} ${p4x},${p4y} ` +
    `L ${p5x},${p5y} ` +
    `Q ${p5x},${botY} ${p6x},${botY} ` +
    `L ${p7x},${botY} ` +
    `Q ${p8x},${botY} ${p8x},${p8y} ` +
    `L ${p9x},${p9y} ` +
    `Q ${p9x - 7},${p9y - 8} ${p10x},${p10y} ` +
    `L ${p1x - 20},${topY + 7} ` +
    `Q ${p1x - 12},${topY} ${p1x},${topY} Z`;
}

export function updateField() {
  const gameScreen = document.getElementById('game-screen');
  const svg = document.getElementById('cyber-table-svg');
  if (!gameScreen || !svg) return;

  const rect = gameScreen.getBoundingClientRect();
  const W = Math.round(rect.width || window.innerWidth);
  const H = Math.round(rect.height || window.innerHeight);
  if (W <= 0 || H <= 0) return;

  svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
  svg.setAttribute('width', `${W}`);
  svg.setAttribute('height', `${H}`);

  // カード要素の実測座標
  const drawPile = document.getElementById('draw-pile');
  const discardPile = document.getElementById('discard-pile');

  const isMobile = W < 768;
  let cardW = isMobile ? 60 : 88;
  let cardH = isMobile ? 90 : 132;
  let gap = isMobile ? 24 : 40;
  let drawX = Math.round(W / 2 - gap / 2 - cardW);
  let drawY = Math.round(H * 0.5 - cardH * 0.5);
  let discardX = Math.round(W / 2 + gap / 2);
  let discardY = drawY;
  let cardRadius = isMobile ? 8 : 10;

  if (drawPile && discardPile) {
    const dRect = drawPile.getBoundingClientRect();
    const disRect = discardPile.getBoundingClientRect();

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

      const style = window.getComputedStyle(drawPile);
      const r = parseInt(style.borderRadius, 10);
      if (!isNaN(r) && r > 0) cardRadius = r;
    }
  }

  // カードの中心点
  const centerX = Math.round((drawX + discardX + cardW) / 2);
  const centerY = Math.round(drawY + cardH / 2);

  // テーマ色
  const currentTheme = document.documentElement.dataset.theme || getSavedTheme() || 'akiba-98';
  const p = THEME_SVG_PALETTES[currentTheme] || THEME_SVG_PALETTES['akiba-98'];

  // パースペクティブテーブルのパス
  const outerPath = buildTablePath(W, H, 0);
  const innerPath = buildTablePath(W, H, 14);

  // 同心円レーダー（縦画面・横画面それぞれで自然な比率に調整）
  const isPortrait = H > W;
  const isCompact = W < 960 || isPortrait;

  const radarRx1 = Math.round(Math.min(W * 0.38, Math.max(cardW * 3.2, isPortrait ? 220 : 260)));
  const radarRy1 = Math.round(Math.min(H * (isPortrait ? 0.22 : 0.30), Math.max(cardH * 1.5, 130)));
  const radarRx2 = Math.round(radarRx1 * 0.65);
  const radarRy2 = Math.round(radarRy1 * 0.65);
  const radarRx3 = Math.round(radarRx1 * 0.32);
  const radarRy3 = Math.round(radarRy1 * 0.32);

  // カード置き場スロット（カードの実際サイズと位置に100%一致）
  const ghostLeftX = drawX - gap - cardW;
  const ghostRightX = discardX + cardW + gap;

  // ポートレートやコンパクト画面では中央の山札・捨て札の2枠のみをクリアに表示
  // 大画面横長表示でのみ左右のゴースト枠を表示
  const showGhostSlots = !isCompact && (ghostLeftX >= 160 && ghostRightX + cardW <= W - 160);

  // ガイドライン（スロットの表示有無に合わせて自然に接続）
  const guideY = centerY;
  const guideLeftX1 = Math.round(Math.max(20, W * 0.08));
  const guideLeftX2 = showGhostSlots ? (ghostLeftX - 16) : (drawX - 16);
  const guideRightX1 = showGhostSlots ? (ghostRightX + cardW + 16) : (discardX + cardW + 16);
  const guideRightX2 = Math.round(Math.min(W - 20, W * 0.92));

  let slotsHtml = '';
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

  // HUDアクセント
  const hudTopY = Math.max(35, Math.round(H * 0.075) + 14);
  const hudLineX1 = centerX + Math.round(cardW * 1.2);
  const hudLineX2 = hudLineX1 + Math.round(cardW * 1.0);

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

    <!-- Top & Corner Tech HUD Accents -->
    <line class="table-hud-accent" x1="${hudLineX1}" y1="${hudTopY}" x2="${hudLineX2}" y2="${hudTopY}" stroke="${p.stroke}" stroke-width="2" stroke-dasharray="10 4 4 4 4 4" stroke-opacity="0.85"/>

    <!-- Concentric Perspective Radar Rings (カード中心に同心円で配置) -->
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx1}" ry="${radarRy1}" fill="none" stroke="${p.strokeOuter}" stroke-width="1.2" stroke-opacity="0.22" stroke-dasharray="14 8"/>
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx2}" ry="${radarRy2}" fill="none" stroke="${p.strokeOuter}" stroke-width="1" stroke-opacity="0.25"/>
    <ellipse class="table-radar-ring" cx="${centerX}" cy="${centerY}" rx="${radarRx3}" ry="${radarRy3}" fill="none" stroke="${p.strokeOuter}" stroke-width="1" stroke-opacity="0.18"/>

    <!-- Horizontal Guide Lines -->
    <line class="table-guide-line" x1="${guideLeftX1}" y1="${guideY}" x2="${guideLeftX2}" y2="${guideY}" stroke="${p.strokeOuter}" stroke-width="1.5" stroke-dasharray="6 6" stroke-opacity="0.45"/>
    <line class="table-guide-line" x1="${guideRightX1}" y1="${guideY}" x2="${guideRightX2}" y2="${guideY}" stroke="${p.strokeOuter}" stroke-width="1.5" stroke-dasharray="6 6" stroke-opacity="0.45"/>

    <!-- Card Placement Slots (プログラムによるピクセル完全一致枠) -->
    ${slotsHtml}
  `;
}

export function initField() {
  window.addEventListener('resize', () => {
    requestAnimationFrame(updateField);
  });

  const gameScreen = document.getElementById('game-screen');
  const playArea = document.querySelector('.play-area');

  if (window.ResizeObserver) {
    resizeObserver = new ResizeObserver(() => {
      requestAnimationFrame(updateField);
    });
    if (gameScreen) resizeObserver.observe(gameScreen);
    if (playArea) resizeObserver.observe(playArea);
  }
}

