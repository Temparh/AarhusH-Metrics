//		 NOTE
//	x is Longditude
// 	y is Latitude

var map;
function initMap(){
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 56.1585836-0.6, lng: 10.208542999999999},
		zoom: 7
	});

	//lastStops = JSON.parse(lastStops);
	console.log(lastStops); // Array of arrays of objects


	for (var i=0; i<lastStops.length; i++){ // array of array of objects
		var pathCoords = [];
		var locs = lastStops[i]

		for (var h=0; h<locs.length; h++){ // array of objects
			pathCoords.push({lng: locs[h].x/1000000, lat: locs[h].y/1000000});
		}

		var path = new google.maps.Polyline({
			path: pathCoords,
			geodesic: false,
			strokeColor: '#FF0000',
			strokeOpacity: 1.0,
			strokeWeight: 2	
		});
		path.setMap(map);

		var circle = new google.maps.Circle({
			strokeColor: '#FF0000',
			strokeOpacity: 0.8,
			strokeWeight: 2,
			fillColor: 'green',
			fillOpacity: 0.05,
			map: map,
			center: {lat: lastStops[i][lastStops[i].length-1].y/1000000, lng: lastStops[i][lastStops[i].length-1].x/1000000},
			radius: 10000
		});
	}

}