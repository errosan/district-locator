var eCount = 0,
    place = {
      raw: '',
      street: '',
      city: '',
      state: '',
      zipcode: '',
      country: '',
      position: {
        lat:0,
        lon:0
      },
      schooldistricts:[],
      legislativedistricts:[],
      reset: function() {
        this.raw = '';
        this.street = '';
        this.city = '';
        this.state = '';
        this.zipcode = '';
        this.country = '';
        this.position.lat = 0;
        this.position.lon = 0;
        this.schooldistricts = [];
        this.legislativedistricts = [];
      },
      set: function(geoResult) {
        this.reset();
        if (!geoResult) return;
        if ('formatted_address' in geoResult) this.raw = geoResult.formatted_address;
        if ('address_components' in geoResult) {
          for(obj of geoResult.address_components) {
            switch(obj.types[0]) {
              case 'street_number':
                this.street = `${obj.short_name} ${this.street}`;
                break;
              case 'route':
                this.street += obj.short_name;
                break;
              case 'locality':
                this.city = obj.short_name;
                break;
              case 'administrative_area_level_1':
                this.state = obj.short_name;
                break;
              case 'country':
                this.country = obj.short_name;
                break;
              case 'postal_code':
                this.zipcode = obj.short_name;
                break;
              case 'postal_code_suffix':
                this.zipcode += `-${obj.short_name}`;
                break;
            }
          }
        }
        if ('geometry' in geoResult) {
          this.position.lat = geoResult.geometry.location.lat();
          this.position.lon = geoResult.geometry.location.lng();
        }
        var latlon = [this.position.lat, this.position.lon];
        Geo.createMap(latlon, document.getElementById('gmap'));
        locateLegislativeDistricts(latlon, null, function() {
          locateDistrict(latlon, function() {
            displayLocation();
          });
        });
      }
    };

function locateReverse(point) {
  place.reset();
  if (point && point.length == 2) {
    Geo.reverseGeocode(point, function(result) {
      place.set(result);
    });
  }
}

function locate(addr) {
  place.reset();
  if (addr) {
    Geo.geocode(addr, function(result) {
      place.set(result);
    });
  }
}

function displayLocation() {
  // User's location
  $('#location address')
    .children()
    .first().html(`${place.street}<br>${place.city}, ${place.state} &nbsp; ${place.zipcode}`)
    .next().html(`<b>Position: </b>${place.position.lat}, ${place.position.lon}`)
    .next();
  // School districts
  var pan = $('#education .panel-body');
  pan.empty();
  for(d of place.schooldistricts) {
    pan.append(`<p><b>${d.name}</b></p>`);
    pan.append(`${d.street}<br>${d.city}, ${d.state} &nbsp; ${d.zip}<br><b>Grades: </b>${d.lograde}-${d.higrade}</p>`);
  }
  // Legislative districts
  pan = $('#legislation .panel-body');
  pan.empty();
  pan.append(`<p><img src="/icons/congress.png" width="18">&nbsp;&nbsp;${place.legislativedistricts[0].namelong}</p>`);
  pan.append(`<p><img src="/icons/amphitheater.png" width="18">&nbsp;&nbsp;${place.legislativedistricts[1].namelong}</p>`);
  $('#search').val(place.raw);
  Geo.createMarker([place.position.lat,place.position.lon], null, '/icons/home-1.png');
}

function locateDistrict(point, callback) {
  // HTML boundary colors
  var colors = ['#000','#F00','#0F0','#00F'];
  $.getJSON(`/districts/school/locate/${point[0]},${point[1]}`, function (data) {
    if (data && data.length > 0) {
      place.schooldistricts = data;
      // for each district
      var district, info;
      for(var dist = 0; dist < data.length; dist++) {
        district = data[dist];
        info = `<address><h4>${district.name}</h4><p>${district.street}<br>${district.city}, ${district.state} &nbsp; ${district.zip}</p></address>`;
        Geo.createMarker([district.intptlat,district.intptlon],info,'/icons/school.png');
        // for each boundary
        let geom = JSON.parse(district.geometry);
        for(var ring = 0, rings = geom.rings.length; ring < rings; ring += 1) {
            Geo.createPolygon(geom.rings[ring], colors[dist%colors.length], 0.25);
        }
      }
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  });
}

function locateLegislativeDistricts(point, dtype, callback) {
  // API endpoint
  var	url = `/districts/legislative/locate/${point[0]},${point[1]}`;
  // HTML boundary colors
  var colors = ['#00F','#0F0','#000','#F00'];
  if (dtype && dtype !== '') url += '/' + dtype;
  $.getJSON(url, function (data) {
    if (data && data.length > 0) {
      place.legislativedistricts = data;
      /* for each district
      var district, info, cords, name;
      for(var dist = 0; dist < data.length; dist++) {
        district = data[dist];
        // for each polygon
        for(var c = 0, cords = JSON.parse(district.coordinates); c < cords.length; c++) {
          Geo.createPolygon(cords[c], colors[dist%colors.length], 0.1);
          var bounds = new google.maps.LatLngBounds();
          for (var x = 0, xx = cords[c].length; x < xx; x += 1) {
            bounds.extend(new google.maps.LatLng(cords[c][x][0],cords[c][x][1]));
          }
          var g = bounds.getCenter();
          Geo.createMarker([g.lat(),g.lng()], `<address><h4>${district.namelong}</h4></address>`, `/icons/${district.sdtype === 'upper' ? 'congress' : 'amphitheater'}.png`);
        }
      }
      */
      if (callback && typeof callback === 'function') {
        callback();
      }
    }
  });
}

function successcb(position) {
  var point = [position.coords.latitude,position.coords.longitude];
  locateReverse(point);
}

function errorcb(error) {
  switch(error.code) {
    case error.PERMISSION_DENIED:
      console.log('geolocation: permission denied');
      break;
    default:
      // Timeout or unavailable: try twice more...
      eCount += 1;
      if (eCount < 3) {
        navigator.geolocation.getCurrentPosition(successcb, errorcb);
      } else {
        console.log('geolocation: ' + error.code);
        alert('geolocation: '+error.code);
      }
      break;
  }
}
