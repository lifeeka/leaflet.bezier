import { LatLngBounds, Path, SVG, Util } from 'leaflet';
import type { LatLng, LatLngBounds as LatLngBoundsType, Map as LeafletMap, PathOptions } from 'leaflet';
import {
  arcMidPoint,
  cubicControlPoints,
  quadraticMidPoint,
  type CurveSide,
  type LatLngLike,
} from './curves';
import {
  PathAnimator,
  flightEasing,
  resolveEasing,
  type Easing,
  type EasingName,
} from './animation';
import { TravelIcon, type TravelIconOptions } from './icon';

export interface BezierOptions extends PathOptions {
  /** Curve shape. Default 'quadratic' (v1 behavior). */
  curve?: 'quadratic' | 'cubic' | 'arc';
  /** Bow strength for computed curves, smaller = deeper. Default 4. */
  deep?: number;
  /** Which side computed curves bow toward. */
  slide?: CurveSide;
  /** Dash-draw animation of the line itself: ms or Web Animations options. */
  animate?: number | KeyframeAnimationOptions;
  /** Icon travel time in ms. Default 9500. */
  duration?: number;
  /** Easing name or custom function. Default 'flight' (v1 feel). */
  easing?: EasingName | Easing;
  /** true = loop forever, n = play n times. */
  loop?: boolean | number;
  /** Start the icon animation on add. Default true. */
  autoplay?: boolean;
  /** Fraction of the path the icon travels, 0..1. Default 0.5 (v1 default). */
  travel?: number;

  /** @deprecated use `duration`. */
  fullAnimatedTime?: number;
  /** @deprecated use `duration` / `easing`. */
  easeOutTime?: number;
  /** @deprecated use `easing`. */
  easeOutPiece?: number;
  /** @deprecated use `travel`. */
  iconTravelLength?: number | string;
  /** @deprecated use `icon.size`. */
  iconMaxWidth?: number;
  /** @deprecated use `icon.size`. */
  iconMaxHeight?: number;
}

export interface BezierWaypoint extends LatLngLike {
  deep?: number | string;
  slide?: CurveSide;
  /** Explicit quadratic control point for the segment starting at this point. */
  mid?: LatLngLike | [number, number];
  /** Explicit cubic control points for the segment starting at this point. */
  control?: [LatLngLike | [number, number], LatLngLike | [number, number]];
}

export interface BezierSegmentSpec {
  from: BezierWaypoint;
  to: BezierWaypoint;
  mid?: LatLngLike | [number, number];
  control?: [LatLngLike | [number, number], LatLngLike | [number, number]];
}

const warned = new Set<string>();
function deprecate(name: string, hint: string): void {
  if (warned.has(name)) return;
  warned.add(name);
  console.warn(`leaflet.bezier: option "${name}" is deprecated, ${hint}.`);
}

const toLatLng = (p: LatLngLike | [number, number]): LatLngLike =>
  Array.isArray(p) ? { lat: p[0], lng: p[1] } : p;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

/** Map v1 option names onto their v2 equivalents. */
export function normalizeOptions(options: BezierOptions = {}): BezierOptions {
  const o = { ...options };

  if (o.iconTravelLength != null) {
    deprecate('iconTravelLength', 'use "travel"');
    const travel = parseFloat(String(o.iconTravelLength));
    if (o.travel == null && !Number.isNaN(travel)) o.travel = travel;
  }
  if (o.fullAnimatedTime != null || o.easeOutTime != null) {
    deprecate(o.fullAnimatedTime != null ? 'fullAnimatedTime' : 'easeOutTime', 'use "duration" and "easing"');
    const takeoff = o.easeOutTime ?? 2500;
    const cruise = o.fullAnimatedTime ?? 7000;
    if (o.duration == null) o.duration = takeoff + cruise;
    if (o.easing == null) {
      const piece = Number(o.easeOutPiece) || 4;
      o.easing = flightEasing(1 - 1 / piece, takeoff / (takeoff + cruise));
    }
  }
  if (o.easeOutPiece != null) deprecate('easeOutPiece', 'use "easing"');
  if (o.iconMaxWidth != null || o.iconMaxHeight != null) {
    deprecate(o.iconMaxWidth != null ? 'iconMaxWidth' : 'iconMaxHeight', 'use "icon.size"');
  }

  return o;
}

type ProjectedPoint = { x: number; y: number };

export function curvePointsToPath(points: Array<string | ProjectedPoint>): string {
  let d = '';
  for (const point of points) {
    d += typeof point === 'string' ? point : `${point.x},${point.y} `;
  }
  return d || 'M0 0';
}

SVG.include({
  _updateCurve(layer: any): string {
    const d = curvePointsToPath(layer._points);
    (this as any)._setPath(layer, d);

    const el: SVGPathElement | undefined = layer._path;
    if (layer.options.animate && el) {
      const length = el.getTotalLength();
      if (!layer.options.dashArray) {
        el.style.strokeDasharray = `${length} ${length}`;
      }
      if (layer._initialUpdate) {
        el.animate(
          [{ strokeDashoffset: String(length) }, { strokeDashoffset: '0' }],
          layer.options.animate,
        );
        layer._initialUpdate = false;
      }
    }
    return d;
  },
});

export interface BezierLayer {
  options: BezierOptions;
  /** Resolves when the icon animation completes (never for infinite loops). */
  finished: Promise<void>;
  play(): this;
  pause(): this;
  stop(): this;
  reverse(): this;
  setSpeed(speed: number): this;
  getPath(): BezierSegmentSpec;
  setPath(spec: BezierSegmentSpec): this;
  getBounds(): LatLngBoundsType;
  getCenter(): LatLng;
  addTo(map: LeafletMap): this;
  remove(): this;
  on(type: string, fn: (e: any) => void): this;
  off(type: string, fn?: (e: any) => void): this;
  fire(type: string, data?: any): this;
  bindPopup(content: any, options?: any): this;
  bindTooltip(content: any, options?: any): this;
  setStyle(style: PathOptions): this;
  redraw(): this;
}

export const BezierPath = Path.extend({
  options: {
    curve: 'quadratic',
    duration: 9500,
    travel: 0.5,
    autoplay: true,
  },

  initialize(this: any, spec: BezierSegmentSpec, icon?: TravelIconOptions, options?: BezierOptions) {
    Util.setOptions(this, normalizeOptions(options));
    this._iconSpec = icon;
    this._initialUpdate = true;
    this._lastEased = 0;
    this.finished = new Promise<void>((resolve) => {
      this._resolveFinished = resolve;
    });
    this._setSpec(spec);
  },

  onAdd(this: any, map: LeafletMap) {
    (Path.prototype as any).onAdd.call(this, map);
    this._baseZoom = map.getZoom();
    map.on('zoomend', this._onZoomEnd, this);
    this._initIcon();
    if (this.options.autoplay !== false) this.play();
  },

  onRemove(this: any, map: LeafletMap) {
    map.off('zoomend', this._onZoomEnd, this);
    this._animator?.pause();
    this._animator = null;
    this._icon?.remove();
    this._icon = null;
    (Path.prototype as any).onRemove.call(this, map);
  },

  // ---- animation control

  play(this: any) {
    if (this._animator && !this._animator.playing) {
      if (this._animator.progress === 0) this.fire('animationstart');
      this._animator.play();
    }
    return this;
  },

  pause(this: any) {
    this._animator?.pause();
    return this;
  },

  stop(this: any) {
    this._animator?.stop();
    return this;
  },

  reverse(this: any) {
    this._animator?.reverse();
    return this;
  },

  setSpeed(this: any, speed: number) {
    this._animator?.setSpeed(speed);
    return this;
  },

  // ---- path accessors

  getPath(this: any): BezierSegmentSpec {
    return this._spec;
  },

  setPath(this: any, spec: BezierSegmentSpec) {
    this._setSpec(spec);
    return this.redraw();
  },

  getBounds(this: any) {
    return this._bounds;
  },

  getCenter(this: any) {
    return this._bounds.getCenter();
  },

  // ---- internals

  _setSpec(this: any, spec: BezierSegmentSpec) {
    const opts: BezierOptions = this.options;
    const from = spec.from;
    const to = spec.to;
    const next: any = { from, to };

    const control = spec.control ?? from.control;
    let mid = spec.mid ?? from.mid;
    if (mid) mid = toLatLng(mid);

    if (control) {
      next.control = [toLatLng(control[0]), toLatLng(control[1])];
    } else {
      if (!mid) {
        mid =
          opts.curve === 'arc'
            ? arcMidPoint(from, to, Number(from.deep ?? opts.deep) || 5)
            : quadraticMidPoint(from, to, Number(from.deep ?? opts.deep) || 4, from.slide ?? opts.slide);
      }
      if (opts.curve === 'cubic') {
        next.control = cubicControlPoints(from, to, mid as LatLngLike);
      } else {
        next.mid = mid;
      }
    }

    this._spec = next;

    const bounds = new LatLngBounds([]);
    bounds.extend(from as any);
    bounds.extend(to as any);
    if (next.mid) bounds.extend(next.mid);
    if (next.control) {
      bounds.extend(next.control[0]);
      bounds.extend(next.control[1]);
    }
    this._bounds = bounds;
  },

  _project(this: any) {
    const lp = (p: LatLngLike) => this._map.latLngToLayerPoint(p);
    const points: Array<string | ProjectedPoint> = ['M', lp(this._spec.from)];
    if (this._spec.control) {
      points.push('C', lp(this._spec.control[0]), lp(this._spec.control[1]));
    } else if (this._spec.mid) {
      points.push('Q', lp(this._spec.mid));
    }
    points.push(lp(this._spec.to));
    this._points = points;
  },

  _update(this: any) {
    if (!this._map) return;
    this._updatePath();
  },

  _updatePath(this: any) {
    this._renderer._updateCurve(this);
    // keep the icon glued to the redrawn path on zoom/pan instead of restarting (v1 bug)
    this._positionIcon(this._lastEased);
  },

  _onZoomEnd(this: any) {
    if (this._icon && this._iconSpec?.scaleWithZoom) {
      this._icon.setZoomScale(2 ** (this._map.getZoom() - this._baseZoom));
    }
  },

  _initIcon(this: any) {
    if (!this._iconSpec || this._icon || !this._renderer?._container) return;

    this._icon = new TravelIcon(this._renderer._container, this._iconSpec, this._fallbackIconSize());
    this._animator = new PathAnimator({
      duration: this.options.duration ?? 9500,
      easing: resolveEasing(this.options.easing),
      loop: this.options.loop,
      onFrame: (progress: number) => {
        this._icon?.show();
        this._positionIcon(progress);
      },
      onLoop: () => this.fire('loop'),
      onEnd: () => {
        if (this._iconSpec?.hideOnEnd) this._icon?.hide();
        this.fire('animationend');
        this._resolveFinished();
      },
    });
  },

  /** v1 sizing heuristic, used only when no explicit icon.size is given. */
  _fallbackIconSize(this: any): [number, number] {
    let size: [number, number] = [40, 40];
    const el: SVGPathElement | undefined = this._path;
    try {
      if (el && typeof el.getTotalLength === 'function') {
        const travelLength = el.getTotalLength() * (this.options.travel ?? 0.5);
        const base = (travelLength - travelLength / 4) / Math.max(this._map.getZoom(), 1);
        size = [
          clamp(base, 30, this.options.iconMaxWidth ?? 50),
          clamp(base, 30, this.options.iconMaxHeight ?? 50),
        ];
      }
    } catch {
      // non-rendering environments (jsdom) have no path geometry
    }
    return size;
  },

  _positionIcon(this: any, eased: number) {
    this._lastEased = eased;
    const el: SVGPathElement | undefined = this._path;
    if (!el || !this._icon || typeof el.getTotalLength !== 'function') return;

    const total = el.getTotalLength();
    if (!total) return;

    const length = eased * (this.options.travel ?? 0.5) * total;
    const point = el.getPointAtLength(length);
    const aheadLength = Math.min(length + 1, total);
    let angle = 0;
    if (aheadLength > length) {
      const ahead = el.getPointAtLength(aheadLength);
      angle = (Math.atan2(ahead.y - point.y, ahead.x - point.x) * 180) / Math.PI;
    } else if (length > 0) {
      const behind = el.getPointAtLength(length - 1);
      angle = (Math.atan2(point.y - behind.y, point.x - behind.x) * 180) / Math.PI;
    }

    this._icon.setPosition(point.x, point.y, angle);
    this.fire('iconmove', {
      latlng: this._map.layerPointToLatLng([point.x, point.y]),
      pixelPoint: { x: point.x, y: point.y },
      progress: eased,
    });
  },
}) as unknown as new (
  spec: BezierSegmentSpec,
  icon?: TravelIconOptions,
  options?: BezierOptions,
) => BezierLayer;
