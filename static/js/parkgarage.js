var DefaultSpace = {
    radius:     10,
    identifier: "",
    color:      "#AAAAAA",
    textColor:  "#000000",
    textAlign:  "center",
}
var DefaultLED = {
    width: 40,
    height: 30,
    identifier: "",
}
var ImgLED = {};
ImgLED.available = new Image();
ImgLED.available.src = "images/LED_available.jpg";
ImgLED.available_view = new Image();
ImgLED.available_view.src = "images/LED_available_view.jpg";
ImgLED.full = new Image();
ImgLED.full.src = "images/LED_full.jpg";
ImgLED.full_view = new Image();
ImgLED.full_view.src = "images/LED_full_view.jpg";

//*****************************************************************************
// Class: Space for parking-space
//*****************************************************************************
// Constructor for Space to hold data for every rectangle parking space
function Space(x, y, r, identifier, fill, status, cardid, dte) {
    this.x          = x          || 0;
    this.y          = y          || 0;
    this.r          = r          || DefaultSpace.radius;
    this.identifier = identifier || DefaultSpace.identifier;
    this.fill       = fill       || DefaultSpace.color;
    this.status     = status     || 0;
    this.cardid     = cardid     || '';
    this.dte        = dte        || '';
    this.isStroke     = false;
}

// Draws this space to a given context
Space.prototype.draw = function(ctx) {
    ctx.fillStyle = this.fill;

    //ctx.fillStyle = "#3370d4";
    ctx.fillStyle = this.fill;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, 2*Math.PI);
    ctx.closePath();
    ctx.fill();
    if (this.isStroke)
        ctx.stroke();

    //ctx.fillStyle = DefaultSpace.textColor;
    //ctx.textAlign = DefaultSpace.textAlign;
    //ctx.fillText(this.identifier, this.x, this.y+this.r);
}

// Determine if a point is inside the space's bounds
Space.prototype.contains = function(mx, my) {
    return ((Math.pow(this.x-mx, 2) + Math.pow(this.y-my, 2)) < Math.pow(this.r,2));
}

//*****************************************************************************
// Class: LED
//*****************************************************************************
// Constructor for Space to hold data for every rectangle parking space
function LED(x, y, w, h, identifier, space_member, space_sum) {
    this.x            = x            || 0;
    this.y            = y            || 0;
    this.w            = w            || DefaultLED.width;
    this.h            = h            || DefaultLED.height;
    this.identifier   = identifier   || DefaultSpace.identifier;
    this.space_member = space_member || [];
    this.space_sum    = space_sum    || 0;
    this.isStroke     = false;
}

// Draws this space to a given context
LED.prototype.draw = function(ctx) {
    if(this.isStroke) {
        if(this.space_sum == 0)
            ctx.drawImage(ImgLED.full_view, this.x, this.y, this.w, this.h);
        else
            ctx.drawImage(ImgLED.available_view, this.x, this.y, this.w, this.h);
    } else {
        if(this.space_sum == 0)
            ctx.drawImage(ImgLED.full, this.x, this.y, this.w, this.h);
        else
            ctx.drawImage(ImgLED.available, this.x, this.y, this.w, this.h);
    }
    //ctx.drawImage(ImgLED.available, this.x, this.y, this.w, this.h);
}

// Determine if a point is inside the space's bounds
LED.prototype.contains = function(mx, my) {
    return  (this.x <= mx) && (this.x + this.w >= mx) &&
            (this.y <= my) && (this.y + this.h >= my);
}

//*****************************************************************************
// Class: ParkGarage for parking garage
//*****************************************************************************
function ParkGarage(canvas, background_map) {
    // **** First some setup! ****
    this.canvas    = canvas;
    this.width     = canvas.width;
    this.height    = canvas.height;
    this.ctx       = canvas.getContext("2d");
    this.shiftX    = 0;
    this.shiftY    = 0;
    this.backmap   = background_map;
    this.counter   = 0;

    // Fixe mouse co-ordinate problems when there's a border or padding.
    var stylePaddingLeft, stylePaddingTop, styleBorderLeft, styleBorderTop;
    if(document.defaultView && document.defaultView.getComputedStyle) {
        this.stylePaddingLeft = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingLeft'], 10)      || 0;
        this.stylePaddingTop  = parseInt(document.defaultView.getComputedStyle(canvas, null)['paddingTop'], 10)       || 0;
        this.styleBorderLeft  = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderLeftWidth'], 10)  || 0;
        this.styleBorderTop   = parseInt(document.defaultView.getComputedStyle(canvas, null)['borderTopWidth'], 10)   || 0;
    }

    // Fix mouse coordinate when there's fixed-position bars at the top or left of the page
    var html = document.body.parentNode;
    this.htmlTop = html.offsetTop;
    this.htmlLeft = html.offsetLeft;

    // **** Keep track of state! ****
    this.valid          = false;  // when set to false, the canvas will redraw everything
    this.spaces         = [];     // the collection of parking spaces to be drawn
    this.leds           = [];     // the collection of LEDs to be drawn
    this.dragging       = false;  // Keep track of when we are dragging
    this.selection      = null;
    this.selectionIndex = -1;
    this.dragoffx       = 0;
    this.dragoffy       = 0;

    // **** Then events! ****
    // Using closure, and right here "this" means the ParkGarage.
    var myState = this;

    // Up, down, and move are for dragging
    canvas.addEventListener("mousedown", function(e) {
        var mouse  = myState.getMouse(e);
        var mx     = mouse.x;
        var my     = mouse.y;
        var spaces = myState.spaces;
        var l      = spaces.length;
        for(var i=l-1; i>=0; i--) {
            if(spaces[i].contains(mx, my)) {
                var mySel = spaces[i];
                // Keep track of where in the object we clicked
                myState.dragoffx = mx - mySel.x;
                myState.dragoffy = my - mySel.y;
                myState.dragging = true;
                myState.selection = mySel;
                myState.selectionIndex = i;
                myState.valid = false;
                return;
            }
        }
        var leds = myState.leds;
        var m      = leds.length;
        for(var i=m-1; i>=0; i--) {
            if(spaces[i].contains(mx, my)) {
                var mySel = leds[i];
                // Keep track of where in the object we clicked
                myState.dragoffx = mx - mySel.x;
                myState.dragoffy = my - mySel.y;
                myState.dragging = true;
                myState.selection = mySel;
                myState.selectionIndex = i;
                myState.valid = false;
                return;
            }
        }
    }, true);

    canvas.addEventListener("click", function(e) {
        myState.valid = false;
        var mouse = myState.getMouse(e);
        if(!myState.isMouseInSpaces(mouse)) {
            myState.isMouseInLEDs(mouse)
        }
    }, true);

    // **** Options! ****
    this.interval       = pkMgnt.ms_interval;
/*
    this.selectionColor = "#CC0000";
    this.selectionWidth = 2;
    setInterval(function() {
        myState.counter++;
        if (myState.counter >= pkMgnt.times_interval) {
            var spstatus = getSpacesStatus();
            var spname = [];
            $.each(spstatus, function() {
                spname.push(this.identifier);
            });
            $.each(myState.spaces, function(index) {
                var idx = spname.indexOf(this.identifier);
                if (idx != -1) {
                    myState.spaces[index].fill = spstatus[idx].fillcolor;
                }
            });
            myState.counter = 0;
            myState.valid = false;
        }
        myState.draw();
    }, myState.interval);
*/
}

ParkGarage.prototype.addSpace = function(space) {
    this.spaces.push(space);
    this.valid = false;
}

ParkGarage.prototype.addLED = function(led) {
    this.leds.push(led);
    this.valid = false;
}

ParkGarage.prototype.clear = function() {
    this.ctx.clearRect(0, 0, this.width, this.height);
}

// While draw is called as often as the INTERVAL variable demands,
// It only ever does something if the canvas gets invalidated by our code
ParkGarage.prototype.draw = function() {
    // if our state is invalid, redraw and validate!
    if(!this.valid) {
        var ctx    = this.ctx;
        var spaces = this.spaces;
        var leds = this.leds;
        this.clear();
        ctx.drawImage(this.backmap, this.shiftX, this.shiftY);

        // ** Add stuff you want drawn in the background all the time here **
        // draw all spaces
        var l = spaces.length;
        for(var i=0; i<l; i++) {
            var space = spaces[i];
            // We can skip the drawing of elements that have moved off the screen:
            if(space.x-space.r/2 > this.width || space.y-space.r/2 > this.height || 
               space.x+space.r/2 < 0 || space.y+space.r/2 < 0)
                continue;
            spaces[i].draw(ctx, this.shiftX, this.shiftY);
        }
        // draw LEDs
        pkMgnt.drawColor = pkMgnt.colorFull;
        var l = leds.length;
        for(var i=0; i<l; i++) {
            var led = leds[i];
            // We can skip the drawing of elements that have moved off the screen:
            if(led.x > this.width || led.y > this.height || 
               led.x+led.w < 0 || led.y+led.h < 0)
                continue;
            led.draw(ctx, this.shiftX, this.shiftY);
        }
        this.valid = true;
    }
}

// Creates an object with x and y defined, set to the mouse position relative to the state's canvas
// If you wanna be super-correct this can be tricky, we have to worry about padding and borders
ParkGarage.prototype.getMouse = function(e) {
    var element = this.canvas;
    var offsetX = 0;
    var offsetY = 0;
    var mx;
    var my;

    // Compute the total offset
    if(element.offsetParent !== undefined) {
        do {
            offsetX += element.offsetLeft;
            offsetY += element.offsetTop;
        } while((element = element.offsetParent));
    }

    // Add padding and border style widths to offset
    // Also add the <html> offsets in case there's a position:fixed bar
    offsetX += this.stylePaddingLeft + this.styleBorderLeft + this.htmlLeft;
    offsetY += this.stylePaddingTop  + this.styleBorderTop  + this.htmlTop;

    mx = e.pageX - offsetX;
    my = e.pageY - offsetY;

    // We return a simple javascript object (a hash) with x and y defined
    return {x: mx, y: my};
}

// Check the mouser position is in any space range
ParkGarage.prototype.isMouseInSpaces = function(mouse) {
    var mx     = mouse.x;
    var my     = mouse.y;
    var spaces = this.spaces;
    var l      = spaces.length;
    for(var i=l-1; i>=0; i--) {
        if(spaces[i].contains(mx, my)) {
            $("#spaceLocation").val(spaces[i].identifier);
            $("#spaceEventTime").val(spaces[i].dte);
            $("#spaceLPlate").val(spaces[i].cardid);
            $("#spaceEventType").val("");
            $("#spaceLPlate").prop("disabled", true);
            $("#button-plate").prop("disabled", true);
            switch((spaces[i].cardid).length) {
                case 0:
                    if (spaces[i].status==2) {
                        $("#spaceEventType").val(pkMgnt.eventTitles[0]);
                    }
                    break;
                case 1: case 2:
                    $("#spaceEventType").val(pkMgnt.eventTitles[1]);
                    $("#spaceLPlate").prop("disabled", false);
                    $("#button-plate").prop("disabled", false);
                    break;
                case 3: case 4:
                    $("#spaceEventType").val(pkMgnt.eventTitles[2]);
                    $("#spaceLPlate").prop("disabled", false);
                    $("#button-plate").prop("disabled", false);
                    break;
                default:
                    if (spaces[i].status==6)
                        $("#spaceEventType").val(pkMgnt.eventTitles[3]);
                    else if (spaces[i].status==1)
                        $("#spaceEventType").val(pkMgnt.eventTitles[4]);
                    break;
            }
            pkMgnt.statusPSD(spaces[i].status);
            return true;
        }
    }
    return false;
}

ParkGarage.prototype.isMouseInLEDs = function(mouse) {
    var mx     = mouse.x;
    var my     = mouse.y;
    var leds   = this.leds;
    var l      = leds.length;
    var ctx    = this.ctx;
    
    for(var i=0; i<l; i++)
        leds[i].isStroke = false;
    $(".leddisplay").hide();

    for(var i=l-1; i>=0; i--) {
        if(leds[i].contains(mx, my)) {
            leds[i].isStroke = true;
            clearInterval(pkMgnt.mapInterval);
            var space_available = 0;
            $.each(pkMgnt.parkgarage.spaces, function() {
                if (leds[i].space_member.indexOf(this.identifier) != -1) {
                    this.isStroke = true;
                    if (this.status == 1)
                        space_available++;
                } else {
                    this.isStroke = false;
                }
            });
            pkMgnt.mapInterval = setInterval(renderInterval, pkMgnt.parkgarage.interval);
            $("#spaceAvailable").val(space_available);
            $(".leddisplay").show();
            return true;
        }
    }
    // If mouse not in any space and LED, do not show stroke...
    $.each(pkMgnt.parkgarage.spaces, function() {
        this.isStroke = false;
    });
    return false;
}

// Move all spaces to new coordinates
ParkGarage.prototype.shiftAll = function(shiftX, shiftY) {
    var spaces = this.spaces;
    var l = spaces.length;
    for(var i=0; i<l; i++) {
        spaces[i].x += shiftX - this.shiftX;
        spaces[i].y += shiftY - this.shiftY;
    }
    var leds = this.leds;
    var l = leds.length;
    for(var i=0; i<l; i++) {
        leds[i].x += shiftX - this.shiftX;
        leds[i].y += shiftY - this.shiftY;
    }
    this.shiftX = shiftX;
    this.shiftY = shiftY;
}

//
ParkGarage.prototype.clearSelection = function() {
    this.selection = null;
    this.selectionIndex = -1;
    this.valid = false;
}

// Modifiy the parking space identifier
ParkGarage.prototype.modifySpace = function(id) {
    if(!this.selection) return false;
    this.spaces[this.selectionIndex].identifier = id;
    this.valid = false;
    return true;
}

// Remove the parking space from spaces
ParkGarage.prototype.removeSpace = function() {
    if(!this.selection) return false;
    this.spaces.splice(this.selectionIndex, 1);
    this.selection = null;
    this.selectionIndex = -1;
    this.valid = false;
    return true;
}