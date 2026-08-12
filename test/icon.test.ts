import { beforeEach, describe, expect, it } from 'vitest';
import { TravelIcon } from '../src/icon';

let root: SVGElement;

beforeEach(() => {
  root = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  document.body.appendChild(root);
});

describe('TravelIcon', () => {
  it('creates a hidden image element with size and class', () => {
    const icon = new TravelIcon(root, { path: 'plane.png', size: [50, 30], className: 'my-plane' }, [40, 40]);
    const img = icon.el.querySelector('image')!;
    expect(img.getAttribute('href')).toBe('plane.png');
    expect(img.getAttribute('width')).toBe('50');
    expect(img.getAttribute('height')).toBe('30');
    expect(img.getAttribute('class')).toBe('my-plane');
    expect(icon.el.style.visibility).toBe('hidden');
  });

  it('accepts a single number size and the v1 "class" option', () => {
    const icon = new TravelIcon(root, { path: 'p.png', size: 24, class: 'legacy' }, [40, 40]);
    const img = icon.el.querySelector('image')!;
    expect(img.getAttribute('width')).toBe('24');
    expect(img.getAttribute('height')).toBe('24');
    expect(img.getAttribute('class')).toBe('legacy');
  });

  it('falls back to the provided size when none given', () => {
    const icon = new TravelIcon(root, { path: 'p.png' }, [35, 45]);
    const img = icon.el.querySelector('image')!;
    expect(img.getAttribute('width')).toBe('35');
    expect(img.getAttribute('height')).toBe('45');
  });

  it('renders inline SVG markup', () => {
    const icon = new TravelIcon(root, { svg: '<svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z"/></svg>', size: 26 }, [40, 40]);
    const inner = icon.el.firstElementChild!;
    expect(inner.tagName.toLowerCase()).toBe('svg');
    expect(inner.getAttribute('width')).toBe('26');
  });

  it('positions with tangent rotation offset by -90 (v1 convention)', () => {
    const icon = new TravelIcon(root, { path: 'p.png', size: 20 }, [40, 40]);
    icon.setPosition(100, 50, 90);
    expect(icon.el.getAttribute('transform')).toBe(
      'translate(100 50) scale(1) rotate(0) translate(-10 -10)',
    );
  });

  it('honors rotate: false and rotationOffset', () => {
    const fixed = new TravelIcon(root, { path: 'p.png', size: 20, rotate: false }, [40, 40]);
    fixed.setPosition(0, 0, 45);
    expect(fixed.el.getAttribute('transform')).toContain('rotate(0)');

    const offset = new TravelIcon(root, { path: 'p.png', size: 20, rotationOffset: 90 }, [40, 40]);
    offset.setPosition(0, 0, 45);
    expect(offset.el.getAttribute('transform')).toContain('rotate(45)');
  });

  it('reapplies the last position when zoom scale changes', () => {
    const icon = new TravelIcon(root, { path: 'p.png', size: 20, scaleWithZoom: true }, [40, 40]);
    icon.setPosition(10, 20, 90);
    icon.setZoomScale(2);
    expect(icon.el.getAttribute('transform')).toBe(
      'translate(10 20) scale(2) rotate(0) translate(-10 -10)',
    );
  });

  it('show, hide and remove manage the element lifecycle', () => {
    const icon = new TravelIcon(root, { path: 'p.png' }, [40, 40]);
    icon.show();
    expect(icon.el.style.visibility).toBe('visible');
    icon.hide();
    expect(icon.el.style.visibility).toBe('hidden');
    icon.remove();
    expect(root.contains(icon.el)).toBe(false);
  });
});
