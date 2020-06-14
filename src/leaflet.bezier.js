L.SVG.include({
    _updateCurve: function (layer) {
        let svg_path = this._curvePointsToPath(layer._points);
        this._setPath(layer, svg_path);

        if (layer.options.animate) {
            let path = layer._path;
            let length = path.getTotalLength();

            if (!layer.options.dashArray) {
                path.style.strokeDasharray = length + ' ' + length;
            }

            if (layer._initialUpdate) {
                path.animate([
                    {strokeDashoffset: length},
                    {strokeDashoffset: 0}
                ], layer.options.animate);
                layer._initialUpdate = false;
            }
        }

        return svg_path;
    },
    _curvePointsToPath: function (points) {
        let point, curCommand, str = '';
        for (let i = 0; i < points.length; i++) {
            point = points[i];
            if (typeof point === 'string' || point instanceof String) {
                curCommand = point;
                str += curCommand;
            } else
                str += point.x + ',' + point.y + ' ';


        }
        return str || 'M0 0';
    },
});

let Bezier = L.Path.extend({
    options: {},
    initialize: function (path, icon, options) {

        if (!path.mid || path.mid[0] === undefined) {
            path.mid = this.getMidPoint(path.from, path.to, (path.from.deep ? path.from.deep : 4), path.from.slide);
        }

        L.setOptions(this, options);
        this._initialUpdate = true;
        this.setPath(path);
        this.icon = icon;

    },
    onAdd: function (map) {
        this._renderer._initPath(this);
        this._reset();
        this._renderer._addPath(this);

        // TODO adjust plane according to zoom
        map.on('zoom', function () {

        });
    },
    onRemove: function() {
        if (this.spaceship_img)
            this.spaceship_img.remove();

        this._renderer._removePath(this);
    },
    setAnimatePlane: function (path) {

        let self = this;

        if (this.spaceship_img)
            this.spaceship_img.remove();

        let SnapSvg = Snap('.leaflet-overlay-pane>svg');

        let spaceship_img = this.spaceship_img = SnapSvg.image(this.icon.path).attr({
            visibility: 'hidden'
        });


        let spaceship = SnapSvg.group(spaceship_img);
        let flightPath = SnapSvg.path(path).attr({
            'fill': 'none',
            'stroke': 'none'
        });

        let fullPathLength = Snap.path.getTotalLength(flightPath);
        let destinationPathLength = fullPathLength / 2; //default half

        if (this.options.iconTravelLength && !isNaN(parseFloat(this.options.iconTravelLength))) {
            destinationPathLength = fullPathLength * parseFloat(this.options.iconTravelLength);
        }

        let halfPathLength = (destinationPathLength) - (destinationPathLength / (this.options.easeOutPiece ? this.options.easeOutPiece : 50));

        let width = halfPathLength / this._map.getZoom();
        let height = halfPathLength / this._map.getZoom();

        width = Math.min(Math.max(width, 30), this.options.iconMaxWidth ? this.options.iconMaxWidth : 50);
        height = Math.min(Math.max(height, 30), this.options.iconMaxHeight ? this.options.iconMaxHeight : 50);

        let fullAnimatedTime =  this.options.fullAnimatedTime ? this.options.fullAnimatedTime : 7000;
        let easeOutTime =  this.options.easeOutTime ? this.options.easeOutTime : 2500;

        let lastStep = 0;
        Snap.animate(0, halfPathLength, function (step) {

            //show image when plane start to animate
            spaceship_img.attr({
                visibility: 'visible'
            });

            spaceship_img.attr({width: width, height: height, class: self.icon.class});
            lastStep = step;

            let moveToPoint = Snap.path.getPointAtLength(flightPath, step);

            let x = moveToPoint.x - (width / 2);
            let y = moveToPoint.y - (height / 2);

            spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');

        }, easeOutTime, mina.easeout, function () {
            Snap.animate(halfPathLength, destinationPathLength, function (step) {
                lastStep = step;
                let moveToPoint = Snap.path.getPointAtLength(flightPath, step);

                let x = moveToPoint.x - width / 2;
                let y = moveToPoint.y - height / 2;
                spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');
            }, fullAnimatedTime, mina.easein, function () {
                // done
            });

        });


    },
    getPath: function () {
        return this._coords;
    },
    setPath: function (path) {
        this._setPath(path);
        return this.redraw();
    },
    getBounds: function () {
        return this._bounds;
    },
    getMidPoint: function (from, to, deep, round_side = 'LEFT_ROUND') {

        let offset = 3.14;
        let latlngs = [];

        if (round_side === 'RIGHT_ROUND') {
            offset = offset * -1;
        }

        let latlng1 = from,
            latlng2 = to;

        let offsetX = latlng2.lng - latlng1.lng,
            offsetY = latlng2.lat - latlng1.lat;

        let r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
            theta = Math.atan2(offsetY, offsetX);

        let thetaOffset = (offset / (deep ? deep : 4));

        let r2 = (r / 2) / (Math.cos(thetaOffset)),
            theta2 = theta + thetaOffset;

        let midpointX = (r2 * Math.cos(theta2)) + latlng1.lng,
            midpointY = (r2 * Math.sin(theta2)) + latlng1.lat;

        let midpointLatLng = [midpointY, midpointX];

        latlngs.push(latlng1, midpointLatLng, latlng2);

        return midpointLatLng;
    },
    _setPath: function (path) {
        this._coords = path;
        this._bounds = this._computeBounds();
    },
    _computeBounds: function () {

        let bound = new L.LatLngBounds();

        bound.extend(this._coords.from);
        bound.extend(this._coords.to);//for single destination
        bound.extend(this._coords.mid);

        return bound;
    },
    getCenter: function () {
        return this._bounds.getCenter();
    },
    _update: function () {
        if (!this._map) {
            return;
        }
        this._updatePath();
    },
    _updatePath: function () {
        //animated plane
        let path = this._renderer._updateCurve(this);
        this.setAnimatePlane(path);
    },
    _project: function () {

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


    }
});

L.bezier = function (config, options) {
    let paths = [];
    for (let i = 0; config.path.length > i; i++) {
        let lastDestination = false;
        for (let c = 0; config.path[i].length > c; c++) {
            let currentDestination = config.path[i][c];
            if (lastDestination) {
                let path_pair = {from: lastDestination, to: currentDestination};
                paths.push(new Bezier(path_pair, config.icon, options));
            }
            lastDestination = config.path[i][c];
        }
    }
    return L.layerGroup(paths);

};


