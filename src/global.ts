// IIFE entry for script-tag users: attaches L.bezier like v1.
import { BezierPath, bezier } from './index';

const L = (globalThis as any).L;
if (L) {
  L.bezier = bezier;
  L.BezierPath = BezierPath;
}

export * from './index';
