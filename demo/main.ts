import 'leaflet/dist/leaflet.css';
import { map as createMap, tileLayer } from 'leaflet';
import { bezier, type BezierLayer } from '../src/index';

const map = createMap('map').setView([6.9270786, 79.861243], 3);

tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
  maxZoom: 18,
  attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
}).addTo(map);

const flights = bezier(
  {
    path: [
      [
        { lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND' }, // Sri Lanka
        { lat: -25.2744, lng: 133.7751, slide: 'LEFT_ROUND' }, // Australia
        { lat: 36.2048, lng: 138.2529 }, // Japan
      ],
      [
        { lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND' },
        { lat: 3.139, lng: 101.6869 }, // Malaysia
      ],
      [
        { lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND', deep: 8 },
        { lat: 41.8719, lng: 12.5674 }, // Italy
      ],
      [
        { lat: -25.2744, lng: 133.7751 },
        { lat: -40.9006, lng: 174.886 }, // New Zealand
      ],
      [
        { lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND' },
        { lat: -18.7669, lng: 46.8691 }, // Madagascar
      ],
    ],
    icon: {
      path: 'plane.png',
      size: 40,
      hideOnEnd: false,
    },
  },
  {
    color: 'rgb(145, 146, 150)',
    dashArray: '8',
    opacity: 0.8,
    weight: 1,
    animate: 2000,
    duration: 9500,
    travel: 1,
    easing: 'flight',
    loop: true,
  },
).addTo(map);

const eachFlight = (fn: (layer: BezierLayer) => void) =>
  flights.eachLayer((layer) => fn(layer as unknown as BezierLayer));

// interactivity: popup per segment
eachFlight((layer) => {
  const { from, to } = layer.getPath();
  layer.bindPopup(`Flight ${from.lat.toFixed(1)},${from.lng.toFixed(1)} to ${to.lat.toFixed(1)},${to.lng.toFixed(1)}`);
});

document.getElementById('play')!.onclick = () => eachFlight((l) => l.play());
document.getElementById('pause')!.onclick = () => eachFlight((l) => l.pause());
document.getElementById('stop')!.onclick = () => eachFlight((l) => l.stop());
document.getElementById('reverse')!.onclick = () => eachFlight((l) => l.reverse());
document.getElementById('speed')!.oninput = (e) => {
  const speed = Number((e.target as HTMLInputElement).value);
  eachFlight((l) => l.setSpeed(speed));
};
