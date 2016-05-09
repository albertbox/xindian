import sys

#Expand Python classes path with your app's path
sys.path.insert(0, "d:/www/xindian")

from parkservices_xindian import app

#Put logging code (and imports) here ...

#Initialize WSGI app object
application = app
import logging, sys
logging.basicConfig(stream=sys.stderr)