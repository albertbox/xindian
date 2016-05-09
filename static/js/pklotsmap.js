(function() {
    this.mapHeight = 0;
    this.mapWidth = 0;
    this.mapLocation = [
        "images/Map.jpg",
        "images/Floor Plan_1-02.jpg",
    ];
    this.mapHeightAllowed = 400;
    this.ratio;
    this.parkgarage;
    this.index=0;
    this.colorEmpty   = "rgba(0, 255, 0, .8)";
    this.colorFull    = "rgba(255, 0, 0, .8)";
    this.colorAnomaly = "rgba(255, 255, 0, .8)";
    this.mapInterval;
    this.shiftX = 0;
    this.shiftY = 0;
}).apply(pkMgnt);

function initMap() {
    var idx = parseInt($("#maplocation").val());

    var mapParkGarage = new Image();
    mapParkGarage.src = pkMgnt.mapLocation[idx];
    mapParkGarage.onload = function() {

        // Thumbnail...display according to width
        $("#map_thumbnail").css("background-image", "url('" + pkMgnt.mapLocation[idx] + "')");
        pkMgnt.ratio = mapParkGarage.width / $("#map_thumbnail").width();
        $("#map_thumbnail").css("height", Math.ceil(mapParkGarage.height / pkMgnt.ratio));

        // Setup the parking garage map view size according to the ratio above
        var borderLeft = parseInt($("#view_thumbnail").css("border-left-width"));
        var borderRight = parseInt($("#view_thumbnail").css("border-right-width"));
        var borderTop = parseInt($("#view_thumbnail").css("border-top-width"));
        var borderBottom = parseInt($("#view_thumbnail").css("border-bottom-width"));

        var viewWidth = parseInt($("#garage_map").attr("width"));
        var viewHeight = parseInt($("#garage_map").attr("height"));
        $("#view_thumbnail").css("width", Math.floor(viewWidth/pkMgnt.ratio)-borderLeft-borderRight);
        $("#view_thumbnail").css("height", Math.floor(viewHeight/pkMgnt.ratio)-borderTop-borderBottom);

        pkMgnt.parkgarage = new ParkGarage(document.getElementById("garage_map"), mapParkGarage);
        setupAllSpaces();
        pkMgnt.mapInterval = setInterval(renderInterval, pkMgnt.parkgarage.interval);
    }

    var borderPLeft = parseInt($("#map_thumbnail").css("border-left-width"));
    var borderPTop = parseInt($("#map_thumbnail").css("border-top-width"));
    $("#view_thumbnail").draggable({
        opacity: 1.0,
        containment: "#map_thumbnail",
        scroll: false,
        drag: function(event, ui) {
            var $viewposition = $("#map_thumbnail").position();
            var shiftX = 0 - Math.round((ui.position.left - $viewposition.left - borderPLeft) * pkMgnt.ratio);
            var shiftY = 0 - Math.round((ui.position.top - $viewposition.top - borderPTop) * pkMgnt.ratio);
            pkMgnt.parkgarage.shiftAll(shiftX, shiftY);
            pkMgnt.parkgarage.clearSelection();
            pkMgnt.shiftX = shiftX;
            pkMgnt.shiftY = shiftY;
        },
        stop: function(event, ui) {
            //pkMgnt.mapInterval = setInterval(setupAllSpaces, pkMgnt.interval);
        }
    });
}

function setupAllSpaces() {
    pkMgnt.parkgarage.ctx.clearRect(0, 0,
                                    $("#garage_map").prop("width"),
                                    $("#garage_map").prop("height"));
    var url = pkMgnt.host + "/getspaces.cgi";
    var paramCGI = "";
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        var aryShapes = [];
        $.each(response.spaces, function(index, ary) {
            switch(ary[3]) {
                case 1:
                    drawColor = pkMgnt.colorEmpty;
                    break;
                case 2:
                    drawColor = pkMgnt.colorFull;
                    break;
                default:
                    drawColor = pkMgnt.colorAnomaly;
                    break;
            }
            aryShapes.push({xaxis:ary[1],      yaxis:ary[2],       radius:10,
                            identifier:ary[0], fillcolor:drawColor,
                            status:ary[3],     cardid:ary[4],      dte:ary[5]});
        });
        //pkMgnt.parkgarage.spaces = [];
        $.each(aryShapes, function() {
            pkMgnt.parkgarage.addSpace(new Space(this.xaxis+pkMgnt.shiftX, this.yaxis+pkMgnt.shiftY, this.radius,
                                                 this.identifier, this.fillcolor,
                                                 this.status, this.cardid, this.dte));
        });
    });

    url = pkMgnt.host + "/getleds.cgi";
    paramCGI = "";
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        var aryLEDs = response.leds;
        //pkMgnt.parkgarage.leds = [];
        $.each(aryLEDs, function(index) {
            pkMgnt.parkgarage.addLED(new LED(this[1]+pkMgnt.shiftX, this[2]+pkMgnt.shiftY,
                                             "", "", "",
                                             response.ledspaces[index],
                                             response.ledsum[index]));
        });
    });
}

function getSpacesStatus() {
    var url = pkMgnt.host + "/getspaces.cgi";
    var paramCGI = "";
    var arySpaces = [];
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        $.each(response.spaces, function(index, ary) {
            switch(ary[3]) {
                case 1:
                    drawColor = pkMgnt.colorEmpty;
                    break;
                case 2:
                    drawColor = pkMgnt.colorFull;
                    break;
                default:
                    drawColor = pkMgnt.colorAnomaly;
                    break;
            }
            arySpaces.push({xaxis:ary[1],      yaxis:ary[2],       radius:10,
                            identifier:ary[0], fillcolor:drawColor,
                            status:ary[3],     cardid:ary[4],      dte:ary[5]});
        });
    });
    return arySpaces;
}

function renderInterval() {
    pkMgnt.parkgarage.counter++;
    if (pkMgnt.parkgarage.counter >= pkMgnt.times_interval) {
        var spstatus = getSpacesStatus();
        var spname = [];
        $.each(spstatus, function() {
            spname.push(this.identifier);
        });
        $.each(pkMgnt.parkgarage.spaces, function(index) {
            var idx = spname.indexOf(this.identifier);
            if (idx != -1) {
                pkMgnt.parkgarage.spaces[index].status = spstatus[idx].status;
                pkMgnt.parkgarage.spaces[index].fill = spstatus[idx].fillcolor;
            }
        });
        if($("#spaceAvailable").css("display") != "none") {
            for(var i=0; i<pkMgnt.parkgarage.leds.length; i++) {
                if(pkMgnt.parkgarage.leds[i].isStroke) {
                    var sum = 0;
                    $.each(pkMgnt.parkgarage.spaces, function(idx) {
                        if(pkMgnt.parkgarage.leds[i].space_member.indexOf(this.identifier) != -1) {
                            if(this.status == 1)
                                sum++;
                        }
                    });
                    pkMgnt.parkgarage.leds[i].space_sum = sum;
                    $("#spaceAvailable").val(sum);
                    break;
                }
            }
        }
        pkMgnt.parkgarage.counter = 0;
        pkMgnt.parkgarage.valid = false;

        getEvents();
    }
    pkMgnt.parkgarage.draw();
}