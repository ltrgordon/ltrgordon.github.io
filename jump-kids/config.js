export const TILE = 32;
export const GRAVITY = 1800;      // px/s^2
export const MOVE_ACC = 2600;     // px/s^2
export const MOVE_MAX = 230;      // px/s
export const FRICTION = 1800;     // px/s^2
export const JUMP_VEL = 620;      // px/s
export const CAM_MARGIN_X = 340;  // camera lead
export const EPSY = 0.75;         // vertical snap epsilon (px) to stop jitter
export const COYOTE_TIME = 0.10;  // seconds after walking off ledge where jump still works
export const JUMP_BUFFER = 0.12;  // seconds to buffer jump pressed slightly before landing

// Canvas colors
export const COL = { ground:'#7c4a1f', grass:'#49a020', brick:'#b85a35', coin:'#f2c14e' };
