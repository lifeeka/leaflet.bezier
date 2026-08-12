import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PathAnimator, easings, flightEasing } from '../src/animation';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['requestAnimationFrame', 'cancelAnimationFrame', 'performance'] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('flightEasing', () => {
  it('is monotonic, pinned to 0 and 1, and hits the split point', () => {
    const ease = flightEasing(0.75, 0.25);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.25)).toBeCloseTo(0.75, 10);
    let prev = 0;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = ease(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('PathAnimator', () => {
  it('runs to completion and fires onEnd once', () => {
    const frames: number[] = [];
    const onEnd = vi.fn();
    const anim = new PathAnimator({
      duration: 1000,
      easing: easings.linear,
      onFrame: (t) => frames.push(t),
      onEnd,
    });

    anim.play();
    vi.advanceTimersByTime(500);
    expect(anim.progress).toBeGreaterThan(0.3);
    expect(anim.progress).toBeLessThan(0.7);

    vi.advanceTimersByTime(700);
    expect(anim.progress).toBe(1);
    expect(frames.at(-1)).toBe(1);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(anim.playing).toBe(false);
  });

  it('pauses and resumes without jumping', () => {
    const anim = new PathAnimator({ duration: 1000, onFrame: () => {} });
    anim.play();
    vi.advanceTimersByTime(300);
    anim.pause();
    const paused = anim.progress;
    vi.advanceTimersByTime(500);
    expect(anim.progress).toBe(paused);
    anim.play();
    vi.advanceTimersByTime(100);
    expect(anim.progress).toBeGreaterThan(paused);
  });

  it('stop rewinds to 0 and renders the reset frame', () => {
    const frames: number[] = [];
    const anim = new PathAnimator({ duration: 1000, onFrame: (t) => frames.push(t) });
    anim.play();
    vi.advanceTimersByTime(400);
    anim.stop();
    expect(anim.progress).toBe(0);
    expect(frames.at(-1)).toBe(0);
  });

  it('setSpeed scales elapsed time', () => {
    const anim = new PathAnimator({ duration: 1000, onFrame: () => {} });
    anim.setSpeed(2);
    anim.play();
    vi.advanceTimersByTime(600);
    expect(anim.progress).toBe(1);
  });

  it('reverse plays back toward the start and ends there', () => {
    const onEnd = vi.fn();
    const anim = new PathAnimator({ duration: 1000, onFrame: () => {}, onEnd });
    anim.play();
    vi.advanceTimersByTime(500);
    anim.reverse();
    vi.advanceTimersByTime(600);
    expect(anim.progress).toBe(0);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });

  it('loops n times and fires onLoop between runs', () => {
    const onLoop = vi.fn();
    const onEnd = vi.fn();
    const anim = new PathAnimator({
      duration: 100,
      loop: 3,
      onFrame: () => {},
      onLoop,
      onEnd,
    });
    anim.play();
    vi.advanceTimersByTime(1000);
    expect(onLoop).toHaveBeenCalledTimes(2);
    expect(onEnd).toHaveBeenCalledTimes(1);
  });
});
