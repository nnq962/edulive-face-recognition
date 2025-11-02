"""
File notification_test.py dùng để test kết nối và gửi thông báo qua noti server
"""

import argparse
from audio_notifications.notification_server import send_notification
from audio_notifications.config import HOST, CONTROL_PORT, SECRET_KEY

if __name__ == "__main__":
    # Thiết lập parser tham số dòng lệnh
    parser = argparse.ArgumentParser(description="Gửi thông báo tới server")
    parser.add_argument("--message", type=str, default="Xin chào", help="Nội dung thông báo")
    parser.add_argument("--repeat", type=int, default=1, help="Số lần lặp lại thông báo")
    
    args = parser.parse_args()
    
    # Sử dụng cấu hình mặc định từ config.py
    host = HOST
    port = CONTROL_PORT
    secret_key = SECRET_KEY
    
    print(f"Host: {host}, Control Port: {port}")
    
    # Lặp lại việc gửi thông báo theo số lần chỉ định
    for i in range(args.repeat):
        message = args.message
        if args.repeat > 1:
            message = f"{args.message} (thông báo thứ {i+1})"
            print(f"Đang gửi thông báo {i+1}/{args.repeat}...")
        else:
            print(f"Đang gửi thông báo...")
            
        # Gửi thông báo tới server
        success = send_notification(
            message=message, 
            host=host, 
            control_port=port, 
            secret_key=secret_key
        )
        
        if success:
            print("Đã gửi thông báo thành công.")
        else:
            print("Gửi thông báo thất bại.")