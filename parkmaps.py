import json

from flask import Flask, request, g, make_response, redirect
from flask import Blueprint

parkmaps = Blueprint('parkmaps', __name__)


#============================================================================
# Maps operation
#============================================================================
@parkmaps.route('/getspaces.cgi', methods=['POST'])
def getspaces():
    cursor = g.db.cursor()
    sql = ("""SELECT a.space_name, coordinate_x, coordinate_y,
                     space_status, b.cardid, convert(char(19),c.dte, 120) as dte
                FROM ep_coordinate a, ep_space b
                LEFT JOIN ep_record c
                  ON b.record_index = c.record_index
               WHERE a.space_name = b.space_name
               ORDER BY 1""")
    cursor.execute(sql)
    rows = cursor.fetchall()
    return json.dumps({'status': 200, 'spaces': rows})


@parkmaps.route('/getleds.cgi', methods=['POST'])
def getleds():
    cursor = g.db.cursor()
    sql = ("""SELECT a.led_index, coordinate_x, coordinate_y,
                     led_1st_space_seq, led_2nd_space_seq, led_3rd_space_seq
                FROM ep_ledcoordinate a
                LEFT JOIN ep_led b
                  ON a.led_index = b.led_index
               ORDER BY 1""")
    cursor.execute(sql)
    rows = cursor.fetchall()
    sql = ("""SELECT space_name FROM ep_space
               WHERE space_index IN ({})""")
    sqlSum = ("""SELECT COUNT(*) FROM ep_space
               WHERE space_index IN ({})
                 AND space_status = 1""")
    ledspaces = []
    ledsum = []
    for row in rows:
        led_member = []
        led_sumup = 0
        spaces = [row[3], row[4], row[5]]
        for mbr in spaces:
            if len(mbr) != 0:
                if mbr[-1] == ",":
                    mbr = mbr[:-1]
                cursor.execute(sql.format(mbr))
                space_rows = cursor.fetchall()
                for space_member in space_rows:
                    led_member.append(space_member[0])
                cursor.execute(sqlSum.format(mbr))
                sumup = cursor.fetchone()
                led_sumup = led_sumup + sumup[0]
        ledspaces.append(led_member)
        ledsum.append(led_sumup)
    return json.dumps({'status': 200, 'leds': rows, 'ledspaces': ledspaces, 'ledsum': ledsum})