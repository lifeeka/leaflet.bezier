import { describe, expect, it } from 'vitest';
import { bezier, BezierPath, curvePointsToPath } from '../src/index';

const route = [
  { lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND' as const },
  { lat: -25.2744, lng: 133.7751, slide: 'LEFT_ROUND' as const },
  { lat: 36.2048, lng: 138.2529 },
];

describe('bezier factory', () => {
  it('splits multi-stop routes into segment layers', () => {
    const group = bezier({ path: [route, route.slice(0, 2)] });
    expect(group.getLayers()).toHaveLength(3);
  });

  it('handles empty config', () => {
    expect(bezier({ path: [] }).getLayers()).toHaveLength(0);
  });
});

describe('BezierPath', () => {
  it('computes a quadratic mid point and bounds', () => {
    const layer = new BezierPath({ from: route[0]!, to: route[1]! });
    const spec = layer.getPath();
    expect(spec.mid).toBeDefined();
    const bounds = layer.getBounds();
    expect(bounds.contains([route[0]!.lat, route[0]!.lng])).toBe(true);
    expect(bounds.contains([route[1]!.lat, route[1]!.lng])).toBe(true);
  });

  it('honors an explicit mid point, including v1 [lat, lng] arrays', () => {
    const layer = new BezierPath({ from: route[0]!, to: route[1]!, mid: [10, 100] });
    expect(layer.getPath().mid).toEqual({ lat: 10, lng: 100 });
  });

  it('produces cubic control points for curve: "cubic"', () => {
    const layer = new BezierPath({ from: route[0]!, to: route[1]! }, undefined, { curve: 'cubic' });
    expect(layer.getPath().control).toHaveLength(2);
    expect(layer.getPath().mid).toBeUndefined();
  });
});

describe('curvePointsToPath', () => {
  it('builds an SVG path string', () => {
    const d = curvePointsToPath(['M', { x: 1, y: 2 }, 'Q', { x: 3, y: 4 }, { x: 5, y: 6 }]);
    expect(d).toBe('M1,2 Q3,4 5,6 ');
  });

  it('falls back to a no-op path', () => {
    expect(curvePointsToPath([])).toBe('M0 0');
  });
});
