export const THEMES = [
  { id: 'neon-tokyo', label: 'Neon Tokyo' },
  { id: 'kyoto-zen', label: 'Kyoto Zen' },
  { id: 'akiba-98', label: "Akiba '98" },
  { id: 'shimokita-lofi', label: 'Shimokita Lo-Fi' },
  { id: 'roppongi-void', label: 'Roppongi Void' },
];

export const THEME_SVG_PALETTES = {
  'akiba-98': {
    fillTop: '#0e2448',
    fillMid1: '#091832',
    fillMid2: '#061225',
    fillBot: '#040b18',
    glowCore: '#00d4ff',
    glowMid: '#0066cc',
    stroke: '#00d4ff',
    strokeOuter: '#0099ff',
    slotStroke: '#00d4ff'
  },
  'neon-tokyo': {
    fillTop: '#1e0538',
    fillMid1: '#150428',
    fillMid2: '#0e021c',
    fillBot: '#06000e',
    glowCore: '#ff007f',
    glowMid: '#bf5af2',
    stroke: '#ff007f',
    strokeOuter: '#bf5af2',
    slotStroke: '#ff007f'
  },
  'kyoto-zen': {
    fillTop: '#2b2216',
    fillMid1: '#201810',
    fillMid2: '#17110a',
    fillBot: '#0c0905',
    glowCore: '#d4af37',
    glowMid: '#5a785d',
    stroke: '#d4af37',
    strokeOuter: '#a8882d',
    slotStroke: '#d4af37'
  },
  'shimokita-lofi': {
    fillTop: '#321a10',
    fillMid1: '#25120a',
    fillMid2: '#1a0c06',
    fillBot: '#0d0603',
    glowCore: '#ff7a3d',
    glowMid: '#e06d53',
    stroke: '#ff7a3d',
    strokeOuter: '#e06d53',
    slotStroke: '#ff7a3d'
  },
  'roppongi-void': {
    fillTop: '#18181e',
    fillMid1: '#101014',
    fillMid2: '#0a0a0d',
    fillBot: '#000000',
    glowCore: '#ffffff',
    glowMid: '#ff1744',
    stroke: '#ffffff',
    strokeOuter: '#ff1744',
    slotStroke: '#ffffff'
  }
};

const STORAGE_KEY = 'foth-theme';

export function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'akiba-98';
}

function updateSvgGradients(themeId) {
  const p = THEME_SVG_PALETTES[themeId] || THEME_SVG_PALETTES['akiba-98'];
  if (!p) return;

  const top = document.getElementById('stop-table-top');
  const mid1 = document.getElementById('stop-table-mid1');
  const mid2 = document.getElementById('stop-table-mid2');
  const bot = document.getElementById('stop-table-bot');
  const glowCore = document.getElementById('stop-glow-core');
  const glowMid = document.getElementById('stop-glow-mid');
  const feShadow1 = document.getElementById('fe-shadow-1');
  const feShadow2 = document.getElementById('fe-shadow-2');
  const feSlot = document.getElementById('fe-slot-shadow');

  if (top) top.setAttribute('stop-color', p.fillTop);
  if (mid1) mid1.setAttribute('stop-color', p.fillMid1);
  if (mid2) mid2.setAttribute('stop-color', p.fillMid2);
  if (bot) bot.setAttribute('stop-color', p.fillBot);
  if (glowCore) glowCore.setAttribute('stop-color', p.glowCore);
  if (glowMid) glowMid.setAttribute('stop-color', p.glowMid);
  if (feShadow1) feShadow1.setAttribute('flood-color', p.stroke);
  if (feShadow2) feShadow2.setAttribute('flood-color', p.strokeOuter);
  if (feSlot) feSlot.setAttribute('flood-color', p.slotStroke);
}

export function applyTheme(themeId) {
  document.documentElement.dataset.theme = themeId;
  localStorage.setItem(STORAGE_KEY, themeId);

  updateSvgGradients(themeId);

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.theme === themeId);
  });

  const current = THEMES.find(t => t.id === themeId);
  const currentLabel = document.querySelector('.theme-current-label');
  if (currentLabel && current) {
    currentLabel.textContent = current.label;
  }
}

export function initThemes() {
  const saved = getSavedTheme();
  applyTheme(saved);

  const menu = document.getElementById('theme-menu');
  const toggleBtn = document.getElementById('theme-toggle-btn');

  if (toggleBtn && menu) {
    toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      menu.classList.toggle('open');
    });

    document.addEventListener('click', (e) => {
      if (!menu.contains(e.target)) {
        menu.classList.remove('open');
      }
    });
  }

  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      menu?.classList.remove('open');
    });
  });
}
