export class Entity {
  constructor(x, y, w, h) {
    this.x = x; this.y = y; this.w = w; this.h = h;
    this.vx = 0; this.vy = 0;
    this.dead = false; this.remove = false; this.grounded = false;
  }
  get left() { return this.x; }
  get right() { return this.x + this.w; }
  get top() { return this.y; }
  get bottom() { return this.y + this.h; }
  // Update hook: override in subclasses
  update(dt, world) {}
  // Render hook: override in subclasses
  render(ctx, camX) {}
}

export class Snake extends Entity {
  constructor(x, y) {
    super(x, y, 16, 8); // Small snake size
    this.wiggleTime = Math.random() * Math.PI * 2; // Random start phase
    this.wiggleSpeed = 3 + Math.random() * 2; // Wiggle frequency
    this.baseY = y; // Remember original Y position
    this.segments = [
      { x: 0, y: 0 },
      { x: -4, y: 0 },
      { x: -8, y: 0 }
    ]; // Snake body segments relative to head
  }
  
  update(dt, world) {
    this.wiggleTime += dt * this.wiggleSpeed;
    
    // Create wiggling motion
    const wiggle = Math.sin(this.wiggleTime) * 2;
    this.y = this.baseY + wiggle;
    
    // Update segments to follow with slight delay
    for (let i = 1; i < this.segments.length; i++) {
      const prevSegment = this.segments[i - 1];
      const segment = this.segments[i];
      segment.y = prevSegment.y + Math.sin(this.wiggleTime - i * 0.5) * 1;
    }
  }
  
  render(ctx, camX) {
    const screenX = this.x - camX;
    const screenY = this.y;
    
    // Draw snake body segments
    ctx.fillStyle = '#2d5016'; // Dark green body
    for (let i = this.segments.length - 1; i >= 0; i--) {
      const segment = this.segments[i];
      ctx.fillRect(
        screenX + segment.x, 
        screenY + segment.y, 
        4, 4
      );
    }
    
    // Draw snake head
    ctx.fillStyle = '#4a7c22'; // Lighter green head
    ctx.fillRect(screenX, screenY, 6, 4);
    
    // Draw eyes
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(screenX + 1, screenY + 1, 1, 1);
    ctx.fillRect(screenX + 4, screenY + 1, 1, 1);
  }
}
