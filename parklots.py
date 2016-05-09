class ParkLot():
    def __init__(self, dbconn):
        self.dbconn = dbconn
        self.cursor = dbconn.cursor()
        self.sql = ""

    def last_modification(self, group_id):
        try:
            self.sql = ("SELECT MAX(mdate) FROM parklots WHERE gid='{}'".format(group_id))
            self.cursor.execute(self.sql)
            row = self.cursor.fetchone()
            data = str(row[0])
        except:
            data = None
        return data

    def all_stations(self, group_id):
        data = []
        try:
            self.sql = ("""SELECT * FROM parklots
                            WHERE gid = '{}' AND active=1 ORDER BY district, name"""
                        .format(group_id))
            self.cursor.execute(self.sql)
            col_names = tuple(column[0] for column in self.cursor.description)
            rows = self.cursor.fetchall()
            for row in rows:
                item = {}
                for k, v in enumerate(row):
                    if v is not None:
                        item[col_names[k]] = v
                item['mdate'] = str(item['mdate'])
                data.append(item)
            print(len(data))
        except:
            pass
        return data