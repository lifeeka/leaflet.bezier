export interface LatLngLike {
  lat: number;
  lng: number;
}

export type CurveSide = 'LEFT_ROUND' | 'RIGHT_ROUND';

/**
 * Quadratic control point offset sideways from the from->to chord.
 * `deep` controls how strong the bow is (smaller = deeper), `side` which way it bows.
 */
export function quadraticMidPoint(
  from: LatLngLike,
  to: LatLngLike,
  deep = 4,
  side: CurveSide = 'LEFT_ROUND',
): LatLngLike {
  let offset = 3.14;
  if (side === 'RIGHT_ROUND') {
    offset *= -1;
  }

  const offsetX = to.lng - from.lng;
  const offsetY = to.lat - from.lat;

  const r = Math.sqrt(offsetX * offsetX + offsetY * offsetY);
  const theta = Math.atan2(offsetY, offsetX);

  const thetaOffset = offset / (Number(deep) || 4);

  const r2 = r / 2 / Math.cos(thetaOffset);
  const theta2 = theta + thetaOffset;

  return {
    lat: r2 * Math.sin(theta2) + from.lat,
    lng: r2 * Math.cos(theta2) + from.lng,
  };
}

/** Automatic bow toward the nearer pole, a great-circle-flavored arc. */
export function arcMidPoint(from: LatLngLike, to: LatLngLike, deep = 5): LatLngLike {
  const left = quadraticMidPoint(from, to, deep, 'LEFT_ROUND');
  const right = quadraticMidPoint(from, to, deep, 'RIGHT_ROUND');
  const northern = (from.lat + to.lat) / 2 >= 0;
  const poleward = left.lat >= right.lat ? left : right;
  const equatorward = poleward === left ? right : left;
  return northern ? poleward : equatorward;
}

/**
 * Degree-elevate a quadratic curve (from, mid, to) to its exact cubic form:
 * c1 = from + 2/3 (mid - from), c2 = to + 2/3 (mid - to).
 */
export function cubicControlPoints(
  from: LatLngLike,
  to: LatLngLike,
  mid: LatLngLike,
): [LatLngLike, LatLngLike] {
  return [
    {
      lat: from.lat + (2 / 3) * (mid.lat - from.lat),
      lng: from.lng + (2 / 3) * (mid.lng - from.lng),
    },
    {
      lat: to.lat + (2 / 3) * (mid.lat - to.lat),
      lng: to.lng + (2 / 3) * (mid.lng - to.lng),
    },
  ];
}
