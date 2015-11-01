var express = require('express')
 ,	request = require('request')
 ,	app		= express()
 , 	rootUrl	= require('./rejseplanen_rootUrl.json').root // Protected out of respect for Rejseplanen.dk
 ,	mkJSON	= '&format=json' 
 , 	locationsIDs = {}; // No need to call location IDs over and over.


console.log(rootUrl);


// Search function for finding stops. Returns an array of matches.
function searchLocations(input, callback){
	request(rootUrl + '/location?input=' + encodeURI(input) + mkJSON
	, function (err, res, body){
		var body = JSON.parse(body);
		// body.LocationList.StopLocation[3].name

		if (err) {
			console.error('Succesfully received data.');
			callback(false);
			return;
		}
		callback(body.LocationList.StopLocation);
	});
}


// Returns name specific stop data or false.
function getSpecificLocation( input, callback ){
	searchLocations(input, function(locationList){
		for (var i=0; i < locationList.length; i++) {
			if (locationList[i].name == input) {
				callback(locationList[i]);
				return;
			}
		}
		callback(false);
	});
}


// Get all departures of one day from Aarhus H.
// Also NOTE: NEEDS REFACTORING!
function getFullAarhusHDeparture(today, callback) { 
	var time 		= '00:00';
	var dateOfMonth = today.getDate(); // api only accepts dd.mm.yy format.
	if (Number(dateOfMonth) < 10) dateOfMonth = '0' + String(dateOfMonth);
	
	var date 	= dateOfMonth + '.' + (today.getMonth()+1) + '.' + today.getFullYear().toString().substring(2,4); 
	var useBus 	= '&useBus=0'; 
	var id;
	var AarhusHDepartures = [];

	// Local function we loop.
	var getDepartBoard = function() {
		var timeStr = '&time=' + time;
		var dateStr	= '&date=' + date;
		var useURL = rootUrl + '/departureBoard/?id=' + id + dateStr + timeStr + useBus + mkJSON;
		//console.log(useURL);
		request(useURL, function(err, res, body){
			body = JSON.parse(body);
			//console.log(body);
			var departs = body.DepartureBoard.Departure;

			// Check all departures.
			for (var i=0; i < departs.length; i++){
				// If departures proceed into the following day, stop finding more and return-
				if (departs[i].date != date) {
					callback(AarhusHDepartures, today);
					return;
				}
				// Push departure to our table and restart function at our end point.
				AarhusHDepartures.push(departs[i]);
				if (i == departs.length-1){
					console.log(time);
					time = departs[i].time;
					getDepartBoard();
				}
			}
		});	
	}


	if (locationsIDs.Aarhus_H) {
		id = locationsIDs.Aarhus_H;
		getDepartBoard();
	} else {
		getSpecificLocation('Aarhus H', function(AarhusH){
			//http://xmlopen.rejseplanen.dk/bin/rest.exe/departureBoard?id=008600053&date=25.10.15&time=17:00&useBus=0
			locationsIDs.Aarhus_H = AarhusH.id;
			id = AarhusH.id;
			getDepartBoard();
		});
	}
	
}


// Updates the table of departure information.
var departuresByDay = [];
var departuresStamp;
function updateDeparts(callback){
	var countDays = 2; // Days, including present, we should use find for our table.
	for (var i = 0; i < countDays; i++) {
		var aimDate = new Date();
		aimDate.setDate(Number(aimDate.getDate()+i));
		getFullAarhusHDeparture(aimDate, function (arrayOfDeparts, date){
			var numOfDeparts = arrayOfDeparts.length;
			departuresByDay.push({date: date, departs: numOfDeparts});
			
			// since it's async, we'll have to check if we're the last coming in.
			if (departuresByDay.length >= countDays){
				departuresByDay.sort(function(a, b){
					return a.date.getTime() - b.date.getTime();
				});
				console.log(departuresByDay);
				departuresStamp = new Date();
				callback();
			}
		});
	}
}
updateDeparts(function(){}); // Init.


// Middleware to check if we up to date.
function checkUpdateDeparts(callback){
	var rn = new Date();
	if (rn.getDate() != departuresStamp.getDate()){
		updateDeparts(callback);
	} else {
		callback(true);
	}
}


// Simple sync func for retrieving days a week ahead.
var weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
function getWeekdaysFromNow(){
	var dayNum = new Date().getDay();
	var t = new Array();
	for (var i=dayNum; i<dayNum+7; i++){
		t.push(weekdays[i%7]);
	}
	return t;
}

///////////////////////////
// 
//  JADE IS AWESOME, DUDE!
//
app.set('view engine', 'jade');

app.use(express.static('public'));

// Make sure our metrics are up to date.
app.use(function(req, res, next){
	checkUpdateDeparts(function(){
		next();
	});
});

// Page for each day of the week to show statistics on.
app.get('/days/:day', function(req, res){
	res.render('days', {weekdays: getWeekdaysFromNow(), chosenDay: req.params.day})
});

// Landing...
app.get('/', function (req, res){
	searchLocations('Aarhus H', function(locations){

		res.render('index', {locations: JSON.stringify(locations), weekdays: getWeekdaysFromNow() });
	});
});

// 404 daddy.
app.use(function(req, res, next){
	res.status(404);
	res.send('YOU IN THE WRONG PART OF TOWN BOY');
});


app.listen(3000, function (){
	console.log('Server running...');
});