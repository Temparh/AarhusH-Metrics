var express = require('express')
 ,	request = require('request')
 ,	favicon = require('serve-favicon')
 ,	app		= express()
 , 	rootUrl	= require('./rejseplanen_rootUrl.json').root // Protected out of respect for Rejseplanen.dk
 ,	mkJSON	= '&format=json' 
 , 	locationsIDs = {} // No need to call location IDs over and over.
 , 	dataInProgress = false;



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
	today.setHours(0,0,0,0);
	if (Number(dateOfMonth) < 10) dateOfMonth = '0' + String(dateOfMonth);
	
	var date 	= dateOfMonth + '.' + (today.getMonth()+1) + '.' + today.getFullYear().toString().substring(2,4); 
	var useBus 	= '&useBus=0'; 
	var id;
	var AarhusHDepartures = [];
	var waitInBeteween = 0; // In minutes

	// Local function we loop.
	var getDepartBoard = function(notStart) {
		var timeStr = '&time=' + time;
		var dateStr	= '&date=' + date;
		var useURL = rootUrl + '/departureBoard/?id=' + id + dateStr + timeStr + useBus + mkJSON;

		request(useURL, function(err, res, body){
			body = JSON.parse(body);
			var departs = body.DepartureBoard.Departure;
		
			// Check all departures.
			for (var i=0; i < departs.length; i++){
				var prevDepart = AarhusHDepartures[AarhusHDepartures.length-1];

				// If departures proceed into the following day, stop finding more and return-
				if (departs[i].date != date) {
					callback(AarhusHDepartures, today);
					return;
				}
				
				// Weed out duplicates from previous api call.
				// Calc wait time.				
				if (!(prevDepart && prevDepart.name == departs[i].name)) {
					if (prevDepart) {	

						// WIP - Beta feature			
						var timeOfThisDepart = new Date();
						timeOfThisDepart.setHours(Number(departs[i].time.substring(0,2)),Number(departs[i].time.substring(3,5)));

						var timeOfPrevDepart = new Date();
						timeOfPrevDepart.setHours(Number(prevDepart.time.substring(0,2)),Number(prevDepart.time.substring(3,5)));
						var minuteDif = (timeOfThisDepart.getHours() - timeOfPrevDepart.getHours()) * 60;
						minuteDif += timeOfThisDepart.getMinutes() - timeOfPrevDepart.getMinutes();
						waitInBeteween += minuteDif;
						
					}
					AarhusHDepartures.push(departs[i]);
				}
				
				// restart function at our end point.
				if (i == departs.length-1){
					time = departs[i].time;
					getDepartBoard(true);
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
var departuresTotal = 0;
var countDays = 7; // Days, including present, we should use find for our table.
function updateDeparts(callback){
	if (dataInProgress) return;
	dataInProgress = true;
	for (var i = 0; i < countDays; i++) {
		var aimDate = new Date();
		aimDate.setDate(Number(aimDate.getDate()+i));
		getFullAarhusHDeparture(aimDate, function (arrayOfDeparts, date){
			departuresByDay.push({date: date, departs: arrayOfDeparts});
			departuresTotal += arrayOfDeparts.length; // Total count of departs.

			// since it's async, we'll have to check if we're the last coming in.
			if (departuresByDay.length >= countDays){
				departuresByDay.sort(function(a, b){
					return a.date.getTime() - b.date.getTime();
				});

				updateDailyTrips(function(succes){
					dataInProgress = false;
					departuresStamp = new Date();
					callback();
				})
			}
		});
	}
}

function updateDailyTrips(callback){
	for (var i=0; i<countDays; i++){
		var aimDate = new Date();
		aimDate.setDate(Number(aimDate.getDate())+i);
		aimDate.setHours(0,0,0,0);
		var succeses = 0;
		fetchTripsFromDay(aimDate, function(){
			succeses = succeses + 1;
			if (succeses>=countDays){
				callback(true);
			} 
		});
	}
}

checkUpdateDeparts(function(){;
	console.log('Initialization complete!');
}); // Init.

function getDeparturesByDay(date, callback){
	for (var i=0; i<departuresByDay.length; i++){
		if (departuresByDay[i].date.getDate() == date.getDate() && departuresByDay[i].date.getMonth() == date.getMonth()){
			callback(departuresByDay[i]);
		}
	} 
}

function getTravelRecords(url, callback) {
	if (!url) {
		callback(false);
		return;
	}
	request(url, function(err, res, body){
		if (!body) {
			callback(false);
			return;
		}
		var body = JSON.parse(body);
		if (!body.JourneyDetail || !body.JourneyDetail.Stop) {
			callback(false);
			return
		} else {
			callback(body.JourneyDetail.Stop);
		}
	});
}



// Middleware to check if we up to date.
function checkUpdateDeparts(callback){
	var rn = new Date();
	console.log('data in progress:' + dataInProgress);
	if ( (!departuresStamp || rn.getDate() != departuresStamp.getDate()) && !dataInProgress){
		console.log('updating..');
		updateDeparts(callback);
		return;
	} else if (!dataInProgress) {
		callback(true);
		return;
	}

	var counts = 0;
	var waitForData = function() {
		if (!dataInProgress){
			callback(true);
		} else if (counts < 50) { // Will stop after 25 seconds..
			setTimeout(function(){waitForData()}, 500);
		}
	}
	waitForData();
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

// Turn string weekday into the day number format (0-6)
function dayToNumber(day, week) {
	if (!week) week = weekdays;
	for (var i=0; i < weekdays.length; i++) {
		if (day.toUpperCase() == weekdays[i].toUpperCase()) {
			return i;
		}
	}
}




var dailyTrips = [];
function fetchTripsFromDay(targetDate, callback){
	for (var i=0; i<dailyTrips.length; i++){
		if (dailyTrips[i].date.getTime() == targetDate.getTime()) {
			callback(dailyTrips[i].trips); 
			return;
		}
	}

	// Find all last stops from day's departure.
	var lastStops = [];
	getDeparturesByDay(targetDate, function(departList){
		departList = departList.departs;
		var totalNum = departList.length;
		for (var i=0; i<departList.length; i++) {
			getTravelRecords(departList[i].JourneyDetailRef.ref, function(trip){
				if (trip) {
					lastStops.push(trip);
				} else {
					// Some references are falsely provided and return no value.
					totalNum = totalNum - 1;
				}
				// When we've received all last stops, send data.
				if (lastStops.length >= totalNum){
					console.log(lastStops.length + '/' + departList.length + ' or ' + Math.floor(lastStops.length / departList.length * 100) + '% reference calls succeded!');
					dailyTrips.push({date: targetDate, trips: lastStops});
					callback(lastStops);
					return;
				}
			});
		}
	});
}


///////////////////////////
//  JADE IS AWESOME, DUDE!
app.set('view engine', 'jade');

app.use(express.static('public'));
app.use(favicon(__dirname + '/public/data/favicon.ico'));



// Waiting page for initial visitor. 
// Useful for handling Heroku's free node servers who sleep when inactive.
app.use(function(req, res, next){
	if (dataInProgress || !departuresStamp){
		res.render('waiting', {
			redirectTo: req.originalUrl
		});
	}
	next();
});


// Make sure our metrics are up to date.
app.use(function(req, res, next){
	checkUpdateDeparts(function(){
		console.log('received data. continuing..');
		next();
	});
});

app.set('port', (process.env.PORT || 3000));



// Page for each day of the week to show statistics on.
app.get('/days/:day', function(req, res){
	// If errorenous url is given, go to today's date.
	if (weekdays.indexOf(req.params.day) <= -1) {
		req.params.day = getWeekdaysFromNow()[0];
	}

	var targetDate = new Date();
	targetDate.setHours(0,0,0,0);
	var targetDayNum = dayToNumber(req.params.day, getWeekdaysFromNow()); // Should give number FROM today's date.
	targetDate.setDate(Number(targetDate.getDate())+Number(targetDayNum)); // Today's date + the week day
	
	var totalDepartsToday = 0;
	for (var i=0; i<departuresByDay.length; i++){
		if (departuresByDay[i].date.getTime() == targetDate.getTime()){
			totalDepartsToday = departuresByDay[i].departs.length;
		} 
	}

	fetchTripsFromDay(targetDate, function(lastStops){
		res.render('days', {
				weekdays: getWeekdaysFromNow()
			,  	chosenDay: req.params.day
			, 	lastStops: JSON.stringify(lastStops)
			,	totalDeparts: totalDepartsToday
		});		
	})
});

app.get('/days/', function(req, res){
	res.redirect('/days/' + getWeekdaysFromNow()[0]);
})

// Landing page...
app.get('/', function (req, res){
	searchLocations('Aarhus H', function(locations){
		res.render('index', {
				locations: JSON.stringify(locations)
			, 	weekdays: getWeekdaysFromNow() 
			,	totalDeparts: departuresTotal
		});
	});		
});

// 404 daddy.
app.use(function(req, res, next){
	res.status(404);
	res.send('YOU IN THE WRONG PART OF TOWN BOY');
});


app.listen(app.get('port'), function (){
	console.log('Server running on port: ' + app.get('port'));
});