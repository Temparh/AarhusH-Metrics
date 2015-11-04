//		 NOTE
//	x is Longditude?
// 	y is Latitude?

endStations = [];

var map;
function initMap(){
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: 56.1585836-0.6, lng: 10.208542999999999}, // Aarhus H is center
		zoom: 7,
		zoomControl: true,
		mapTypeControl: false,
		scaleControl: false,
		streetViewControl: false,
		rotateControl: false
	});

	// Itterate over all trips.
	for (var i=0; i<lastStops.length; i++){
		var pathCoords = [];
		var locs = lastStops[i]

		// Plot every path point into a table for drawing...
		for (var h=0; h<locs.length; h++){ 
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

		// End station circles..
		var endStation = lastStops[i][lastStops[i].length-1];
		var center = {lat: endStation.y/1000000, lng: endStation.x/1000000};
		var circle = new google.maps.Circle({
			strokeColor: '#FF0000',
			strokeOpacity: 0.8,
			strokeWeight: 2,
			fillColor: 'green',
			fillOpacity: 0.05,
			map: map,
			center: center,
			radius: 10000,
			clickable: true
		});

		// Marker are still a work in progress. Google maps is seriously not cooperative...
		/* ALSO COMMENT BLOCKS ARE BAD I KNOW
		var savedKey = false;
		for (var k=0; i<endStations.length; i++){
			if (endStations[k].x == endStation.x){
				endStations[k].count = endStations[k].count + 1;
				savedKey = endStations.length-1;
			}
		}
		if (!savedKey) {
			endStations.push({x: endStation.x, count: 1, open: false});
			savedKey = endStations.length-1;
		}

		var infoWindow = new google.maps.InfoWindow({
			content: '<b>' + totalDeparts + ' from this place on ' + chosenDay + '</b>'
			
		});
		circle.savedKey = savedKey;
		var newEvent = new google.maps.event.addListener(circle, 'click', function(){	
			console.log(circle.savedKey);
			infoWindow.content = '<b>' + endStations[circle.savedKey].count + ' to this place on ' + chosenDay + '</b>';
			infoWindow.setPosition(center);
			infoWindow.open(map);
		});
	*/

	}
}