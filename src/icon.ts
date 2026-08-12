const SVG_NS = 'http://www.w3.org/2000/svg';
const XLINK_NS = 'http://www.w3.org/1999/xlink';

export interface TravelIconOptions {
  /** Image URL (png/svg file), as in v1. */
  path?: string;
  /** Inline SVG markup used instead of an image URL. */
  svg?: string;
  /** Pixel size, one number or [width, height]. Falls back to the v1 heuristic. */
  size?: number | [number, number];
  /** Rotate along the path tangent. Default true. */
  rotate?: boolean;
  /**
   * Degrees added to the tangent rotation. Default 0, which assumes the icon
   * artwork points up (v1 convention). Use e.g. -90 for artwork pointing right.
   */
  rotationOffset?: number;
  /** Scale the icon with map zoom. Default false. */
  scaleWithZoom?: boolean;
  /** Hide the icon when the animation ends. Default false. */
  hideOnEnd?: boolean;
  className?: string;
  /** @deprecated v1 name, use className. */
  class?: string;
}

/** A native SVG icon that travels along the bezier path inside the overlay pane. */
export class TravelIcon {
  readonly el: SVGGElement;

  private readonly w: number;
  private readonly h: number;
  private zoomScale = 1;
  private last: { x: number; y: number; angle: number } | null = null;

  constructor(
    root: SVGElement,
    private opts: TravelIconOptions,
    fallbackSize: [number, number],
  ) {
    const size = opts.size ?? fallbackSize;
    [this.w, this.h] = typeof size === 'number' ? [size, size] : size;

    const g = document.createElementNS(SVG_NS, 'g');
    let inner: SVGElement | null = null;
    if (opts.svg) {
      g.innerHTML = opts.svg;
      inner = g.firstElementChild as SVGElement | null;
    } else if (opts.path) {
      const img = document.createElementNS(SVG_NS, 'image');
      img.setAttribute('href', opts.path);
      img.setAttributeNS(XLINK_NS, 'href', opts.path);
      g.appendChild(img);
      inner = img;
    }
    if (inner) {
      inner.setAttribute('width', String(this.w));
      inner.setAttribute('height', String(this.h));
      const cls = opts.className ?? opts.class;
      if (cls) inner.setAttribute('class', cls);
    }
    g.style.visibility = 'hidden';
    root.appendChild(g);
    this.el = g;
  }

  setPosition(x: number, y: number, angleDeg: number): void {
    this.last = { x, y, angle: angleDeg };
    // +90 maps the tangent angle (atan2, screen coords) onto up-pointing artwork
    const rotate = this.opts.rotate === false ? 0 : angleDeg + 90 + (this.opts.rotationOffset ?? 0);
    this.el.setAttribute(
      'transform',
      `translate(${x} ${y}) scale(${this.zoomScale}) rotate(${rotate}) translate(${-this.w / 2} ${-this.h / 2})`,
    );
  }

  setZoomScale(scale: number): void {
    this.zoomScale = scale;
    if (this.last) this.setPosition(this.last.x, this.last.y, this.last.angle);
  }

  show(): void {
    this.el.style.visibility = 'visible';
  }

  hide(): void {
    this.el.style.visibility = 'hidden';
  }

  remove(): void {
    this.el.remove();
  }
}
