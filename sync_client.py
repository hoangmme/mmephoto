import os
import time
import requests
import json
from watchdog.observers import Observer
from watchdog.events import FileSystemEventHandler
from PIL import Image
import io
import threading
import uuid

# --- CONFIGURATION ---
CONFIG_FILE = "config.json"

default_config = {
    "server_url": "https://photo.llphotobooth.vn",
    "branch_id": "CN01",
    "room_id": "ROOM_01",
    "watch_folder": "./photos",
    "api_key": "YOUR_SECRET_API_KEY",
    "compress_quality": 80,
    "max_width": 1200
}

def load_config():
    if not os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(default_config, f, indent=4)
        print(f"[*] Đã tạo file cấu hình mẫu {CONFIG_FILE}. Vui lòng sửa lại và chạy lại script.")
        return default_config
    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

config = load_config()

SERVER_URL = config["server_url"].rstrip('/')
BRANCH_ID = config["branch_id"]
ROOM_ID = config["room_id"]
WATCH_FOLDER = config["watch_folder"]
API_KEY = config["api_key"]
QUALITY = config["compress_quality"]
MAX_WIDTH = config["max_width"]

if not os.path.exists(WATCH_FOLDER):
    os.makedirs(WATCH_FOLDER)
    print(f"[*] Đã tạo thư mục theo dõi: {WATCH_FOLDER}")

print(f"==================================================")
print(f" LL PHOTOBOOTH - PC SYNC CLIENT (WEBP ONLY)")
print(f" Chi nhánh: {BRANCH_ID} | Phòng: {ROOM_ID}")
print(f" Thư mục theo dõi: {WATCH_FOLDER}")
print(f" Máy chủ: {SERVER_URL}")
print(f"==================================================\n")

# Lưu trữ session hiện tại. Khi thư mục con thay đổi, ta xem nó như một session
current_session = {}

def process_and_upload(file_path, folder_name):
    # folder_name sẽ đóng vai trò như Session ID, hoặc ta tự sinh session
    # Giả sử mỗi khách là một folder, lấy tên folder làm session_id
    session_id = folder_name
    
    filename = os.path.basename(file_path)
    print(f"[>] Đang xử lý: {filename} (Session: {session_id})")
    
    try:
        # 1. Đọc và Nén ảnh thành WebP trên RAM (không ghi ra ổ cứng để tăng tốc)
        img = Image.open(file_path)
        
        # Resize nếu ảnh quá to
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_height = int(img.height * ratio)
            img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
        
        # Convert to RGB nếu cần
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        byte_arr = io.BytesIO()
        img.save(byte_arr, format='WEBP', quality=QUALITY)
        byte_arr.seek(0)
        
        # 2. Upload ngay lập tức lên VPS
        upload_url = f"{SERVER_URL}/api/stream-upload/{BRANCH_ID}/{ROOM_ID}/{session_id}"
        
        files = {
            'image': (f"{os.path.splitext(filename)[0]}.webp", byte_arr, 'image/webp')
        }
        headers = {
            'Authorization': f"Bearer {API_KEY}"
        }
        
        print(f"    -> Đang upload WebP lên VPS...")
        start_time = time.time()
        response = requests.post(upload_url, files=files, headers=headers)
        
        if response.status_code == 200:
            print(f"    [OK] Upload thành công ({time.time() - start_time:.2f}s)")
        else:
            print(f"    [LỖI] Upload thất bại: {response.text}")
            
    except Exception as e:
        print(f"    [LỖI] Xử lý file {filename} thất bại: {str(e)}")


class PhotoHandler(FileSystemEventHandler):
    def on_created(self, event):
        if event.is_directory:
            return
            
        file_path = event.src_path
        filename = os.path.basename(file_path)
        ext = os.path.splitext(filename)[1].lower()
        
        if ext in ['.jpg', '.jpeg', '.png', '.cr2', '.raw']:
            # Lấy tên folder ngay trên file làm session_id
            folder_name = os.path.basename(os.path.dirname(file_path))
            # Chạy thread riêng để không block file system event
            t = threading.Thread(target=process_and_upload, args=(file_path, folder_name))
            t.start()


if __name__ == "__main__":
    event_handler = PhotoHandler()
    observer = Observer()
    observer.schedule(event_handler, path=WATCH_FOLDER, recursive=True)
    observer.start()
    
    print(f"[*] Đang lắng nghe ảnh mới tại {WATCH_FOLDER}...")
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        observer.stop()
    observer.join()
