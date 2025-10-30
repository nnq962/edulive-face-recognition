import cv2

# Mở webcam (0 là camera mặc định, nếu có nhiều camera thì thử 1, 2, ...)
cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Không thể mở webcam!")
    exit()

while True:
    # Đọc từng frame
    ret, frame = cap.read()
    if not ret:
        print("❌ Không đọc được khung hình!")
        break

    # Hiển thị frame
    cv2.imshow("Webcam", frame)

    # Nhấn phím 'q' để thoát
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Giải phóng tài nguyên
cap.release()
cv2.destroyAllWindows()