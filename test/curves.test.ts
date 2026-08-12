import { describe, expect, it } from 'vitest';
import { arcMidPoint, cubicControlPoints, quadraticMidPoint } from '../src/curves';

const colombo = { lat: 7.8731, lng: 80.7718 };
const sydney = { lat: -25.2744, lng: 133.7751 };

describe('quadraticMidPoint', () => {
  it('matches the v1 getMidPoint math', () => {
    // v1 reference values computed with the original polar-offset formula
    const offset = 3.14 / 4;
    const dx = sydney.lng - colombo.lng;
    const dy = sydney.lat - colombo.lat;
    const r = Math.sqrt(dx * dx + dy * dy) / 2 / Math.cos(offset);
    const theta = Math.atan2(dy, dx) + offset;
    const expected = {
      lat: r * Math.sin(theta) + colombo.lat,
      lng: r * Math.cos(theta) + colombo.lng,
    };

    const mid = quadraticMidPoint(colombo, sydney, 4, 'LEFT_ROUND');
    expect(mid.lat).toBeCloseTo(expected.lat, 10);
    expect(mid.lng).toBeCloseTo(expected.lng, 10);
  });

  it('mirrors the bow for RIGHT_ROUND', () => {
    const left = quadraticMidPoint(colombo, sydney, 4, 'LEFT_ROUND');
    const right = quadraticMidPoint(colombo, sydney, 4, 'RIGHT_ROUND');
    expect(left.lat).not.toBeCloseTo(right.lat, 3);
  });

  it('falls back to deep 4 for 0 or invalid deep', () => {
    expect(quadraticMidPoint(colombo, sydney, 0)).toEqual(quadraticMidPoint(colombo, sydney, 4));
    expect(quadraticMidPoint(colombo, sydney, Number('x'))).toEqual(
      quadraticMidPoint(colombo, sydney, 4),
    );
  });
});

describe('arcMidPoint', () => {
  it('bows toward the pole of the hemisphere the route sits in', () => {
    const north = arcMidPoint({ lat: 40, lng: -70 }, { lat: 50, lng: 10 });
    expect(north.lat).toBeGreaterThan(50);

    const south = arcMidPoint({ lat: -30, lng: 20 }, { lat: -35, lng: 140 });
    expect(south.lat).toBeLessThan(-35);
  });
});

describe('cubicControlPoints', () => {
  it('degree-elevates the quadratic exactly', () => {
    const from = { lat: 0, lng: 0 };
    const to = { lat: 0, lng: 30 };
    const mid = { lat: 15, lng: 15 };
    const [c1, c2] = cubicControlPoints(from, to, mid);
    expect(c1).toEqual({ lat: 10, lng: 10 });
    expect(c2).toEqual({ lat: 10, lng: 20 });
  });
});
