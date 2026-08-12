import { LayerGroup } from 'leaflet';
import {
  BezierPath,
  normalizeOptions,
  type BezierLayer,
  type BezierOptions,
  type BezierSegmentSpec,
  type BezierWaypoint,
} from './bezier-path';
import type { TravelIconOptions } from './icon';

export interface BezierConfig {
  /** One or more routes; each route is a list of stops split into curved segments. */
  path: BezierWaypoint[][];
  icon?: TravelIconOptions;
}

/**
 * Build a group of animated bezier segments from multi-stop routes.
 * Same signature as v1: L.bezier({path, icon}, options).
 */
export function bezier(config: BezierConfig, options: BezierOptions = {}): LayerGroup {
  const layers: BezierLayer[] = [];
  for (const route of config.path ?? []) {
    for (let i = 1; i < route.length; i++) {
      layers.push(new BezierPath({ from: route[i - 1]!, to: route[i]! }, config.icon, options));
    }
  }
  return new LayerGroup(layers as any);
}

export { BezierPath, normalizeOptions };
export { curvePointsToPath } from './bezier-path';
export type { BezierLayer, BezierOptions, BezierSegmentSpec, BezierWaypoint, TravelIconOptions };
export { quadraticMidPoint, arcMidPoint, cubicControlPoints } from './curves';
export type { CurveSide, LatLngLike } from './curves';
export { PathAnimator, easings, flightEasing } from './animation';
export type { Easing, EasingName } from './animation';
export { TravelIcon } from './icon';
