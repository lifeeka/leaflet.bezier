<p align="center"><img src="https://raw.githubusercontent.com/lifeeka/leaflet.bezier/master/logo.png"></p>

## Leaflet Bezier

Animated bezier curves (flight paths) for [Leaflet](https://leafletjs.com/), with an icon that travels along the curve.

- TypeScript, zero runtime dependencies (Snap.svg removed in v2)
- Works with Leaflet 1.3+
- ESM, CommonJS and script-tag builds
- Animation control API: play, pause, stop, reverse, speed, loop
- Quadratic, cubic and automatic arc curves
- Interactive paths: popups, tooltips, click events

![demo](https://raw.githubusercontent.com/lifeeka/leaflet.bezier/master/demo/demo.gif)

### Installation

```
npm i leaflet.bezier
```

### Usage

```js
import { bezier } from 'leaflet.bezier';

const flights = bezier({
    path: [
        [
            {lat: 7.8731, lng: 80.7718},
            {lat: -18.7669, lng: 46.8691},
        ]
    ],
    icon: {
        path: 'plane.png',
        size: 40,
    }
}, {
    color: 'rgb(145, 146, 150)',
    dashArray: '8',
    weight: 1,
    animate: 2000,   // dash-draw the line over 2s
    duration: 9500,  // icon travel time
    travel: 1,       // icon travels the full path
    loop: true,
}).addTo(map);
```

With a script tag (attaches `L.bezier`, same as v1):

```html
<script src="https://unpkg.com/leaflet"></script>
<script src="https://unpkg.com/leaflet.bezier"></script>
<script>
    L.bezier({ path: [...], icon: {...} }, options).addTo(map);
</script>
```

### Path

`path` is a list of routes; each route is a list of stops. Every consecutive pair becomes one curved segment. Per-stop properties tune the segment starting there:

```js
{lat: 7.8731, lng: 80.7718, slide: 'RIGHT_ROUND', deep: 8}
{lat: 7.8731, lng: 80.7718, mid: {lat: 20, lng: 60}}          // explicit control point
{lat: 7.8731, lng: 80.7718, control: [{...}, {...}]}          // explicit cubic controls
```

### Options

All [Leaflet Path options](https://leafletjs.com/reference.html#path) (color, weight, dashArray, opacity, ...) plus:

| Option | Default | Description |
|---|---|---|
| `curve` | `'quadratic'` | `'quadratic'`, `'cubic'` or `'arc'` (auto bow toward the nearer pole) |
| `deep` | `4` | Bow strength for computed curves, smaller = deeper |
| `slide` | `'LEFT_ROUND'` | Side the curve bows toward, `'LEFT_ROUND'` or `'RIGHT_ROUND'` |
| `animate` | off | Dash-draw animation of the line: ms or Web Animations options |
| `duration` | `9500` | Icon travel time in ms |
| `easing` | `'flight'` | `'flight'`, `'linear'`, `'easeIn'`, `'easeOut'`, `'easeInOut'` or a custom `(t) => t` function |
| `travel` | `0.5` | Fraction of the path the icon travels, 0..1 |
| `loop` | off | `true` = loop forever, `n` = play n times |
| `autoplay` | `true` | Start the icon animation when added to the map |

### Icon

| Option | Default | Description |
|---|---|---|
| `path` | | Image URL |
| `svg` | | Inline SVG markup instead of an image |
| `size` | v1 heuristic | Pixel size, number or `[width, height]` |
| `rotate` | `true` | Rotate along the path tangent |
| `rotationOffset` | `0` | Degrees added to the rotation (artwork assumed pointing up) |
| `scaleWithZoom` | `false` | Scale the icon with map zoom |
| `hideOnEnd` | `false` | Hide the icon when the animation ends |
| `className` | | CSS class for the icon element |

### Animation API

`bezier()` returns a `LayerGroup` of `BezierPath` layers:

```js
flights.eachLayer((flight) => {
    flight.pause();
    flight.play();
    flight.stop();          // rewind to start
    flight.reverse();
    flight.setSpeed(2);
    flight.bindPopup('Colombo to Antananarivo');

    flight.on('animationstart', ...);
    flight.on('iconmove', ({latlng, pixelPoint, progress}) => ...);
    flight.on('animationend', ...);
    flight.on('loop', ...);

    await flight.finished;  // resolves when the animation completes
});
```

### Migrating from v1

The v1 signature `L.bezier({path, icon}, options)` still works. Old option names are mapped automatically (with a console deprecation notice):

| v1 | v2 |
|---|---|
| `fullAnimatedTime`, `easeOutTime`, `easeOutPiece` | `duration` + `easing: 'flight'` |
| `iconTravelLength` | `travel` |
| `iconMaxWidth`, `iconMaxHeight` | `icon.size` |
| `icon.class` | `icon.className` |

Snap.svg is no longer needed; remove its script tag.

### Demo

```
npm install
npm run dev
```

### License

This project is licensed under the MIT License
