// A single authored sequence, independent of rendering or the wall clock.
export const DURATION = 20;
const mix = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

export function choreography(seconds) {
  const t = ((seconds % DURATION) + DURATION) % DURATION;
  let x = -1.45, z = .65, heading = .42, action = 'Idle';
  if (t >= 1.5 && t < 2) {
    heading = Math.atan2(2.25, -.7);
  } else if (t >= 2 && t < 5.8) {
    const p = (t - 2) / 3.8;
    x = mix(-1.45, .8, p); z = mix(.65, -.05, p);
    heading = Math.atan2(2.25, -.7); action = 'Walking';
  } else if (t >= 5.8 && t < 12.8) {
    x = .8; z = -.05;
    heading = t < 8.3 ? -.15 : t >= 12.1 ? Math.atan2(-2.25, .7) : .42;
    action = t >= 8.6 && t < 10.9 ? 'Wave' : 'Idle';
  } else if (t >= 12.8 && t < 16.6) {
    const p = (t - 12.8) / 3.8;
    x = mix(.8, -1.45, p); z = mix(-.05, .65, p);
    heading = Math.atan2(-2.25, .7); action = 'Walking';
  }
  const connected = smooth(Math.min(1, Math.max(0, (t - 6.2) / 1.4)));
  return { time: t, x, z, heading, action, connected };
}

// Visible time advances only while the scene can actually be seen.
export class Playback {
  constructor(reduced = false) {
    this.paused = reduced;
    this.visible = false;
    this.hidden = false;
    this.time = 0;
    this.previous = null;
  }
  get running() { return !this.paused && this.visible && !this.hidden; }
  resetClock() { this.previous = null; }
  tick(now) {
    if (!this.running) { this.resetClock(); return 0; }
    const dt = this.previous === null ? 0 : Math.max(0, Math.min((now - this.previous) / 1000, .05));
    this.previous = now;
    this.time += dt;
    return dt;
  }
}
