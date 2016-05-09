# -*- coding: utf-8 -*-
import os
import math
import json
import base64
from datetime import datetime, timedelta
from time import strftime

from flask import Flask, request, g, make_response, redirect, jsonify, abort, make_response
import pypyodbc

from parkreports import parkreports
from parkmaps import parkmaps


app = Flask(__name__, static_url_path='')   # static file is under "static" directory
app.config.from_object('config.DBConfig')
#app.config['SECRET_KEY'] = 'this application is for xindian high school'

app.register_blueprint(parkreports)
app.register_blueprint(parkmaps)


#============================================================================
# Database connection operation
#============================================================================
def connect_db():
    str_connect = ("driver={}; server={}; database={}; uid={}; pwd={}"
                   .format(app.config["DBTYPE"],
                           app.config["DBSERVER"],
                           app.config["DATABASE"],
                           app.config["USER"],
                           app.config["PASSWORD"],
                           autocommit=True))
    return pypyodbc.connect(str_connect)

@app.before_request
def before_request():
    g.db = connect_db()

@app.teardown_request
def teardown_request(exception):
    if hasattr(g, 'db'):
        g.db.close()


#============================================================================
# Redirect to index.html of this application
#============================================================================
@app.route('/', methods=['GET', 'POST'])
def index():
    return redirect('index.html')


@app.route('/getimg.cgi', methods=['POST'])
def getImage():
    imgPath = request.form.get('path', None)
    if imgPath is None:
        return ''
    try:
        with open(imgPath, "rb") as image_file:
            encoded_string = base64.b64encode(image_file.read())
            #encoded_string = str(base64.b64encode(image_file.read()))
        return encoded_string
    except:
        return ''


@app.route('/getevents.cgi', methods=['GET', 'POST'])
def getEvents():
    events = []
    cursor = g.db.cursor()
    sql = ("""SELECT space_index, space_status, space_name,
                     ep_space.cardid, LEN(ep_space.cardid) as len,
                     pic, convert(char(19),dte, 120) as dte
                FROM ep_space, ep_record
               WHERE ep_space.record_index = ep_record.record_index
                 AND ( (ep_space.space_status = 2 AND
                         (LEN(ep_space.cardid)<=4 OR ep_space.cardid is NULL))
                       OR space_status = 6)
               ORDER BY len, dte""")
    cursor.execute(sql)
    rows = cursor.fetchall()
    for row in rows:
        event = {}
        if row[4] is None or row[4] == 0:
            event['level'] = 1
        elif row[4] <= 2:
            event['level'] = 2
        else:
            event['level'] = 3
        event['index'] = row[0]
        event['status'] = row[1]
        event['name'] = row[2]
        event['plate'] = row[3]
        event['image'] = row[5].replace("\\", "/")
        event['date'] = row[6]
        events.append(event)
    return json.dumps({'status': 200, 'events': events})


@app.route('/updateplate.cgi', methods=['POST'])
def updatePlate():
    space_index = request.form.get('index', None)
    license_plate = request.form.get('plate', None)
    cursor = g.db.cursor()
    sql = ("""UPDATE ep_space SET cardid='{}' WHERE space_index={}"""
                        .format(license_plate, space_index))
    try:
        cursor.execute(sql)
        cursor.commit()
        return json.dumps({'status': 200})
    except:
        return json.dumps({'status': 400})





if __name__ == '__main__':
    app.run(debug=True)