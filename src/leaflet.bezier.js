L.SVG.include({
    _updatecurve: function (layer) {
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
    //Juast after path is added
    onAdd: function (map) {
        this._renderer._initPath(this);
        this._reset();
        this._renderer._addPath(this);

        // TODO ajust plane acording to zoom
        map.on('zoom', function () {

        });

    },
    setAnimatePlane: function (path) {

        let self = this;

        if (this.spaceship_img)
            this.spaceship_img.remove();

        let SnapSvg = Snap('.leaflet-overlay-pane>svg');

        let spaceship_img = this.spaceship_img = SnapSvg.image(this.icon.path).attr({
            visibility: "hidden"
        });


        let spaceship = SnapSvg.group(spaceship_img);
        let flight_path = SnapSvg.path(path).attr({
            'fill': 'none',
            'stroke': 'none'
        });

        let full_path_length = Snap.path.getTotalLength(flight_path);
        let half_path_length = full_path_length / 2;
        let third_path_length = full_path_length / 3;
        let forth_path_length = full_path_length / 4;


        let width = forth_path_length / this._map.getZoom();
        let height = forth_path_length / this._map.getZoom();

        width = Math.min(Math.max(width, 30), 64);
        height = Math.min(Math.max(height, 30), 64);


        let last_step = 0;


        Snap.animate(0, forth_path_length, function (step) {

            //show image when plane start to animate
            spaceship_img.attr({
                visibility: "visible"
            });

            spaceship_img.attr({width: width, height: height, class: self.icon.class});

            last_step = step;

            let moveToPoint = Snap.path.getPointAtLength(flight_path, step);

            let x = moveToPoint.x - (width / 2);
            let y = moveToPoint.y - (height / 2);


            spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');

        }, 2500, mina.easeout, function () {

            Snap.animate(forth_path_length, half_path_length, function (step) {

                last_step = step;
                let moveToPoint = Snap.path.getPointAtLength(flight_path, step);

                let x = moveToPoint.x - width / 2;
                let y = moveToPoint.y - height / 2;
                spaceship.transform('translate(' + x + ',' + y + ') rotate(' + (moveToPoint.alpha - 90) + ', ' + width / 2 + ', ' + height / 2 + ')');
            }, 7000, mina.easein, function () {
                //done

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

        if (round_side === 'RIGHT_ROUND')
            offset = offset * -1;

        let latlngs = [];

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
        let path = this._renderer._updatecurve(this);
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


    },


});

L.bezier = function (config, options) {
    let paths = [];
    for (let i = 0; config.path.length > i; i++) {
        let last_destination = false;
        for (let c = 0; config.path[i].length > c; c++) {

            let current_destination = config.path[i][c];
            if (last_destination) {
                let path_pair = {from: last_destination, to: current_destination};
                paths.push(new Bezier(path_pair, config.icon, options));
            }

            last_destination = config.path[i][c];
        }
    }
    return L.layerGroup(paths);

};


