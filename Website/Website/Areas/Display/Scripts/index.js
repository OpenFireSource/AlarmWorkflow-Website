/// <reference path="http://cdn.leafletjs.com/leaflet-0.7.2/leaflet.js" />
/// <reference path="https://maps.googleapis.com/maps/api/js?sensor=true" />

// Stores the current operation, so we don't get the expensive data all over each time.
var currentOpId = -1;

//Vars needed by google
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer();
var map;
var osm;
var maxZoomService = new google.maps.MaxZoomService();
var addressCoor = null;
var showRoute = config.showRoute;
var zoomOnAddress = true;
var useTilt = config.useTilt;
var useTraffic = config.useTraffic;
var zoomLevel = config.zoomLevel;
var home = config.home;
var googleMarker = null;
var osmMarker = null;
var firstTime = true;

function goToLatLng(dest) {
    map.panTo(dest);
    map.setZoom(18);
    maxZoomService.getMaxZoomAtLatLng(dest, function (response) {
        if (response.status == google.maps.MaxZoomStatus.OK) {
            var zoom = Math.round(response.zoom * zoomLevel);
            map.setZoom(zoom);
        }
    });
}

function addGoogleMarker(location) {
    if (googleMarker == null) {
        googleMarker = new google.maps.Marker({
            position: location,
            map: map,
        });
    } else {
        googleMarker.setPosition(location);
    }
}
function addOsmMarker(location) {
    if (osmMarker == null) {
        osmMarker = L.marker(location);
        osmMarker.addTo(osm);
    } else {
        osmMarker.setLatLng(location);
    }


}

function calcRoute(start, end) {
    var request = {
        origin: start,
        destination: end,
        travelMode: google.maps.TravelMode.DRIVING
    };
    directionsService.route(request, function (result, status) {
        if (status == google.maps.DirectionsStatus.OK) {
            directionsDisplay.setDirections(result);
            var l = result.routes[0].overview_path.length;
            addressCoor = result.routes[0].overview_path[l - 1];
            google.maps.event.addListener(map, 'tilesloaded', function () {
                if (zoomOnAddress && firstTime) {
                    firstTime = false;
                    goToLatLng(end);
                }
            });
        } else {
            console.log("Routing not possible! Only centering to location!");
            addGoogleMarker(end);
            goToLatLng(end);
        }
    });
}

function reset() {
    $.get("/Display/Alarm/ResetLatestOperation", function (result) {

        if (result.success) {
            loadOperationData();
        } else {
            console.log(result.message);
        }

    });
}

$(window).resize(function () {
    if (currentOpId != -1) {
        $('span.alarm').each(function () {
            $(this).css('font-size', '1px');
        });
        $('span.alarm').each(function () {
            utils.scale($(this).parent(), $(this));
        });
    }

});

function loadOperationData() {
    console.log("Loading Operation");
    $.get('/Display/Alarm/GetLatestOperation', function (result) {

        $("#paneLoading").hide();

        if (result.success == true) {

            $("#paneError").hide();
            if (result.op == null) {
                $("#paneIdle").show();
                $("#paneOperation").hide();
            } else {
                $("#paneIdle").hide();
                if (currentOpId != result.op.Id) {
                    currentOpId = result.op.Id;
                    $('span.alarm').each(function () {
                        $(this).css('font-size', '1px');
                    });
                    console.log("Got new Operation");
                    $("#opicture").text(result.op.Picture);
                    $("#ocomment").text(result.op.Comment);

                    var oaddress = "";
                    if (result.op.Einsatzort.Street != null) {
                        oaddress += result.op.Einsatzort.Street + " ";
                    }
                    if (result.op.Einsatzort.StreetNumber != null) {
                        oaddress += result.op.Einsatzort.StreetNumber + " ";
                    }
                    if (result.op.Einsatzort.ZipCode != null) {
                        oaddress += result.op.Einsatzort.ZipCode + " ";
                    }
                    if (result.op.Einsatzort.City != null) {
                        oaddress += result.op.Einsatzort.City;
                    }
                    oaddress = oaddress.replace("  ", " ");
                    $("#oaddress").text(oaddress);

                    // Prepare Keywords for display.
                    var okeywords = "Stichw&ouml;rter: ";
                    if (result.op.Keywords.Keyword != null) {
                        okeywords += result.op.Keywords.Keyword + " ";
                    }
                    if (result.op.Keywords.EmergencyKeyword != null) {
                        okeywords += result.op.Keywords.EmergencyKeyword + " ";
                    }
                    if (result.op.Keywords.B != null) {
                        okeywords += result.op.Keywords.B + " ";
                    }
                    if (result.op.Keywords.R != null) {
                        okeywords += result.op.Keywords.R + " ";
                    }
                    if (result.op.Keywords.S != null) {
                        okeywords += result.op.Keywords.S + " ";
                    }
                    if (result.op.Keywords.T != null) {
                        okeywords += result.op.Keywords.T;
                    }

                    okeywords = okeywords.replace("  ", " ");
                    $("#okeywords").html(okeywords);
                    var orsc = "";

                    // Resources
                    $.get("/Display/Alarm/GetFilteredResources/" + currentOpId, function (data) {
                        data.Resources.forEach(function (resource) {
                            var value;
                            if (resource.Emk == null || resource.Emk.DisplayName.length === 0) {
                                value = "<div class=\"oresource\">" + resource.Resource.FullName + "</div>";
                            } else {
                                if (resource.Emk.IconFileName != null && resource.Emk.IconFileName.length !== 0) {
                                    value = "<img class=\"oresource\" src=\"/Display/Alarm/GetResourceImage?id=" + encodeURIComponent(resource.Emk.Id) + "\" height=\"200\" alt=\"Fahrzeugbild\">";
                                } else {
                                    value = "<div class=\"oresource\">" + resource.Emk.DisplayName + "</div>";
                                }
                            }
                            orsc += value;
                        });
                        $("#orsc").html(orsc);
                    });


                    $("#paneOperation").show();
                    setTimeout(function () {
                        $('span.alarm').each(function () {
                            utils.scale($(this).parent(), $(this));
                        });
                    }, 5);
                    //GoogleMaps Stuff
                    google.maps.visualRefresh = true;
                    directionsDisplay = new google.maps.DirectionsRenderer();
                    firstTime = true;
                    var dest = new google.maps.LatLng(result.op.Einsatzort.GeoLatitude.replace(',', '.'), result.op.Einsatzort.GeoLongitude.replace(',', '.'));


                    if (!showRoute) {
                        addGoogleMarker(dest);
                        goToLatLng(dest);
                    } else {
                        //ROUTE
                        directionsDisplay.setMap(map);
                        calcRoute(home, dest);
                    }

                    osm.setView([result.op.Einsatzort.GeoLatitude.replace(',', '.'), result.op.Einsatzort.GeoLongitude.replace(',', '.')], config.zoomLevelOSM);
                    addOsmMarker([result.op.Einsatzort.GeoLatitude.replace(',', '.'), result.op.Einsatzort.GeoLongitude.replace(',', '.')]);
                }
            }
        } else {
            // Reset current operation and display the idle screen.
            currentOpId = -1;
            $("#paneOperation").hide();
            $("#paneIdle").hide();
            $("#paneError").show();
        }
    }).fail(function () {
        // Reset current operation and display warning.
        currentOpId = -1;
        $("#paneOperation").hide();
        $("#paneIdle").hide();
        $("#paneError").show();
    });
}

// Poll the service and read operation data, then apply to DOM.
window.setInterval(loadOperationData, config.updateIntervalMs);

$(loadOperationData);

$(function () {
    osm = L.map('oosm');
    L.tileLayer('http://{s}.tile.osm.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(osm);
    L.tileLayer('http://www.openfiremap.org/hytiles/{z}/{x}/{y}.png').addTo(osm);
    var mapOptions = {
        zoom: 10,
        overviewMapControl: false,
        panControl: false,
        mapTypeControl: true,
        streetViewControl: false,
        zoomControl: config.zoomControl,
        mapTypeId: config.mapTypeGoogle
    };
    map = new google.maps.Map(document.getElementById("ogoogle"), mapOptions);

    //45°
    if (useTilt) {
        map.setTilt(45);
    }

    //TRAFFIC
    if (useTraffic) {
        var trafficLayer = new google.maps.TrafficLayer();
        trafficLayer.setMap(map);
    }
});