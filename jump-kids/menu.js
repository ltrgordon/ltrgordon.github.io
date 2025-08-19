import { CHARACTERS } from './config.js';
import { LEVELS } from './levels.js';

export function initMenu() {
  const menu = document.getElementById('menu');
  const levelGrid = document.getElementById('levelGrid');
  const charGrid = document.getElementById('charGrid');
  const preview = document.getElementById('charPreview');
  const ctx = preview.getContext('2d');

  let selectedChar = CHARACTERS[0].id;
  let selectedLevel = LEVELS[0].id;

  // Populate level selection
  LEVELS.forEach((lvl, idx) => {
    const btn = document.createElement('button');
    btn.className = 'char-card';
    btn.textContent = lvl.name;
    btn.dataset.level = lvl.id;
    btn.setAttribute('aria-selected', idx === 0 ? 'true' : 'false');
    btn.addEventListener('click', () => {
      selectedLevel = lvl.id;
      levelGrid
        .querySelectorAll('.char-card')
        .forEach((b) => b.setAttribute('aria-selected', 'false'));
      btn.setAttribute('aria-selected', 'true');
    });
    levelGrid.appendChild(btn);
  });

  function drawPreview(char) {
    ctx.clearRect(0, 0, preview.width, preview.height);
    ctx.fillStyle = char.colors.outfit;
    ctx.fillRect(180, 180, 60, 100);
    ctx.fillStyle = char.colors.hat;
    ctx.fillRect(190, 140, 40, 40);
  }

  drawPreview(CHARACTERS[0]);

  charGrid.addEventListener('click', (e) => {
    const btn = e.target.closest('.char-card');
    if (!btn) return;
    selectedChar = btn.dataset.char;
    charGrid
      .querySelectorAll('.char-card')
      .forEach((c) => c.setAttribute('aria-selected', 'false'));
    btn.setAttribute('aria-selected', 'true');
    const char = CHARACTERS.find((c) => c.id === selectedChar);
    if (char) drawPreview(char);
  });

  return new Promise((resolve) => {
    document.getElementById('startBtn').addEventListener(
      'click',
      () => {
        menu.style.display = 'none';
        resolve({ character: selectedChar, level: selectedLevel });
      },
      { once: true },
    );
  });
}
