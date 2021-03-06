// L = leaflet
(function ($, L, prettySize) {
	var map, heat,
		heatOptions = {
			tileOpacity: 1,
			heatOpacity: 1,
			minOpacity: 0.5,
			//xxx maxZoom: 10,
			radius: 30,
			blur: 1,
			//xxx gradient: { 0: 'blue', 1: 'red' }
		};

	// Start at the beginning
	stageOne();

	function stageOne() {
		var dropzone;

		// Initialize the map
		map = L.map('map').setView([0, 0], 2);

		L.tileLayer('http://a.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
			attribution: 'location-history-visualizer is open source and available <a href="https://github.com/theopolisme/location-history-visualizer">on GitHub</a>. Map data &copy; <a href="https://openstreetmap.org">OpenStreetMap</a> contributors.',
			maxZoom: 18,
			minZoom: 2
		}).addTo(map);

		// Initialize the dropzone
		dropzone = new Dropzone(document.body, {
			url: '/',
			previewsContainer: document.createElement('div'), // >> /dev/null
			clickable: false,
			accept: function (file, done) {
				stageTwo(file);
				dropzone.disable(); // Your job is done, buddy
			}
		});

		// For mobile browsers, allow direct file selection as well
		$('#file').change(function () {
			stageTwo(this.files[0]);
			dropzone.disable();
		});

		stageTwo(null);
	}

	function stageTwo(file) {
		heat = L.heatLayer([], heatOptions).addTo(map);

		// First, change tabs
		$('body').addClass('working');
		$('#intro').addClass('hidden');
		$('#working').removeClass('hidden');

		// Now start working!
		processFile(file);

		function status(message) {
			$('#currentStatus').text(message);
		}

		function processFile(file) {
			let fileSize = file ? file.size : 0;

			fileSize = prettySize(fileSize),
				reader = new FileReader();

			status('Preparing to import file (' + fileSize + ')...');

			function getLocationDataFromJson(data) {
				var SCALAR_E7 = 0.0000001, // Since Google Takeout stores latlngs as integers
					locations = data.locations;

				if (!locations || locations.length === 0) {
					throw new ReferenceError('No location data found.');
				}

				return locations.map(function (location) {
					return [location.latitudeE7 * SCALAR_E7, location.longitudeE7 * SCALAR_E7];
				});
			}

			function getLocationDataFromKml(data) {
				var KML_DATA_REGEXP = /<when>(.*?)<\/when>\s*<gx:coord>(\S*)\s(\S*)\s(\S*)<\/gx:coord>/g,
					locations = [],
					match = KML_DATA_REGEXP.exec(data);

				// match
				//  [1] ISO 8601 timestamp
				//  [2] longitude
				//  [3] latitude
				//  [4] altitude (not currently provided by Location History)

				while (match !== null) {
					locations.push([Number(match[3]), Number(match[2])]);
					match = KML_DATA_REGEXP.exec(data);
				}

				return locations;
			}

			reader.onprogress = function (e) {
				var percentLoaded = Math.round((e.loaded / e.total) * 100);
				status(percentLoaded + '% of ' + fileSize + ' loaded...');
			};

			let onLoad = function (e) {
				var latlngs;

				status('Generating map...');

				try {
					if (/\.kml$/i.test(file.name)) {
						latlngs = getLocationDataFromKml(e.target.result);
					} else {
						latlngs = getLocationDataFromJson(e.target.result);
					}
				} catch (ex) {
					status('Something went wrong generating your map. Ensure you\'re uploading a Google Takeout JSON file that contains location data and try again, or create an issue on GitHub if the problem persists. (error: ' + ex.message + ')');
					return;
				}

				heat._latlngs = latlngs;

				heat.redraw();

				setTimeout(function () {
					// center on the data
					let lats = latlngs.map(latLong => latLong[0]);

					let longs = latlngs.map(latLong => latLong[1]);

					var corner1 = L.latLng(Math.min(...lats), Math.min(...longs)),
						corner2 = L.latLng(Math.max(...lats), Math.max(...longs)),
						bounds = L.latLngBounds(corner1, corner2);

					map.fitBounds(bounds, {
						padding: [50, 50]
					});
				}, 2000);

				stageThree( /* numberProcessed */ latlngs.length);
			};

			reader.onload = onLoad;

			reader.onerror = function () {
				status('Something went wrong reading your JSON file. Ensure you\'re uploading a "direct-from-Google" JSON file and try again, or create an issue on GitHub if the problem persists. (error: ' + reader.error + ')');
			};

			if (file) {
				reader.readAsText(file);
			} else {
				//use some test data:
				let smallData = '/data/SR%20-%20Location%20History/extract%20-%20large.txt';

				//private data - is NOT in git!
				let bigPrivateDataReduced = '/data/SR%20-%20Location%20History/private/reduced.json';

				//the FULL data - works with 600k points! (thanks to leaflet.js!)
				let veryBigPrivateData = '/data/SR%20-%20Location%20History/private/SR - PRIVATE - Location History.json'

				//let activeUrl = veryBigPrivateData;
				let activeUrl = smallData;
				$.get(activeUrl,
					null,
					function (data) {
						file = {
							name: 'testData1.json'
						};

						//sometimes data is string, sometimes JSON (!)
						if (typeof (data) === "string") {
							data = JSON.parse(data);
						}

						onLoad({
							target: {
								result: data
							}
						});
					})
					.fail(function () {
						console.error("error loading data from server!");
					})
					.always(function () {
						console.log("done loading data from server");
					});
			}
		}
	}

	function stageThree(numberProcessed) {
		// Change tabs :D
		$('body').removeClass('working');
		$('#working').addClass('hidden');

		// Update count
		$('#numberProcessed').text(numberProcessed.toLocaleString());

		// Fade away when clicked
		let hideDone = function () {
			$('body').addClass('map-active');
			activateControls();
		};
		hideDone();

		function activateControls() {
			var $tileLayer = $('.leaflet-tile-pane'),
				$heatmapLayer = $('.leaflet-heatmap-layer'),
				originalHeatOptions = $.extend({}, heatOptions); // for reset

			// Update values of the dom elements
			function updateInputs() {
				var option;
				for (option in heatOptions) {
					if (heatOptions.hasOwnProperty(option)) {
						let elem = document.getElementById(option);
						if (elem) {
							elem.value = heatOptions[option];
						} else {
							console.warn('could not find control for option: ', option);
						}
					}
				}
			}

			updateInputs();

			$('.control').change(function () {
				switch (this.id) {
					case 'tileOpacity':
						$tileLayer.css('opacity', this.value);
						break;
					case 'heatOpacity':
						$heatmapLayer.css('opacity', this.value);
						break;
					default:
						heatOptions[this.id] = Number(this.value);
						heat.setOptions(heatOptions);
						break;
				}
			});

			$('#reset').click(function () {
				$.extend(heatOptions, originalHeatOptions);
				updateInputs();
				heat.setOptions(heatOptions);
				// Reset opacity too
				$heatmapLayer.css('opacity', originalHeatOptions.heatOpacity);
				$tileLayer.css('opacity', originalHeatOptions.tileOpacity);
			});
		}
	}

}(jQuery, L, prettySize));
