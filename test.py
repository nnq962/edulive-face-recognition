import cv2
import time
import sys
import os
from pathlib import Path
import subprocess
import json

def detect_codec_ffmpeg(rtsp_url):
    """
    Sử dụng ffprobe để phát hiện codec của luồng RTSP
    """
    try:
        print(f"Đang phát hiện codec cho {rtsp_url}...")
        cmd = [
            "ffprobe",
            "-v", "error",
            "-show_streams",
            "-select_streams", "v:0",
            "-print_format", "json",
            rtsp_url
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
        data = json.loads(result.stdout)
        
        codec_name = data.get("streams", [{}])[0].get("codec_name", "").lower()
        print(f"Phát hiện codec: {codec_name}")
        
        if codec_name in ["h264", "avc", "avc1"]:
            return "h264"
        elif codec_name in ["h265", "hevc"]:
            return "h265"
        else:
            print(f"Không hỗ trợ codec: {codec_name}")
            return None
    except Exception as e:
        print(f"Lỗi khi phát hiện codec: {str(e)}")
        return None

def create_pipeline_for_codec(rtsp_url, codec=None, use_hardware=True):
    """
    Tạo pipeline GStreamer tối ưu cho Jetson với hardware decoder
    """
    if codec is None:
        codec = detect_codec_ffmpeg(rtsp_url)
    
    # Base pipeline tối ưu cho độ trễ thấp
    base_pipeline = (
        f"rtspsrc location={rtsp_url} latency=0 protocols=tcp drop-on-latency=true "
        "udp-reconnect=1 timeout=0 ! "
    )
    
    if use_hardware:
        # Sử dụng hardware decoder của Jetson (nvv4l2decoder)
        if codec == "h264":
            pipeline = (
                f"{base_pipeline}"
                "rtph264depay ! h264parse ! "
                "nvv4l2decoder enable-max-performance=1 enable-non-planar=1 ! "
                "nvvidconv ! video/x-raw, format=BGRx ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 sync=false"
            )
            print(f"✓ Sử dụng HARDWARE decoder H264 (nvv4l2decoder)")
        elif codec == "h265":
            pipeline = (
                f"{base_pipeline}"
                "rtph265depay ! h265parse ! "
                "nvv4l2decoder enable-max-performance=1 enable-non-planar=1 ! "
                "nvvidconv ! video/x-raw, format=BGRx ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 sync=false"
            )
            print(f"✓ Sử dụng HARDWARE decoder H265 (nvv4l2decoder)")
        else:
            print(f"⚠️ Không phát hiện được codec, sử dụng H264 hardware decoder")
            pipeline = (
                f"{base_pipeline}"
                "rtph264depay ! h264parse ! "
                "nvv4l2decoder enable-max-performance=1 enable-non-planar=1 ! "
                "nvvidconv ! video/x-raw, format=BGRx ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 sync=false"
            )
    else:
        # Fallback: Software decoder (chậm hơn)
        if codec == "h264":
            pipeline = (
                f"{base_pipeline}rtph264depay ! h264parse ! avdec_h264 max-threads=4 ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 max-lateness=0 sync=false"
            )
            print(f"⚠️ Sử dụng SOFTWARE decoder H264 (chậm hơn)")
        elif codec == "h265":
            pipeline = (
                f"{base_pipeline}rtph265depay ! h265parse ! avdec_h265 max-threads=4 ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 max-lateness=0 sync=false"
            )
            print(f"⚠️ Sử dụng SOFTWARE decoder H265 (chậm hơn)")
        else:
            pipeline = (
                f"{base_pipeline}rtph264depay ! h264parse ! avdec_h264 max-threads=4 ! "
                "videoconvert ! video/x-raw, format=BGR ! "
                "appsink drop=1 max-buffers=1 max-lateness=0 sync=false"
            )
    
    return pipeline

def test_gstreamer_cameras():
    """
    Test hiển thị 2 camera RTSP sử dụng GStreamer
    """
    # Đọc URLs từ device.txt
    device_file = Path("ai_service/device.txt")
    if not device_file.exists():
        print(f"Không tìm thấy file: {device_file}")
        return
    
    with open(device_file, 'r') as f:
        urls = [line.strip() for line in f.readlines() if line.strip()]
    
    if len(urls) < 2:
        print(f"Cần ít nhất 2 URLs trong file device.txt, chỉ tìm thấy {len(urls)}")
        return
    
    print(f"Đã tìm thấy {len(urls)} URLs")
    
    # Kiểm tra xem OpenCV có hỗ trợ GStreamer không
    has_gstreamer = cv2.videoio_registry.hasBackend(cv2.CAP_GSTREAMER)
    if not has_gstreamer:
        print("❌ CẢNH BÁO: OpenCV không được build với GStreamer support!")
        print("Sẽ sử dụng phương thức mặc định (có thể có độ trễ cao hơn)")
    else:
        print("✓ OpenCV hỗ trợ GStreamer")
    
    # Kiểm tra xem có phải Jetson không (để sử dụng hardware decoder)
    use_hardware = os.path.exists('/etc/nv_tegra_release')
    if use_hardware:
        print("✓ Phát hiện Jetson - Sử dụng hardware decoder (nvv4l2decoder)")
    else:
        print("⚠️ Không phát hiện Jetson - Sử dụng software decoder")
    
    # Tạo các pipeline GStreamer
    caps = []
    pipelines = []
    
    for i, url in enumerate(urls[:2]):  # Chỉ lấy 2 URLs đầu tiên
        print(f"\n--- Khởi tạo camera {i+1} ---")
        print(f"URL: {url}")
        
        if has_gstreamer and url.startswith('rtsp://'):
            pipeline = create_pipeline_for_codec(url, use_hardware=use_hardware)
            pipelines.append(pipeline)
            
            cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)
            if not cap.isOpened():
                print(f"❌ Không thể mở camera {i+1} với GStreamer hardware, thử software decoder...")
                # Thử lại với software decoder
                pipeline = create_pipeline_for_codec(url, use_hardware=False)
                cap = cv2.VideoCapture(pipeline, cv2.CAP_GSTREAMER)
                if not cap.isOpened():
                    print(f"❌ Không thể mở camera {i+1} với GStreamer, thử phương thức mặc định...")
                    cap = cv2.VideoCapture(url)
        else:
            cap = cv2.VideoCapture(url)
            pipelines.append(None)
        
        if not cap.isOpened():
            print(f"❌ Không thể mở camera {i+1}")
            continue
        
        caps.append(cap)
        print(f"✓ Camera {i+1} đã sẵn sàng")
    
    if len(caps) < 2:
        print("Không đủ camera để hiển thị!")
        for cap in caps:
            if cap:
                cap.release()
        return
    
    print("\n" + "="*60)
    print("Bắt đầu hiển thị video...")
    print("Nhấn 'q' để thoát")
    print("="*60)
    
    # Tạo cửa sổ có thể resize được
    cv2.namedWindow('Combined View', cv2.WINDOW_NORMAL)
    
    # Đặt kích thước cửa sổ cho màn hình Full HD (1920x1080)
    # Để một chút margin, sử dụng 1900x1040
    screen_width = 1920
    screen_height = 1080
    window_width = 1900
    window_height = 1040
    
    # Đặt vị trí cửa sổ (centered)
    cv2.resizeWindow('Combined View', window_width, window_height)
    cv2.moveWindow('Combined View', (screen_width - window_width) // 2, 
                   (screen_height - window_height) // 2)
    
    # Biến để tính FPS
    fps_counters = [0, 0]
    fps_times = [time.time(), time.time()]
    fps_values = [0.0, 0.0]
    
    # Biến để đo độ trễ (thời gian từ khi nhận frame đến khi hiển thị)
    latency_times = [[], []]
    
    try:
        while True:
            frames = []
            timestamps = []
            
            # Đọc frame từ cả 2 camera
            for i, cap in enumerate(caps):
                if cap is None or not cap.isOpened():
                    frames.append(None)
                    continue
                
                frame_start = time.time()
                ret, frame = cap.read()
                frame_end = time.time()
                
                if ret:
                    # Tính latency (thời gian đọc frame)
                    latency = (frame_end - frame_start) * 1000  # ms
                    latency_times[i].append(latency)
                    if len(latency_times[i]) > 100:
                        latency_times[i].pop(0)
                    
                    # Tính FPS
                    fps_counters[i] += 1
                    current_time = time.time()
                    elapsed = current_time - fps_times[i]
                    
                    if elapsed >= 1.0:  # Cập nhật FPS mỗi giây
                        fps_values[i] = fps_counters[i] / elapsed
                        fps_counters[i] = 0
                        fps_times[i] = current_time
                    
                    # Vẽ thông tin lên frame (tối ưu: giảm số lần vẽ text)
                    avg_latency = sum(latency_times[i]) / len(latency_times[i]) if latency_times[i] else 0
                    
                    # Thêm text overlay (gộp thông tin để giảm số lần vẽ)
                    info_text = f"Cam{i+1} FPS:{fps_values[i]:.1f} Lat:{avg_latency:.0f}ms"
                    
                    # Chỉ vẽ một lần thay vì nhiều lần
                    cv2.putText(frame, info_text, (10, 30), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 
                               2, cv2.LINE_AA)
                    
                    frames.append(frame)
                    timestamps.append(frame_end)
                else:
                    print(f"⚠️ Không thể đọc frame từ camera {i+1}")
                    frames.append(None)
            
            # Hiển thị frames
            if frames[0] is not None and frames[1] is not None:
                # Tối ưu: Chỉ resize khi cần thiết, giảm số lần resize
                h1, w1 = frames[0].shape[:2]
                h2, w2 = frames[1].shape[:2]
                max_h = max(h1, h2)
                
                # Resize nếu cần để cùng chiều cao (chỉ resize một lần)
                if h1 != max_h:
                    frames[0] = cv2.resize(frames[0], (int(w1 * max_h / h1), max_h), 
                                          interpolation=cv2.INTER_LINEAR)
                if h2 != max_h:
                    frames[1] = cv2.resize(frames[1], (int(w2 * max_h / h2), max_h), 
                                          interpolation=cv2.INTER_LINEAR)
                
                combined = cv2.hconcat([frames[0], frames[1]])
                
                # Resize combined frame để vừa với cửa sổ Full HD
                # Tính toán kích thước để giữ tỷ lệ khung hình
                combined_h, combined_w = combined.shape[:2]
                target_width = window_width
                target_height = window_height
                
                # Tính scale factor để vừa với cửa sổ
                scale_w = target_width / combined_w
                scale_h = target_height / combined_h
                scale = min(scale_w, scale_h)  # Giữ tỷ lệ khung hình
                
                # Chỉ resize nếu scale khác đáng kể (tránh resize không cần thiết)
                if abs(scale - 1.0) > 0.05:
                    new_width = int(combined_w * scale)
                    new_height = int(combined_h * scale)
                    combined = cv2.resize(combined, (new_width, new_height), 
                                         interpolation=cv2.INTER_LINEAR)
                
                # Thêm thông tin tổng hợp (chỉ một dòng để giảm overhead)
                total_info = f"GStreamer Test | Press 'q' to quit"
                cv2.putText(combined, total_info, (10, 25), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2, cv2.LINE_AA)
                
                cv2.imshow('Combined View', combined)
            
            # Nhấn 'q' để thoát
            if cv2.waitKey(1) & 0xFF == ord('q'):
                break
            
            # Không cần sleep nếu đã có waitKey - nó đã có delay
    
    except KeyboardInterrupt:
        print("\nĐang dừng...")
    
    finally:
        # Giải phóng tài nguyên
        print("\nĐang đóng các camera...")
        for i, cap in enumerate(caps):
            if cap:
                cap.release()
                print(f"✓ Camera {i+1} đã đóng")
        
        cv2.destroyAllWindows()
        
        # In thống kê cuối cùng
        print("\n" + "="*60)
        print("THỐNG KÊ:")
        for i in range(len(caps)):
            if latency_times[i]:
                avg_latency = sum(latency_times[i]) / len(latency_times[i])
                max_latency = max(latency_times[i])
                min_latency = min(latency_times[i])
                print(f"Camera {i+1}:")
                print(f"  - Latency trung bình: {avg_latency:.2f}ms")
                print(f"  - Latency tối đa: {max_latency:.2f}ms")
                print(f"  - Latency tối thiểu: {min_latency:.2f}ms")
                print(f"  - FPS cuối cùng: {fps_values[i]:.1f}")
        print("="*60)

if __name__ == "__main__":
    test_gstreamer_cameras()

