var pkMgnt = {};
(function() {
    this.host = "http://" + window.location.host;
    this.timeout = 0;
    this.interval = 5000;
    this.height = 0;
    this.width = 0;
    this.ms_interval = 30;
    this.times_interval = 200;  // the interval: this.ms_interval * this.times_interval
    this.startDate = "2016-02-01";
    this.eventTitles = [
        "無車牌但有偵測到車",
        "車牌數字低於兩碼",
        "車牌數字低於四碼",
        "數位攝影機斷線，或訊號異常",
        "有車牌但卻顯示無車",
    ];
    this.dialogTitles = {
        plate: "變更車牌",
        period: "日期區間錯誤",
        hours: "時間區間錯誤",
    };
    this.messages = {
        cfm_updplate: "是否確定變更車牌號碼",
        cfm_updplate_ok: "車牌號碼已變更成功",
        err_noplate: "請輸入車牌號碼",
        err_update_plate: "車牌更新失敗",
        err_no_date: "起始日期及截止日期皆不可空白",
        err_period_date: "起始日期不可晚於截止日期",
        err_period_hour: "起始時間不可晚於截止時間",
    };
    this.statusSpace = [
        "Available", "Occupied", "Anomaly"
    ]

    this.ajaxPOST = function(url, params, action) {
        $.ajax({
            url: url,
            type: 'POST',
            //contentType: 'application/json',
            async: false,
            data: params,
            dataType: 'json',
            error: function(xhr, status) {
                $('#divDialog .errmsg').hide();
                switch (xhr.statusText) {
                    case "error": break;
                    case "timeout": break;
                    default: break;
                }
            },
            success : function(response) {
                if(action) { action(response); }
            }
        });
    };

    this.ajaxAPI = function(url, method, params, action) {
        $.ajax({
            url: url,
            type: method,
            //contentType: 'application/json',
            async: false,
            data: params,
            dataType: 'json',
            error: function(xhr, status) {
                switch (xhr.statusText) {
                    case "error": break;
                    case "timeout": break;
                    default: break;
                }
            },
            success : function(response) {
                if(action) { action(response); }
            }
        });
    };

    this.ajaxImg = function(url, method, params, action) {
        $.ajax({
            url: url,
            type: method,
            //contentType: 'application/json',
            async: true,
            data: params,
            error: function(xhr, status) {
                switch (xhr.statusText) {
                    case "error": break;
                    case "timeout": break;
                    default: break;
                }
            },
            success : function(response) {
                if(action) { action(response); }
            }
        });
    };

    this.statusPSD = function(psd) {
        switch (psd) {
            case 1:
                $("#colorStatus").css("background-color", "#00FF00");
                $("#psdStatus").val(pkMgnt.statusSpace[0]);
                break;
            case 2:
                $("#colorStatus").css("background-color", "#FF0000");
                $("#psdStatus").val(pkMgnt.statusSpace[1]);
                break;
            default:
                $("#colorStatus").css("background-color", "#FFFF00");
                $("#psdStatus").val(pkMgnt.statusSpace[2]);
                break;
        }
    };
}).apply(pkMgnt);

$(function() {
    var idxHost = window.location.href.lastIndexOf("/");
    pkMgnt.host = window.location.href.substr(0, idxHost);

    init();
    initEvents();
    initMap();
    initReport();
     $("#nav-bar li").eq(0).trigger("click");
});

function init() {
    //pkMgnt.height = parseInt($(document).height());
    //pkMgnt.height = window.innerHeight;
    pkMgnt.height = screen.height - 175 - 15 - 130 - 20*2 - 10;
    pkMgnt.width = parseInt($("#img_display").width()) - 30;
    $("#colorStatus").css("height", $("#psdStatus").css("height"));

    $("#nav-bar li").on("click", function() {
        $("#nav-bar li").removeClass("active");
        menu_click($(this).text());
    });

    $("#button-close").on("click", function() {
        $("#dialogModal").modal("hide");
    });
    $("#button-cancel").on("click", function() {
        $("#dialogModal").modal("hide");
    });
}

function menu_click(target) {
    $(".div-live-map").hide();
    $(".div-reports").hide();
    $(".map-only").hide();
    $(".leddisplay").hide();
    var nNavBar = 0;
    switch(target) {
        case "LIVE / EVENT":
            if ($("#eventImage").attr("src"))
                $("#img_display").show();
            $(".event-only").show();
            $(".map-only").hide();
            $(".div-live-map").show();
            nNavBar = 0;
            break;
        case "MAP":
            $("#spaceLocation").val("");
            $("#spaceEventTime").val("");
            $("#spaceEventType").val("");
            $("#spaceLPlate").val("");
            $("#psdStatus").val("");
            $("#spaceAvailable").val("");
            $(".event-only").hide();
            $(".map-only").show();
            $(".div-live-map").show();
            nNavBar = 1;
            break;
        case "REPORT":
            $(".div-reports").show();
            nNavBar = 2;
            break;
    };
    $("#nav-bar li").eq(nNavBar).addClass("active");
}