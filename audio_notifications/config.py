"""
File cấu hình cho notification system
Chứa các cấu hình mặc định cho client và server
"""

# Cấu hình mặc định
HOST = '192.168.1.102'
PORT = 9623
CONTROL_PORT = 14679
SECRET_KEY = "edulive"
ALLOWED_IPS = []

# Để tương thích với code cũ, giữ các tên biến DEFAULT_*
DEFAULT_HOST = HOST
DEFAULT_PORT = PORT
DEFAULT_CONTROL_PORT = CONTROL_PORT
DEFAULT_SECRET_KEY = SECRET_KEY
DEFAULT_ALLOWED_IPS = ALLOWED_IPS

