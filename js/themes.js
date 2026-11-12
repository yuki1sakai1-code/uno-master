export const THEMES = [
  { id: 'neon-tokyo', label: 'Neon Tokyo' },
  { id: 'kyoto-zen', label: 'Kyoto Zen' },
  { id: 'akiba-98', label: "Akiba '98" },
  { id: 'shimokita-lofi', label: 'Shimokita Lo-Fi' },
  { id: 'roppongi-void', label: 'Roppongi Void' },
];

const STORAGE_KEY = 'foth-theme';

export function getSavedTheme() {
  return localStorage.getItem(STORAGE_KEY) || 'akiba-98';
}

export function applyTheme(themeId) {
  document.documentElement.dataset.theme = themeId;
  localStorage.setItem(STORAGE_KEY, themeId);

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
