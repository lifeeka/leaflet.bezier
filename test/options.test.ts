import { describe, expect, it, vi } from 'vitest';
import { normalizeOptions } from '../src/bezier-path';

describe('normalizeOptions (v1 back-compat)', () => {
  it('maps v1 timing options onto duration and a flight easing', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const o = normalizeOptions({
      fullAnimatedTime: 7000,
      easeOutTime: 2500,
      easeOutPiece: 4,
      iconTravelLength: 0.8,
    });
    expect(o.duration).toBe(9500);
    expect(o.travel).toBe(0.8);
    expect(typeof o.easing).toBe('function');
    const ease = o.easing as (t: number) => number;
    // split point: 75% of the path covered after the 2500ms takeoff phase
    expect(ease(2500 / 9500)).toBeCloseTo(0.75, 10);
  });

  it('does not override explicit v2 options with legacy ones', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    const o = normalizeOptions({ duration: 4000, travel: 1, fullAnimatedTime: 7000, iconTravelLength: 0.2 });
    expect(o.duration).toBe(4000);
    expect(o.travel).toBe(1);
  });

  it('parses v1 string iconTravelLength', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeOptions({ iconTravelLength: '0.5' }).travel).toBe(0.5);
  });

  it('leaves v2-only options untouched', () => {
    const o = normalizeOptions({ duration: 3000, travel: 0.9, loop: true });
    expect(o).toEqual({ duration: 3000, travel: 0.9, loop: true });
  });
});
