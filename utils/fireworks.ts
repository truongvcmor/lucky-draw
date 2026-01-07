export const drawFireworks = (canvas: HTMLCanvasElement) => {
  const ctx = canvas.getContext('2d');
  if (!ctx) return () => {};

  let w = canvas.width = window.innerWidth;
  let h = canvas.height = window.innerHeight;

  const resize = () => {
    w = canvas.width = window.innerWidth;
    h = canvas.height = window.innerHeight;
  };
  window.addEventListener('resize', resize);

  const colors = ['#F37021', '#0054A6', '#FFD700', '#FFFFFF', '#00E5FF', '#FF4444'];
  
  class Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    alpha: number;
    color: string;
    decay: number;
    size: number;

    constructor(x: number, y: number, color: string) {
      this.x = x;
      this.y = y;
      // Random velocity in all directions (explosion)
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 5 + 2;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed;
      
      this.alpha = 1;
      this.decay = Math.random() * 0.015 + 0.005; // Fade speed
      this.color = color;
      this.size = Math.random() * 3 + 1;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += 0.08; // Gravity
      this.vx *= 0.96; // Friction
      this.vy *= 0.96;
      this.alpha -= this.decay;
    }

    draw(ctx: CanvasRenderingContext2D) {
      ctx.save();
      ctx.globalAlpha = this.alpha;
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  class Firework {
    x: number;
    y: number;
    targetY: number;
    color: string;
    vy: number;
    vx: number; // Add slight horizontal drift for realism
    particles: Particle[];
    exploded: boolean;
    dead: boolean;

    constructor() {
      this.x = Math.random() * w;
      this.y = h;
      this.targetY = Math.random() * (h * 0.5); // Explode in top half
      this.color = colors[Math.floor(Math.random() * colors.length)];
      this.vy = -12 - Math.random() * 5; // Launch speed
      this.vx = (Math.random() - 0.5) * 2;
      this.particles = [];
      this.exploded = false;
      this.dead = false;
    }

    update() {
      if (!this.exploded) {
        this.y += this.vy;
        this.x += this.vx;
        this.vy += 0.15; // Gravity on rocket

        // Check if reached apex or target
        if (this.vy >= 0 || this.y <= this.targetY) {
          this.explode();
        }
      } else {
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
          this.particles[i].update();
          if (this.particles[i].alpha <= 0) {
            this.particles.splice(i, 1);
          }
        }
        if (this.particles.length === 0) {
          this.dead = true;
        }
      }
    }

    explode() {
      this.exploded = true;
      const particleCount = 80 + Math.random() * 50;
      for (let i = 0; i < particleCount; i++) {
        this.particles.push(new Particle(this.x, this.y, this.color));
      }
      
      // Add a second color for variety sometimes
      if (Math.random() > 0.5) {
         const color2 = colors[Math.floor(Math.random() * colors.length)];
         for (let i = 0; i < 30; i++) {
            this.particles.push(new Particle(this.x, this.y, color2));
         }
      }
    }

    draw(ctx: CanvasRenderingContext2D) {
      if (!this.exploded) {
        // Draw rocket tail
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x - this.vx * 3, this.y - this.vy * 3);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      } else {
        this.particles.forEach(p => p.draw(ctx));
      }
    }
  }

  const fireworks: Firework[] = [];
  let animationId: number;
  let tick = 0;

  const animate = () => {
    // Semi-transparent clear for trail effect
    ctx.globalCompositeOperation = 'destination-out';
    ctx.fillStyle = 'rgba(0, 0, 0, 0.2)'; 
    ctx.fillRect(0, 0, w, h);
    
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for glowing look

    // Spawn new fireworks
    if (tick % 20 === 0) { // Every 20 frames (~3 per second)
       fireworks.push(new Firework());
    }
    
    // Random extra bursts
    if (Math.random() < 0.05) {
        fireworks.push(new Firework());
    }

    tick++;

    for (let i = fireworks.length - 1; i >= 0; i--) {
      fireworks[i].update();
      fireworks[i].draw(ctx);
      if (fireworks[i].dead) {
        fireworks.splice(i, 1);
      }
    }

    animationId = requestAnimationFrame(animate);
  };

  animate();

  return () => {
    window.removeEventListener('resize', resize);
    cancelAnimationFrame(animationId);
  };
};