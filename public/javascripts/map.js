function listLocations() {
	var ul = document.getElementById('ul_locations');	

	for (var i=0; i < locations.length; i++) {
		console.log('itterating locations...');

		var li = document.createElement('li');
		li.appendChild(document.createTextNode(locations[i].name+ '. ID: ' + locations[i].id) );
		ul.appendChild(li);
	}
}
listLocations();

//		 NOTE
//	x is Longditude
// 	y is Latitude

var map;
function initMap2(){
	map = new google.maps.Map(document.getElementById('map'), {
		center: {lat: locations[0].y/1000000+0.018, lng: locations[0].x/1000000},
		zoom: 14,
		minZoom: 13,	
		maxZoom: 15,
	});

	for (var i=0; i < locations.length; i++) {
		var center = {lat: locations[i].y/1000000, lng: locations[i].x/1000000};
		var busStop = new google.maps.Circle({
			strokeColor: 'red',
			strokeOpacity: 0.8,
			strokeWeight: 2,
			fillColor: 'gray',
			fillOpacity: 0.5,
			map: map,
			center: center,
			radius: 50
		});
	}
}