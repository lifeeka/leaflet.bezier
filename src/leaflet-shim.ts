// Used only by the IIFE build: maps "leaflet" imports onto the global L.
const L = (globalThis as any).L;

export const Path = L.Path;
export const SVG = L.SVG;
export const Util = L.Util;
export const LatLngBounds = L.LatLngBounds;
export const LayerGroup = L.LayerGroup;
export default L;
