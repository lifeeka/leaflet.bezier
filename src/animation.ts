export type Easing = (t: number) => number;

export const easings = {
  linear: (t: number) => t,
  easeIn: (t: number) => t * t,
  easeOut: (t: number) => t * (2 - t),
  easeInOut: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
} satisfies Record<string, Easing>;

export type EasingName = keyof typeof easings | 'flight';

/**
 * Two-phase easing replicating the v1 Snap.svg animation: a quick ease-out
 * takeoff covering `splitProgress` of the path in `splitTime` of the duration,
 * then a slow ease-in cruise for the rest.
 */
export function flightEasing(splitProgress = 0.75, splitTime = 2500 / 9500): Easing {
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    if (t < splitTime) {
      return easings.easeOut(t / splitTime) * splitProgress;
    }
    return splitProgress + easings.easeIn((t - splitTime) / (1 - splitTime)) * (1 - splitProgress);
  };
}

export function resolveEasing(easing?: EasingName | Easing): Easing {
  if (typeof easing === 'function') return easing;
  if (easing && easing !== 'flight' && easing in easings) return easings[easing];
  return flightEasing();
}

export interface AnimatorOptions {
  /** Total travel time in ms at speed 1. */
  duration: number;
  easing?: Easing;
  /** true = loop forever, n = play n times total. */
  loop?: boolean | number;
  /** Called every frame with eased progress 0..1. */
  onFrame: (progress: number) => void;
  onEnd?: () => void;
  onLoop?: () => void;
}

const clamp01 = (t: number) => Math.min(Math.max(t, 0), 1);

/** requestAnimationFrame driver for progress along a path. */
export class PathAnimator {
  playing = false;

  private t = 0; // linear time progress 0..1
  private direction: 1 | -1 = 1;
  private speed = 1;
  private rafId = 0;
  private lastTick: number | null = null;
  private loopsLeft: number;

  constructor(private opts: AnimatorOptions) {
    const { loop } = opts;
    this.loopsLeft = loop === true ? Infinity : Math.max(0, (typeof loop === 'number' ? loop : 1) - 1);
  }

  get progress(): number {
    return this.t;
  }

  set progress(t: number) {
    this.t = clamp01(t);
    this.render();
  }

  play(): void {
    if (this.playing) return;
    this.playing = true;
    this.lastTick = null;
    this.rafId = requestAnimationFrame(this.frame);
  }

  pause(): void {
    this.playing = false;
    cancelAnimationFrame(this.rafId);
  }

  /** Pause and rewind to the start. */
  stop(): void {
    this.pause();
    this.direction = 1;
    this.t = 0;
    this.render();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
  }

  reverse(): void {
    this.direction = this.direction === 1 ? -1 : 1;
  }

  private render(): void {
    this.opts.onFrame((this.opts.easing ?? easings.linear)(this.t));
  }

  private frame = (now: number): void => {
    if (!this.playing) return; // stray rAF callback after pause()
    if (this.lastTick == null) this.lastTick = now;
    const dt = ((now - this.lastTick) / this.opts.duration) * this.speed * this.direction;
    this.lastTick = now;
    this.t = clamp01(this.t + dt);
    this.render();

    const atEnd = this.direction === 1 ? this.t >= 1 : this.t <= 0;
    if (atEnd) {
      if (this.loopsLeft > 0) {
        this.loopsLeft -= 1;
        this.t = this.direction === 1 ? 0 : 1;
        this.opts.onLoop?.();
      } else {
        this.playing = false;
        this.opts.onEnd?.();
        return;
      }
    }
    this.rafId = requestAnimationFrame(this.frame);
  };
}
