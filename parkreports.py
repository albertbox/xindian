import json
import csv
from datetime import datetime, timedelta
from time import strftime

from flask import Flask, request, g, make_response, redirect
from flask import Blueprint

from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas

parkreports = Blueprint('parkreports', __name__)
filepath = "D:\\reports\\"


#============================================================================
# Generate report information
#============================================================================
@parkreports.route('/getLotsReport.cgi', methods=['POST'])
def getLotsReport():
    global filepath

    params = {}
    params['from_date'] = request.form.get('from_date', None)
    params['to_date'] = request.form.get('to_date', None)
    params['from_hour'] = request.form.get('from_hour', None)
    params['to_hour'] = request.form.get('to_hour', None)
    params['plate'] = request.form.get('plate', None)
    params['file_type'] = request.form.get('file_type', None)
    params['ratio'] = request.form.get('ratio', None)

    from_hour_cmp = params['from_hour'] + ":00:00"
    to_hour_cmp = params['to_hour'] + ":00:00"

    sqlLots = "SELECT COUNT(*) FROM ep_space"
    sql = ("""SELECT psnum, cardid, full_dte, empty_dte
                FROM ep_record_io
               WHERE NOT(convert(varchar(10), empty_dte, 20) < '{}' OR
                         convert(varchar(10), full_dte, 20) > '{}')
                 AND NOT(convert(varchar(10), empty_dte, 8) < '{}' OR
                         convert(varchar(10), full_dte, 8) > '{}')"""
            .format(params['from_date'], params['to_date'],
                    from_hour_cmp, to_hour_cmp))
    if params['plate'] is not None and params['plate'] != '':
        params['plate'] = params['plate'].replace("-", "")
        sql = sql + " AND cardid = '{}'".format(params['plate'])

    cursor = g.db.cursor()
    all_spaces = 0
    try:
        if params['plate'] is None or params['plate'] == '':
            cursor.execute(sqlLots)
            row = cursor.fetchone()
            all_spaces = row[0]

        cursor.execute(sql)
        rows = cursor.fetchall()
        parklots = []
        minutes_taken = 0
        for row in rows:
            parklots_row = list(row)
            parklots_row[2] = str(parklots_row[2])
            parklots_row[3] = str(parklots_row[3])
            parklots.append(parklots_row)
        if len(parklots) == 0:                          # No data
            return json.dumps({'status': 204})

        if params['file_type'] is None:                 # Return data, not printing
            return json.dumps({'status': 200, 'data': parklots, 'spaces': all_spaces})

        if params['file_type'] == "0":                  # Save data in CSV format
            fname = filepath + "xindian_" + strftime('%Y%m%d_%H%M%S') + ".csv"
            if printCSV(fname, params, parklots):
                return json.dumps({'status': 200, 'path': fname})
            else:
                return json.dumps({'status': 400})
        
        if params['file_type'] == "1":                # Save data in PDF format
            fname = filepath + "xindian_" + strftime('%Y%m%d_%H%M%S') + ".pdf"
            if printPDF(fname, params, parklots):
                return json.dumps({'status': 200, 'path': fname})
            else:
                return json.dumps({'status': 400})

        return json.dumps({'status': 400})              # Something is wrong
    except:                                             # Error raised
        return json.dumps({'status': 400})

def printCSV(fname, params, parklots):
    rptTitle = setReportTitle(params)
    try:
        f = open(fname, "w", newline='')
        w = csv.writer(f)
        # Overview
        csvOverview = []
        csvOverview.append(['日期區間', rptTitle['rptDates']])
        csvOverview.append(['時段', rptTitle['rptPeriod']])
        csvOverview.append(['車牌號碼', rptTitle['rptPlate']])
        csvOverview.append(['使用率', rptTitle['rptUsed'], '空格率', rptTitle['rptUnused']])
        w.writerows(csvOverview)
        w.writerows([''])

        # Each record
        rptRecord = [['進入日期', '進入時間', '分鐘數', '離開日期', '離開時間',
                      '車牌號碼', '車格編號']]
        for row in parklots:
            difDateTime = (datetime.strptime(row[3], "%Y-%m-%d %H:%M:%S") - 
                           datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S"))
            difMinutes = difDateTime.days * 1440 + round(difDateTime.seconds / 60)
            rptRecord.append([row[2][:10], row[2][11:], difMinutes,
                              row[3][:10], row[3][11:], row[1], row[0]])
        w.writerows(rptRecord)
        f.close()
        return True
    except:
        return False


def printPDF(fname, params, parklots):
    startX = 50
    startY = 800
    heightLine = 20
    cntLines = 0
    cntPageLines = 38
    def calcPDFLine():
        nonlocal cnt
        nonlocal cntLines
        nonlocal cntPageLines
        if cntLines > cntPageLines:
            cnt.showPage()
            cnt.setFont('fontNormal', 12)
            cntLines = 1

    rptTitle = setReportTitle(params)
    try:
        cnt = canvas.Canvas(fname, pagesize=A4)
        #pdfmetrics.registerFont(TTFont('fontBold', 'HGRHG9.ttc'))
        #pdfmetrics.registerFont(TTFont('fontNormal', 'HGRHG3.ttc'))
        pdfmetrics.registerFont(TTFont('fontBold', 'MSJHBD.ttc'))
        pdfmetrics.registerFont(TTFont('fontNormal', 'MSJH.ttc'))
        pdfmetrics.registerFont(TTFont('mingliu', 'mingliu.ttc'))
        ovTitle = ['日期區間： ' +  rptTitle['rptDates'],
                   '時　　段： ' +  rptTitle['rptPeriod'],
                   '車牌號碼： ' +  rptTitle['rptPlate'],
                   ('使用率　： ' +  rptTitle['rptUsed'] + '　　　'
                    '空格率　： ' + rptTitle['rptUnused']),
                   ' ', ' ']
        # Print Overview...
        cnt.setFont('fontBold', 12)
        for i in range(len(ovTitle)):
            cntLines = cntLines + 1
            calcPDFLine()
            cnt.drawString(startX, (startY-(cntLines-1)*heightLine), ovTitle[i])

        # Print Detail Data...
        rptRecord = ['進入日期', '進入時間', '分鐘數', '離開日期', '離開時間',
                     '車牌號碼', '車格編號']
        rptWidth = [0, 80, 150, 200, 280, 350, 420]
        cnt.setFont('fontNormal', 12)
        cntLines = cntLines + 1
        calcPDFLine()
        posY = startY - (cntLines - 1) * heightLine
        for idx in range(len(rptRecord)):
            posX = startX + rptWidth[idx]
            cnt.drawString(posX, posY, rptRecord[idx])
        cntLines = cntLines + 1
        calcPDFLine()
        posY = startY - (cntLines - 1) * heightLine
        for idx in range(startX-16, 530):
            cnt.drawString(idx, posY, "=")
        for row in parklots:
            difDateTime = (datetime.strptime(row[3], "%Y-%m-%d %H:%M:%S") - 
                           datetime.strptime(row[2], "%Y-%m-%d %H:%M:%S"))
            difMinutes = difDateTime.days * 1440 + round(difDateTime.seconds / 60)
            cntLines = cntLines + 1
            calcPDFLine()
            posY = startY - (cntLines - 1) * heightLine
            cnt.drawString(startX+rptWidth[0], posY, row[2][:10])
            cnt.drawString(startX+rptWidth[1], posY, row[2][11:])
            cnt.drawString(startX+rptWidth[2], posY, str(difMinutes))
            cnt.drawString(startX+rptWidth[3], posY, row[3][:10])
            cnt.drawString(startX+rptWidth[4], posY, row[3][11:])
            cnt.drawString(startX+rptWidth[5], posY, row[1])
            cnt.drawString(startX+rptWidth[6], posY, row[0])

        cnt.save()
        return True;
    except:
        return False


def setReportTitle(params):
    rptTitle = {}
    rptTitle['rptDates'] = params['from_date'] + " ～ " + params['to_date']
    rptTitle['rptPeriod'] = params['from_hour'] + ":00 ～ " + params['to_hour'] + ":00"
    if params['plate'] is None or params['plate'] == '':
        rptTitle['rptPlate'] = "-"
        rptTitle['rptUsed'] = params['ratio'] + "%"
        rptTitle['rptUnused'] = str(100.00 - float(params['ratio'])) + "%"
    else:
        rptTitle['rptPlate'] = params['plate']
        rptTitle['rptUsed'] = "-"
        rptTitle['rptUnused'] = "-"
    return rptTitle
