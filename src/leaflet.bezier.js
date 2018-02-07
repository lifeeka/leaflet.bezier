L.Bezier = L.Path.extend({
    options: {},

    initialize: function (path, options) {


        if (!path.mid || path.mid[0] === undefined) {
            path.mid = this.getMidPoint(path.from, path.to, (path.mid ? path.mid.deep : 4));
        }

        L.setOptions(this, options);
        this._initialUpdate = true;
        this._setPath(path);
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
    getMidPoint: function (from, to, deep) {

        let latlngs = [];

        let latlng1 = from,
            latlng2 = to;

        let offsetX = latlng2[1] - latlng1[1],
            offsetY = latlng2[0] - latlng1[0];

        let r = Math.sqrt(Math.pow(offsetX, 2) + Math.pow(offsetY, 2)),
            theta = Math.atan2(offsetY, offsetX);

        let thetaOffset = (3.14 / (deep ? deep : 4));

        let r2 = (r / 2) / (Math.cos(thetaOffset)),
            theta2 = theta + thetaOffset;

        let midpointX = (r2 * Math.cos(theta2)) + latlng1[1],
            midpointY = (r2 * Math.sin(theta2)) + latlng1[0];

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

        if (Array.isArray(this._coords.to[0])) {//for multi destination
            for (let i = 0; this._coords.to.length < i; i++) {
                bound.extend(this._coords.to[i]);
            }
        }
        else {
            bound.extend(this._coords.to);//for single destination
        }

        console.log(this._coords.mid);
        bound.extend(this._coords.mid);

        return bound;
    },

    //TODO: use a centroid algorithm instead
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

        let path = this._renderer._updatecurve(this);
        this.setAnimatePlane(path);

    },
    setAnimatePlane(path) {

        if (this.spaceship_img)
            this.spaceship_img.remove();

        let SnapSvg = Snap('.leaflet-overlay-pane>svg');

        let spaceship_img = this.spaceship_img = SnapSvg.image(this._coords.icon.path).attr({
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

            spaceship_img.attr({width: width, height: height});

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

    _project: function () {


        this._points = [];


        //for only one destination
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

        //for multi destination
        console.log(this._coords.to, this._coords.to.length);


    },


});

L.bezier = function (path, options) {
    return new L.Bezier(path, options);
};

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
            if (typeof point == 'string' || point instanceof String) {
                curCommand = point;
                str += curCommand;
            } else
                str += point.x + ',' + point.y + ' ';


        }
        return str || 'M0 0';
    },

});