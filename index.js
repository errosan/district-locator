const express   = require('express'),
      bparser   = require('body-parser'),
      http      = require('http'),
      sql       = require('mssql'),
      sqlconfig = {
                        user    : '********',
                        password: '********',
                        server  : '********',
                        database: '********'
                  };
let districts   = {},
    legislature = {},
    feeders     = {};


// =================================== //
//      DB SETUP AND DATA LOADING      //
// =================================== //

(async () => {
  try {
    let pool = await sql.connect(sqlconfig);

    // SCHOOL DISTRICTS
    let result1 = await pool.request().execute('geo.GetDistrictBoundary');
    if (result1 && result1.recordsets) {
      districts = result1.recordsets[0];
    }
    if (districts) {
      console.log(`Found ${districts.length} school district records`);
    }

    // LEGISLATIVE DISTRICTS
    let result2 = await pool.request().execute('census.GetLegislativeBoundary');
    if (result2 && result2.recordsets) {
      legislature = result2.recordsets[0];
    }
    if (legislature) {
      console.log(`Found ${legislature.length} legislative district records.`);
    }
  } catch (err) {
    console.log(`Data: ${err}`);
  }
})();

// =================================== //
//          HELPER FUNCTIONS           //
// =================================== //

function pointInPolygon(polygon, point) {
  var found = false;
  var coord = point || {};
  var x = Number(coord.x);
  var y = Number(coord.y);
  
  if (isNaN(x) || isNaN(y)) {
    console.log('pointInPoly failed to parse X,Y coordinate pair');
    return found;
  }
  
  for (var i = 0, nvert = polygon.length, j = nvert-1; i < nvert; j = i++) {
    if ( ((polygon[i][0] > x) != (polygon[j][0] > x)) &&
       (y < (polygon[j][1] - polygon[i][1]) * (x - polygon[i][0]) / (polygon[j][0] - polygon[i][0]) + polygon[i][1]) ) {
      found = !found;
    }
  }

  return found;
}


// =================================== //
//         WEB SERVER & ROUTES         //
// =================================== //

// Create our app to host website located in 'public' directory
var app = express()
  .use(express.json())
  .use(bparser.urlencoded({ extended: true }))
  .use(express.static('public'));

// ROUTE: returns all school districts
//        ouput = JSON format
app.get('/districts/school', function (req, res) {
  return res.json(districts);
});

// ROUTE: returns a specific school district based on ID (geoid = nces dist id)
//        ouput = JSON format
app.get('/districts/school/:geoid', function (req, res) {
  var with_bound = districts.filter(function (item) {
    return item.geoid === req.params.geoid;
  });
  return res.json(with_bound);
});

// ROUTE: returns all state legislative districts
//        ouput = JSON format
app.get('/districts/legislative', function (req, res) {
  return res.json(legislature);
});

// ROUTE: returns all legislative districts based on ID
//        ouput = JSON format
app.get('/districts/legislative/:geoid', function (req, res) {
  var with_bound = legislature.filter(function (item) {
    return item.geoid === req.params.geoid;
  });
  return res.json(with_bound);
});

// ROUTE: returns a specific lower legislative district (House) based on ID
//        ouput = JSON format
app.get('/districts/legislative/:geoid/lower', function (req, res) {
  var with_bound = legislature.filter(function (item) {
    return item.geoid === req.params.geoid && item.sdtype === 'lower';
  });
  return res.json(with_bound);
});

// ROUTE: returns a specific upper legislative district (Senate) based on ID
//        ouput = JSON format
app.get('/districts/legislative/:geoid/upper', function (req, res) {
  var with_bound = legislature.filter(function (item) {
    return item.geoid === req.params.geoid && item.sdtype === 'upper';
  });
  return res.json(with_bound);
});

// ROUTE: returns school districts based on residence (lat, lon), using district boundaries
//        output = JSON format
app.get('/districts/school/locate/:latlon', function (req, res) {
  var poly = [],
      temp = null,
      point = req.params.latlon.split(',');

  if (point && point.length > 1) {
    // EACH DISTRICT
    for(var d = 0, dd = districts.length; d < dd; d += 1) {
      temp = JSON.parse(districts[d].geometry);
      // FOR EACH BOUNDARY (ring)
      for (var m = 0, mm = temp.rings.length; m < mm; m += 1) {
        if (pointInPolygon(temp.rings[m], { x: point[1], y: point[0] })) {
          poly.push(districts[d]);
          break;
        }
      }
    }
  }
  res.json(poly);
});

// ROUTE: returns legislative districts based on residence (lat, lon), using district boundaries
//        output = JSON format
app.get('/districts/legislative/locate/:latlon', function (req, res) {
  var poly = [],
      temp = null,
      point = req.params.latlon.split(',');

  if (point && point.length > 1) {
    // EACH DISTRICT
    for(var d = 0, dd = legislature.length; d < dd; d += 1) {
      // FOR EACH boundary with district
      temp = JSON.parse(legislature[d].coordinates);
      for(var p = 0, pp = temp.length; p < pp; p += 1) {
        if (pointInPolygon(temp[p], { x: point[1], y: point[0] })) {
          poly.push(legislature[d]);
          break;
        }
      }
    }
  }
  res.json(poly);
});

// ROUTE: default 404
app.get('/*', function  (req, res) {
  return res.json(404, {status: 'not found'});
});

// Setup a local server on port 3000 to run our app
http.createServer(app).listen(3000, function () {
  console.log("Server ready at http://localhost:3000");
});