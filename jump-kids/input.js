export const keys = { left: false, right: false, jump: false, dash: false };

export function setupInput() {
  const set = (k, v) => {
    switch (k) {
      case 'arrowleft':
      case 'a':
        keys.left = v;
        break;
      case 'arrowright':
      case 'd':
        keys.right = v;
        break;
      case ' ':
      case 'z':
      case 'w':
      case 'arrowup':
        keys.jump = v;
        break;
      case 'shift':
        keys.dash = v;
        break;
      default:
    }
  };
  window.addEventListener('keydown', (e) => set(e.key.toLowerCase(), true));
  window.addEventListener('keyup', (e) => set(e.key.toLowerCase(), false));
}
