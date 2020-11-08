L.SVG.include({
  _updateCurve(layer: any): any {
    const svg_path = this._curvePointsToPath(layer._points);
    this._setPath(layer, svg_path);

    if (layer.options.animate) {
      const path = layer._path;
      const length = path.getTotalLength();

      if (!layer.options.dashArray) {
        path.style.strokeDasharray = `${length} ${length}`;
      }

      if (layer._initialUpdate) {
        path.animate([
          { strokeDashoffset: length },
          { strokeDashoffset: 0 },
        ], layer.options.animate);
        layer._initialUpdate = false;
      }
    }

    return svg_path;
  },
  _curvePointsToPath(points: any): any {
    let point; let curCommand; let
      str = '';
    for (let i = 0; i < points.length; i++) {
      point = points[i];
      if (typeof point === 'string' || point instanceof String) {
        curCommand = point;
        str += curCommand;
      } else { str += `${point.x},${point.y} `; }
    }
    return str || 'M0 0';
  },
});

const Bezier = L.Path.extend({
  options: {},
  initialize(path: any, icon: any, options: {}) {
    if (!path.mid || path.mid[0] === undefined) {
      path.mid = this.getMidPoint(
        path.from,
        path.to,
        (path.from.deep ? path.from.deep : 4),
        path.from.slide,
      );
    }

    L.setOptions(this, options);
    this._initialUpdate = true;
    this.setPath(path);
    this.icon = icon;
  },
  onAdd(map: any) {
    this._renderer._initPath(this);
    this._reset();
    this._renderer._addPath(this);

    // TODO adjust plane according to zoom
    map.on('zoom', () => {

    });
  },
  onRemove() {
    if (this.spaceship_img) { this.spaceship_img.remove(); }

    this._renderer._removePath(this);
  },
  setAnimatePlane(path: any) {
    const self = this;

    if (this.spaceship_img) { this.spaceship_img.remove(); }

    const SnapSvg = Snap('.leaflet-overlay-pane>svg');

    const spaceship_img = this.spaceship_img = SnapSvg.image(this.icon.path).attr({
      visibility: 'hidden',
    });

    const spaceship = SnapSvg.group(spaceship_img);
    const flightPath = SnapSvg.path(path).attr({
      fill: 'none',
      stroke: 'none',
    });

    const fullPathLength = Snap.path.getTotalLength(flightPath);
    let destinationPathLength = fullPathLength / 2; // default half

    if (this.options.iconTravelLength && !isNaN(parseFloat(this.options.iconTravelLength))) {
      destinationPathLength = fullPathLength * parseFloat(this.options.iconTravelLength);
    }

    const halfPathLength = (destinationPathLength) - (destinationPathLength / (this.options.easeOutPiece ? this.options.easeOutPiece : 50));

    let width = halfPathLength / this._map.getZoom();
    let height = halfPathLength / this._map.getZoom();

    width = Math.min(Math.max(width, 30), this.options.iconMaxWidth ? this.options.iconMaxWidth : 50);
    height = Math.min(Math.max(height, 30), this.options.iconMaxHeight ? this.options.iconMaxHeight : 50);

    const fullAnimatedTime = this.options.fullAnimatedTime ? this.options.fullAnimatedTime : 7000;
    const easeOutTime = this.options.easeOutTime ? this.options.easeOutTime : 2500;

    let lastStep = 0;
    Snap.animate(0, halfPathLength, (step) => {
      // show image when plane start to animate
      spaceship_img.attr({
        visibility: 'visible',
      });

      spaceship_img.attr({ width, height, class: self.icon.class });
      lastStep = step;

      const moveToPoint = Snap.path.getPointAtLength(flightPath, step);

      const x = moveToPoint.x - (width / 2);
      const y = moveToPoint.y - (height / 2);

      spaceship.transform(`translate(${x},${y}) rotate(${moveToPoint.alpha - 90}, ${width / 2}, ${height / 2})`);
    }, easeOutTime, mina.easeout, () => {
      Snap.animate(halfPathLength, destinationPathLength, (step) => {
        lastStep = step;
        const moveToPoint = Snap.path.getPointAtLength(flightPath, step);

        const x = moveToPoint.x - width / 2;
        const y = moveToPoint.y - height / 2;
        spaceship.transform(`translate(${x},${y}) rotate(${moveToPoint.alpha - 90}, ${width / 2}, ${height / 2})`);
      }, fullAnimatedTime, mina.easein, () => {
        // done
      });
    });
  },
  getPath(): any {
    return this._coords;
  },
  setPath(path: any): any {
    this._setPath(path);
    return this.redraw();
  },
  getBounds(): any {
    return this._bounds;
  },
  getMidPoint(from: any, to: any, deep: any, round_side: string = 'LEFT_ROUND') {
    let offset = 3.14;

    if (round_side === 'RIGHT_ROUND') {
      offset *= -1;
    }

    const latlng1 = from;
    const latlng2 = to;

    const offsetX = latlng2.lng - latlng1.lng;
    const offsetY = latlng2.lat - latlng1.lat;

    const r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2));
    const theta = Math.atan2(offsetY, offsetX);

    const thetaOffset = (offset / (deep || 4));

    const r2 = (r / 2) / (Math.cos(thetaOffset));
    const theta2 = theta + thetaOffset;

    const midpointX = (r2 * Math.cos(theta2)) + latlng1.lng;
    const midpointY = (r2 * Math.sin(theta2)) + latlng1.lat;

    return [midpointY, midpointX];
  },
  _setPath(path: any) {
    this._coords = path;
    this._bounds = this._computeBounds();
  },
  _computeBounds(): any {
    const bound = new L.LatLngBounds();

    bound.extend(this._coords.from);
    bound.extend(this._coords.to);// for single destination
    bound.extend(this._coords.mid);

    return bound;
  },
  getCenter(): any {
    return this._bounds.getCenter();
  },
  _update() {
    if (!this._map) {
      return;
    }
    this._updatePath();
  },
  _updatePath() {
    // animated plane
    const path = this._renderer._updateCurve(this);
    this.setAnimatePlane(path);
  },
  _project() {
    this._points = [];

    this._points.push('M');

    let curPoint = this._map.latLngToLayerPoint(this._coords.from);
    this._points.push(curPoint);

    if (this._coords.mid) {
      this._points.push('Q');
      curPoint = this._map.latLngToLayerPoint(this._coords.mid);
      this._points.push(curPoint);
    }
    curPoint = this._map.latLngToLayerPoint(this._coords.to);
    this._points.push(curPoint);
  },
});

L.bezier = (config: {}, options: {}) => {
  const paths = [];
  for (let i = 0; config.path.length > i; i++) {
    let lastDestination = false;
    for (let c = 0; config.path[i].length > c; c++) {
      const currentDestination = config.path[i][c];
      if (lastDestination) {
        const path_pair = { from: lastDestination, to: currentDestination };
        paths.push(new Bezier(path_pair, config.icon, options));
      }
      lastDestination = config.path[i][c];
    }
  }
  return L.layerGroup(paths);
};
