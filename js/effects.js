const FX_LABELS = {
  skip: 'SKIP!',
  reverse: 'REVERSE!',
  draw2: '+2',
  wild: 'WILD!',
  wild4: '+4',
};

export function playCardEffect(card) {
  if (card.type === 'number') return;

  const layer = document.getElementById('fx-layer');
  if (!layer) return;

  const type = card.value;
  if (!FX_LABELS[type]) return;

  layer.className = `fx-layer fx-${type}`;
  layer.innerHTML = buildFxContent(type, card);

  requestAnimationFrame(() => layer.classList.add('fx-active'));

  const duration = type === 'wild4' ? 1400 : type === 'wild' ? 1200 : 1000;
  setTimeout(() => {
    layer.classList.remove('fx-active');
    layer.className = 'fx-layer';
    layer.innerHTML = '';
  }, duration);

  if (type === 'reverse') spinTurnRing();
  if (type === 'draw2' || type === 'wild4') shakeScreen();
  spawnParticles(type);
}

function buildFxContent(type, card) {
  const label = FX_LABELS[type];
  let extra = '';

  if (type === 'wild' || type === 'wild4') {
    extra = '<div class="fx-rainbow-ring"></div>';
  }
  if (type === 'reverse') {
    extra = '<div class="fx-arrows">⇄</div>';
  }
  if (type === 'skip') {
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
  const ring = document.querySelector('.turn-ring');
  if (!ring) return;
  ring.classList.remove('fx-spin');
  void ring.offsetWidth;
  ring.classList.add('fx-spin');
  setTimeout(() => ring.classList.remove('fx-spin'), 1000);
}

function shakeScreen() {
  const screen = document.getElementById('game-screen');
  if (!screen) return;
  screen.classList.remove('fx-shake');
  void screen.offsetWidth;
  screen.classList.add('fx-shake');
  setTimeout(() => screen.classList.remove('fx-shake'), 600);
}

function spawnParticles(type) {
  const container = document.getElementById('fx-particles');
  if (!container) return;

  const colors = {
    skip: ['#ff6b6b', '#ffd93d'],
    reverse: ['#4ecdc4', '#a8e6cf'],
    draw2: ['#ffd60a', '#ff9f1c'],
    wild: ['#e63946', '#2dc653', '#4361ee', '#ffd60a'],
    wild4: ['#ff0066', '#ffcc00', '#ffffff'],
  };

  const palette = colors[type] || ['#ffd700'];
  const count = type === 'wild4' ? 24 : 16;

  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    p.className = 'fx-particle';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 80 + Math.random() * 160;
    p.style.setProperty('--tx', `${Math.cos(angle) * dist}px`);
    p.style.setProperty('--ty', `${Math.sin(angle) * dist}px`);
    p.style.background = palette[i % palette.length];
    p.style.animationDelay = `${Math.random() * 0.2}s`;
    p.style.width = `${4 + Math.random() * 8}px`;
    p.style.height = p.style.width;
    container.appendChild(p);
  }
}
