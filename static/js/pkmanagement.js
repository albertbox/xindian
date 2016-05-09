(function() {
    this.events = [];
    this.selected_event = {};
}).apply(pkMgnt);


function initEvents() {
    $("#eventImage").attr("src", "");
    $("#event-img").css("height", pkMgnt.height);
    $("#eventImage").hide();
    $("#spaceLPlate").val("");
    $("#spaceLPlate").attr("disabled", true);
    $("#button-plate").attr("disabled", true);
    // Get Events
    getEvents();
    // Process of correction of license plate
    $("#button-plate").on("click", updatePlate);
    $("#button-action").on("click", actionUpdatePlate);
}


function getEvents() {
    var url = pkMgnt.host + "/getevents.cgi"
    pkMgnt.ajaxAPI(url, "GET", "", function(response) {
        var $tbody = $("#tbl-events tbody");
        pkMgnt.events = response.events;
        $("#tbl-events tbody tr").remove().off("click");
        $.each(pkMgnt.events, function(index, ary) {
            var strLevel = "";
            switch (ary.level) {
                case 1:
                    strLevel = "redLevel";
                    break;
                case 2:
                    strLevel = "orangeLevel";
                    break;
                case 3:
                    strLevel = "yellowLevel";
                    break;
            }
            if (!ary.plate)
                ary.plate = "";
            var strTR = "<tr>" +
                        "<td class='event-data-col-1 "+strLevel+"' " +
                        "idx-array='"+index+"'>&nbsp;&nbsp;</td>" +
                        "<td class='event-data-col-2'>" + "等待處理" + "</td>" +
                        "<td class='event-data-col-3'>" + ary.date + "</td>" +
                        "<td class='event-data-col-3'>" + pkMgnt.eventTitles[ary.level-1] + "</td>" +
                        "<td class='event-data-col-2'>" + ary.name + "</td>" +
                        "<td class='event-data-col-2'>" + ary.plate + "</td>" +
                        "</tr>"
            $tbody.append(strTR);
        });
        //$tbody.find("tr").on("click", getEventDetail(this));
        $tbody.find("tr").on("click", function() {
            var array_index = parseInt($(this).find('td').eq(0).attr('idx-array'));
            pkMgnt.selected_event = pkMgnt.events[array_index];
            with(pkMgnt.selected_event) {
                $("#spaceLocation").val(name);
                $("#spaceEventTime").val(date);
                $("#spaceEventType").val(pkMgnt.eventTitles[level-1]);
                $("#spaceLPlate").val(plate);
                pkMgnt.statusPSD(status);
            }
            getLotImage();
            $("#spaceLPlate").attr("disabled", false);
            $("#button-plate").attr("disabled", false);
            $("#nav-bar li").eq(0).trigger("click");
        });
    });
    if (pkMgnt.timeout != 0)
        setTimeout(function(){ getEvents() }, pkMgnt.timeout)
}

function getLotImage() {
    $("body").css("cursor", "progress");
    var imgPath = pkMgnt.selected_event.image;
    var pos = imgPath.lastIndexOf("_");
    imgPath = imgPath.substr(0, pos) + "_ANPR.jpg";
    var paramCGI = {
        "path": imgPath,
    };
    var url = pkMgnt.host + "/getimg.cgi";
    pkMgnt.ajaxImg(url, "POST", paramCGI, function(response) {
        if (!response) {
            $("#eventImage").hide();
        } else {
            $("#eventImage").hide()
                            .attr("src", "data:image/jpg;charset=utf-8;base64,"+response);
            var imgH = parseInt($("#eventImage").css("height"));
            var imgW = parseInt($("#eventImage").css("width"));
            if (pkMgnt.height > imgH && pkMgnt.width < imgW) {
                $("#eventImage").css("width", pkMgnt.width);
            } else if (pkMgnt.height < imgH && pkMgnt.width > imgW) {
                $("#eventImage").css("height", pkMgnt.height);
            } else {
                var ratioH = pkMgnt.height / imgH;
                var ratioW = pkMgnt.width / imgW;
                if (ratioH > ratioW) {
                    $("#eventImage").css("width", pkMgnt.width);
                } else {
                    $("#eventImage").css("height", pkMgnt.height);
                }
            }
            $("#eventImage").show();
        }
        $("body").css("cursor", "default");
    });
}

function updatePlate() {
    if (!$("#spaceLPlate").val()) {
        $("#titleWarning").html(pkMgnt.dialogTitles.plate);
        $("#textWarning").html(pkMgnt.messages.err_noplate);
        $("#button-close").show();
        $("#dialogWarning").modal("show");
    } else {
        $("#titleConfirm").html(pkMgnt.dialogTitles.plate);
        $("#textConfirm").html(pkMgnt.messages.cfm_updplate);
        $("#button-action").show();
        $("#button-cancel").show();
        $("#dialogConfirm").modal("show");
    }
}

function actionUpdatePlate() {
    var paramCGI = {
        index: pkMgnt.selected_event.index,
        plate: $("#spaceLPlate").val(),
    };
    var url = pkMgnt.host + "/updateplate.cgi";
    //pkMgnt.ajaxAPI(url, "POST", JSON.stringify(paramCGI), function(response) {
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        if (response.status == 200) {
            $("#titleInfo").html(pkMgnt.dialogTitles.plate);
            $("#textInfo").html(pkMgnt.messages.cfm_updplate_ok);
            $("#dialogInfo").modal("show");
        } else {
            $("#titleWarning").html(pkMgnt.dialogTitles.plate);
            $("#textWarning").html(pkMgnt.messages.err_update_plate);
            $("#dialogWarning").modal("show");
        }
    });
}
