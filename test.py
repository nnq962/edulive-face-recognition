import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

# Tạo ảnh nền đen
img = np.zeros((300, 800, 3), dtype=np.uint8)

# ========== CASE 1: OpenCV thuần (sẽ bị lỗi font) ==========
cv2.putText(
    img,
    "Nguyễn Ngọc Quyết",      # text có dấu
    (50, 100),                # vị trí
    cv2.FONT_HERSHEY_SIMPLEX, # font mặc định
    1,                        # size
    (255, 255, 255),          # màu trắng
    2,                        # độ dày
    cv2.LINE_AA
)

# ========== CASE 2: Pillow fix Unicode ==========
# Chuyển ảnh từ OpenCV -> PIL
img_pil = Image.fromarray(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
draw = ImageDraw.Draw(img_pil)

# Chọn font có hỗ trợ tiếng Việt
# macOS: /System/Library/Fonts/Supplemental/Arial Unicode.ttf
# Linux: /usr/share/fonts/truetype/dejavu/DejaVuSans.ttf
# Windows: C:\\Windows\\Fonts\\arial.ttf
font_path = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"  # đổi cho phù hợp máy bạn
font = ImageFont.truetype(font_path, 40)

# Vẽ text tiếng Việt đúng dấu
draw.text((50, 200), "Nguyễn Ngọc Quyết", font=font, fill=(0, 255, 0))  # màu xanh

# Chuyển ngược về OpenCV
img_fixed = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)

# ========== Hiển thị kết quả ==========
cv2.imshow("OpenCV text (sai font)", img)
cv2.imshow("Pillow text (đúng font Unicode)", img_fixed)
cv2.waitKey(0)
cv2.destroyAllWindows()