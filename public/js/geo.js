console = console || {
	log: function () {},
	error: function () {},
	assert: function () {}
};

GeoMapOverlay.prototype = new google.maps.OverlayView();
function GeoMapOverlay(bounds, label, map) {
	this.Bounds = bounds;
	this.Label = label;
	this.Map = map;
	this.Span = null;
	this.setMap(map);
};
GeoMapOverlay.prototype.onAdd = function() {
  var span = document.createElement('span');
	span.style.display = 'inline-block';
  span.style.position = 'absolute';
	span.style.color = '#000000';
	span.style.backgroundColor = 'rgba(255,255,255,.67)';
	span.style.borderRadius = '2px';
	span.style.padding = '1px 3px 2px';
	this.Span = span;
  var panes = this.getPanes();
  panes.floatPane.appendChild(span);
};
GeoMapOverlay.prototype.onRemove = function() {
  this.Span.parentNode.removeChild(this.Span);
  this.Span = null;
};
GeoMapOverlay.prototype.draw = function() {
  var overlayProjection = this.getProjection();
  var center = overlayProjection.fromLatLngToDivPixel(this.Bounds.getCenter());
  this.Span.style.left = center.x + 'px';
  this.Span.style.top = center.y + 'px';
	this.Span.innerHTML = this.Label;
};


var Geo = new function () {
	var geoMap;
	/*
	** Determines whether a coordinate tuple [lat, lng] exists within a polygon.
	** For example, if an address falls within a school district's boundary.
	*/
	this.pointInPolygon = function (point, poly) {
		var	ret = false;

		// Sanity check
		if (!isValidArray(point,2) || !isValidArray(poly,1)) {
			console.log('Geo.pointInPolygon(): Failed sanity check');
		}
		// Check each path in polygon for point inclusion
		else {
			for (var i = 0, nvert = poly.length, j = nvert-1; i < nvert; j = i++) {
				if ( ((poly[i][1] > point[1]) != (poly[j][1] > point[1])) &&
					 (point[0]<(poly[j][0]-poly[i][0])*(point[1]-poly[i][1])/(poly[j][1]-poly[i][1])+poly[i][0]) ) {
					ret = !ret;
				}
			}
		}

		return ret;
	};

	/* Takes an address, zip, etc and
	** returns an array containing the coordinate tuple [lat, lng]
	*/
	this.geocode = function (address, callback) {
		var ret = null;
		if (address !== '') {
			var g = new google.maps.Geocoder();
			g.geocode({'address':address}, function(data,status) {
				if (data && status === 'OK') {
					ret = data[0];
				} else {
					console.log('Geo.geocode(): data returned with status \'%s\'', status);
				}
				if (callback && typeof callback === 'function') callback(ret);
			})
		}
		return ret;
	};

	/*
	** Takes an array containing a coordinate tuple [lat,lng] and
	** returns a formatted address string
	*/
	this.reverseGeocode = function (point, callback) {
		var ret = null;
		if (isValidArray(point, 2)) {
			var g = new google.maps.Geocoder();
			g.geocode({'location':new google.maps.LatLng(point[0],point[1])}, function(data, status) {
				if (data && status === 'OK') {
					ret = data[0];
				} else {
					console.log('Geo.reverseGeocode(): data returned with status \'%s\'', status);
				}
				if (callback && typeof callback === 'function') callback(ret);
			});
		}
		return ret;
	};

	/*
	** Creates a Google map in supplied container @ supplied position [lat,lon]
	*/
	this.createMap = function (point, container, level) {
		var latlng;			// The point (position) converted to google.maps.LatLng
		var mark;			// Google map marker of point [lat,lon]
		var zoom = level || 11;
		// Sanity check
		if (!isValidArray(point, 2)) {
			console.log('Geo.createMap(): point is not an array or does not contain two items [lat. lon].');
		}
		// Create a map centered on supplied point and drop a marker at same point.
		else {
			latlng = new google.maps.LatLng(point[0],point[1]);
			container = container || document.createElement("div");
			geoMap = new google.maps.Map(
				container,
				{
					'zoom': zoom,
					'center': latlng
				}
			);

			/*mark = new google.maps.Marker({
				position: latlng,
				icon: '/icons/home-1.png',
				map: geoMap
			});*/
		}
	};

	/*
	** Creates a polygon on supplied map
	*/
	this.createPolygon = function (points, color, opacity, label, clickhandler) {
		var latLngArr = [];		// An array of google.maps.LatLng
		var polygon;			// The google.maps.Polygon created
		var transp = (opacity && Math.abs(opacity) <= 1) ? Math.abs(opacity) : 1;
		// Sanity check
		if (!isValidArray(points, 1)) {
			console.log('Geo.createPolygon(): point is not an array or does not contain at least one item.');
		}
		/*
		** Loop through each path and convert lat/lon arrays to arrays of google.maps.LatLng.
		** Use LatLng array to construct the polygon and place on map.
		*/
		else {
			for(var p = 0, pp = points.length; p < pp; p += 1) {
				latLngArr.push(new google.maps.LatLng(points[p][1],points[p][0]));
			}
			polygon = new google.maps.Polygon({
				paths: latLngArr,
				strokeColor: color,
				strokeWeight: 1,
				fillColor: color,
				fillOpacity: opacity,
				map: geoMap,
				clickable: true
			});
			polygon.set('data-label', label);
			if (clickhandler && typeof clickhandler === 'function') {
				polygon.addListener('click', clickhandler);
			}
		}
	};

	this.createOverlay = function(bounds, label) {
		var overlay = new GeoMapOverlay(bounds, label, geoMap);
	}

	/*
	** Creates a marker and places it on the map
	*/
	this.createMarker = function (point, info, icon) {
		var mark;			// google.maps.Marker object
		var infoW;			// google.maps.InfoWindow object that will hold he marker information
		// Sanity check
		if (!isValidArray(point, 1)) {
			console.log('Geo.createMarker(): point is not an array or does not contain two items [lat, lon]');
		}
		// Create a marker, drop it on the map and attach any info provided.
		else {
			mark = new google.maps.Marker({
				position: new google.maps.LatLng(point[0],point[1]),
				icon: icon,
				animation: google.maps.Animation.DROP,
				map: geoMap
			});
			if (info && info !== '') {
				infoW = new google.maps.InfoWindow({content: info});
				google.maps.event.addListener(mark, 'click', function() {
					infoW.open(geoMap, mark);
				});
			}
		}
	};

	/*
	** Checks whether an object is an Array and is the appropriate length
	*/
	function isValidArray(obj, minLength) {
		return (Object.prototype.toString.call(obj) === '[object Array]' && obj.length >= minLength);
	}
};
