(function() {
    this.rptFDate = '';
    this.rptTDate = '';
    this.rptFTime = '';
    this.rptTTime = '';
    this.rptLPate = '';
    this.report = [];
    this.allSpaces = 0;
    this.minutesUsed = 0;
    this.ratioUsed = 0.00;
}).apply(pkMgnt);


function initReport() {
    $("#rangeDates").val("");
    $("#reportPlate").val("");
    $("#divReport").css("height", pkMgnt.height-50);
    $("#monthSelector option").remove();
    prepareMonthRange();
    $("#monthSelector").on("change", getReportRange);
    $("#monthSelector").trigger("change");
    $("#dateTextFrom").val("");
    $("#dateTextTo").val("");
    $("#monthSelector option:first").trigger("selected");

    $("#hourFrom option").remove();
    $("#hourTo option").remove();
    $("#dateTextFrom").on("change", hideDisplayReport);
    $("#dateTextTo").on("change", hideDisplayReport);
    $("#hourFrom").on("change", hideDisplayReport);
    $("#hourTo").on("change", hideDisplayReport);
    $("#reportPlate").on("change", hideDisplayReport);

    for (var i=0; i<24; i++) {
        var strHour = i<10 ? "0"+i : i;
        var hourOption = "<option value=" + strHour +">" + strHour + ":00" + "</option>"
        $("#hourFrom").append(hourOption);
        $("#hourTo").append(hourOption);
    }
    $(".inputDatePicker").datepicker({
        format: "yyyy-mm-dd",
        startDate: "2016-02-01",
        endDate: "today",
        language: "zh-TW",
        autoclose: true
    });
    $(".btn-DatePicter").on("click", function() {
        $(this).prev().trigger("focus");
    });
    $("#reportPlate").val("");
    $("#showReport").on("click", getReport);
    $("#reportSaveCSV").on("click", function() {
        saveReport(0);
    });
    $("#reportSavePDF").on("click", function() {
        saveReport(1);
    });
}

function hideDisplayReport() {
    $("#displayReport").hide();
}

function prepareMonthRange() {
    $("#monthSelector").append("<option value=0>自訂範圍</option>");
    var todayDate = new Date();
    var eYear = todayDate.getFullYear();
    var eMonth = todayDate.getMonth() + 1;

    var beginDate = new Date(pkMgnt.startDate);
    var bYear = beginDate.getFullYear();
    var bMonth = beginDate.getMonth() + 1;
    while (true) {
        var strYear = eYear.toString();
        var strMonth = (eMonth<10) ? "0" + eMonth.toString() : eMonth.toString();
        var strDateOption = strYear + "-" + strMonth;
        var nDateOption = eYear * 100 + eMonth;
        $("#monthSelector").append("<option value="+nDateOption+">"+strDateOption+"</option>");
        if (eYear == bYear && eMonth == bMonth)
            return;
        eMonth = eMonth - 1;
        if (eMonth == 0) {
            eMonth = 12;
            eYear = eYear - 1;
        }
    }
}

function getReportRange() {
    hideDisplayReport();
    if ($("#monthSelector").val() == 0) {
        $("#rangeDates").val("");
        $(".inputDatePicker").attr("disabled", false);
        $(".btnDatePicker").attr("disabled", false);
    } else {
        $("#rangeDates").val($("#monthSelector").val());
        $(".inputDatePicker").attr("disabled", true);
        $(".btnDatePicker").attr("disabled", true);
        $("#dateTextFrom").val("");
        $("#dateTextTo").val("");
        var selectedYM = new Date($("#monthSelector option:selected").text());
        var lastYMD = new Date(selectedYM.getFullYear(), selectedYM.getMonth()+1, 0);
        var lastDay = lastYMD.getDate();
        var strRange = $("#monthSelector option:selected").text() + "-01 ~ " +
                       $("#monthSelector option:selected").text() + "-" + lastDay;
        $("#rangeDates").val(strRange);
    }
}

function getReport() {
    if ($("#monthSelector").val() == 0) {
        if ($("#dateTextFrom").val() > $("#dateTextTo").val()) {
            $("#titleWarning").text(pkMgnt.dialogTitles.period);
            $("#textWarning").text(pkMgnt.messages.err_period_date);
            $("#dialogWarning").modal("show");
            return;
        }
    }
    if ($("#hourFrom").val() > $("#hourTo").val()) {
        $("#titleWarning").text(pkMgnt.dialogTitles.hours);
        $("#textWarning").text(pkMgnt.messages.err_period_hour);
        $("#dialogWarning").modal("show");
        return;
    }

    if ($("#monthSelector").val() == 0) {
        var from_date = $("#dateTextFrom").val();
        var to_date = $("#dateTextTo").val();
        if (!from_date && !to_date) {
            $("#titleWarning").text(pkMgnt.dialogTitles.period);
            $("#textWarning").text(pkMgnt.messages.err_no_date);
            $("#dialogWarning").modal("show");
            return;
        }
    } else {
        var strRange = $("#rangeDates").val();
        var nDevision = strRange.indexOf(" ~ ");
        var from_date = strRange.substr(0, 10);
        var to_date = strRange.substr(nDevision+3, 10);
    }
    pkMgnt.rptFDate = from_date;
    pkMgnt.rptTDate = to_date;
    pkMgnt.rptFTime = $("#hourFrom").val();
    pkMgnt.rptTTime = $("#hourTo").val();
    pkMgnt.rptLPate = $("#reportPlate").val();

    var paramCGI = {
        from_date: from_date,
        to_date: to_date,
        from_hour: $("#hourFrom").val(),
        to_hour: $("#hourTo").val(),
        plate: $("#reportPlate").val(),
    };
    $("#ovDates").text(from_date + " ~ " + to_date);
    $("#ovPeriod").text($("#hourFrom").val() + ":00" + " ~ " + $("#hourTo").val() + ":00");
    if (!$("#reportPlate").val()) {
        $("#ovPlate").text("-");
    } else {
        $("#ovPlate").text($("#reportPlate").val());
    }
    $("#ovOccupancy").text("");
    $("#ovVacancy").text("");
    $("#displayReport").show();

    var url = pkMgnt.host + "/getLotsReport.cgi";
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        $("#bodyReport tbody tr").remove();
        if (parseInt(response.status) != 200) {
            $("#btnReportSaves").hide();
            return;
        }
        pkMgnt.allSpaces = response.spaces;
        pkMgnt.minutesUsed = 0;
        pkMgnt.ratioUsed = 0.00;
        $("#pathReportSave").html("");
        $("#btnReportSaves").show();
        pkMgnt.report = response.data;
        showRecords();
        if (!$("#reportPlate").val()) {
            showRatioUsed();
        }
    });
}

function showRecords() {
    $.each(pkMgnt.report, function(index, ary) {
        var fDate = new Date(ary[2].replace(/-/g, "/"));
        var eDate = new Date(ary[3].replace(/-/g, "/"));
        var difMin = Math.round((eDate.getTime() - fDate.getTime())/60000);
        pkMgnt.minutesUsed = pkMgnt.minutesUsed + difMin;
        var strReport = "<tr>" +
                        "<td>" + ary[2].substr(0, 10) + "</td>" +
                        "<td>" + ary[2].substr(11, 10) + "</td>" +
                        "<td>" + difMin + "</td>" +
                        "<td>" + ary[3].substr(0, 10) + "</td>" +
                        "<td>" + ary[3].substr(11, 10) + "</td>" +
                        "<td>" + ary[1] + "</td>" +
                        "<td>" + ary[0] + "</td>" +
                        "</tr>";
        $("#bodyReport tbody").append(strReport);
    });
}

function showRatioUsed() {
    var days = new Date(pkMgnt.rptTDate) - new Date(pkMgnt.rptFDate);
    days = Math.round(days / 86400000) + 1;
    var period = (parseInt(pkMgnt.rptTTime) - parseInt(pkMgnt.rptFTime)) * 60
    var minutesTotal = period * days;
    pkMgnt.ratioUsed = Math.round(pkMgnt.minutesUsed * 10000 / minutesTotal) / 100;
    $("#ovOccupancy").text(pkMgnt.ratioUsed + "%");
    $("#ovVacancy").text(100 - pkMgnt.ratioUsed + "%");
}

function saveReport(fileTpye) {
    var paramCGI = {
        from_date: pkMgnt.rptFDate,
        to_date: pkMgnt.rptTDate,
        from_hour: pkMgnt.rptFTime,
        to_hour: pkMgnt.rptTTime,
        plate: pkMgnt.rptLPate,
        file_type: fileTpye,
        ratio: pkMgnt.ratioUsed,
    };
    var url = pkMgnt.host + "/getLotsReport.cgi";
    pkMgnt.ajaxAPI(url, "POST", paramCGI, function(response) {
        if (parseInt(response.status) != 200) {
            $("#pathReportSave").html("存檔失敗");
        } else {
            $("#pathReportSave").html("存檔成功；路徑："+response.path);
        }
    });
}