import 'leaflet/dist/leaflet.css';
import { map as createMap, tileLayer, type LayerGroup } from 'leaflet';
import { bezier, type BezierLayer, type BezierWaypoint } from '../src/index';

const map = createMap('map', { zoomControl: false }).setView([15, 100], 3);

tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
}).addTo(map);

const plane = (color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="${color}">
     <path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/>
   </svg>`;

const colombo = { lat: 7.8731, lng: 80.7718 };

const routes: { path: BezierWaypoint[]; color: string }[] = [
  {
    color: '#00e5ff',
    path: [
      { ...colombo, slide: 'RIGHT_ROUND' },
      { lat: -25.2744, lng: 133.7751, slide: 'LEFT_ROUND' }, // Australia
      { lat: 36.2048, lng: 138.2529 }, // Japan
    ],
  },
  { color: '#ffd166', path: [{ ...colombo, slide: 'RIGHT_ROUND' }, { lat: 3.139, lng: 101.6869 }] }, // Malaysia
  { color: '#ef476f', path: [{ ...colombo, slide: 'RIGHT_ROUND', deep: 8 }, { lat: 41.8719, lng: 12.5674 }] }, // Italy
  { color: '#06d6a0', path: [{ lat: -25.2744, lng: 133.7751 }, { lat: -40.9006, lng: 174.886 }] }, // New Zealand
  { color: '#b388ff', path: [{ ...colombo, slide: 'RIGHT_ROUND' }, { lat: -18.7669, lng: 46.8691 }] }, // Madagascar
  { color: '#ff9e40', path: [{ ...colombo }, { lat: 25.2048, lng: 55.2708 }] }, // Dubai
];

const groups: LayerGroup[] = routes.map(({ path, color }) =>
  bezier(
    {
      path: [path],
      icon: { svg: plane(color), size: 26 },
    },
    {
      color,
      dashArray: '6',
      opacity: 0.85,
      weight: 1.5,
      animate: 2000,
      duration: 8000,
      travel: 1,
      easing: 'flight',
      loop: true,
    },
  ).addTo(map),
);

const eachFlight = (fn: (layer: BezierLayer) => void) =>
  groups.forEach((g) => g.eachLayer((layer) => fn(layer as unknown as BezierLayer)));

// exposed for console experiments and demo tooling
(window as unknown as { __demo: unknown }).__demo = { map, groups, eachFlight };

// interactivity: popup per segment
eachFlight((layer) => {
  const { from, to } = layer.getPath();
  layer.bindPopup(
    `Flight ${from.lat.toFixed(1)},${from.lng.toFixed(1)} to ${to.lat.toFixed(1)},${to.lng.toFixed(1)}`,
  );
});

document.getElementById('play')!.onclick = () => eachFlight((l) => l.play());
document.getElementById('pause')!.onclick = () => eachFlight((l) => l.pause());
document.getElementById('stop')!.onclick = () => eachFlight((l) => l.stop());
document.getElementById('reverse')!.onclick = () => eachFlight((l) => l.reverse());
document.getElementById('speed')!.oninput = (e) => {
  const speed = Number((e.target as HTMLInputElement).value);
  eachFlight((l) => l.setSpeed(speed));
};
