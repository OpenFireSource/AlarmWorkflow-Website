﻿/// <reference path="http://cdn.leafletjs.com/leaflet-0.7.2/leaflet.js" />
/// <reference path="https://maps.googleapis.com/maps/api/js?sensor=true" />
/// <reference path="https://ajax.googleapis.com/ajax/libs/angularjs/1.4.8/angular.js"/>
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
var app = angular.module('alarmApp', []);
app.controller('alarmCtrl', function ($scope) {

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

    $scope.reset = function () {
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
            $scope.$apply(function () {
                $scope.result = result;
            });
            if (result.success == true) {
                if (result.op == null) {
                } else {
                    $("#paneIdle").hide();
                    if (currentOpId != result.op.Id) {
                        currentOpId = result.op.Id;
                        $('span.alarm').each(function () {
                            $(this).css('font-size', '1px');
                        });
                        console.log("Got new Operation");
                       
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
                        $scope.$apply(function () {
                            $scope.op = result.op;
                        });
                        setTimeout(function () {
                            $('span.alarm').each(function () {
                                utils.scale($(this).parent(), $(this));
                            });
                        }, 5);
                        //GoogleMaps Stuff
                        google.maps.visualRefresh = true;
                        google.maps.event.trigger(map, 'resize');
                        directionsDisplay.setDirections({ routes: [] });
                        google.maps.event.clearListeners(map, 'tilesloaded');
                        firstTime = true;
                        var dest = new google.maps.LatLng(result.op.Einsatzort.GeoLatitudeString, result.op.Einsatzort.GeoLongitudeString);

                        if (!showRoute) {
                            addGoogleMarker(dest);
                            goToLatLng(dest);
                        } else {
                            //ROUTE
                            directionsDisplay.setMap(map);
                            calcRoute(home, dest);
                        }

                        osm.setView([result.op.Einsatzort.GeoLatitudeString, result.op.Einsatzort.GeoLongitudeString], config.zoomLevelOSM);
                        addOsmMarker([result.op.Einsatzort.GeoLatitudeString, result.op.Einsatzort.GeoLongitudeString]);
                    }
                }
            } else {
                // Reset current operation and display the idle screen.
                currentOpId = -1;
            }
        }).fail(function () {
            // Reset current operation and display warning.
            currentOpId = -1;
        });
    }

    // Poll the service and read operation data, then apply to DOM.
    window.setInterval(loadOperationData, config.updateIntervalMs);

    $(loadOperationData);
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