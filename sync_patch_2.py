import re

with open('sync_client.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('print(f"==================================================")')
end_idx = content.find('def start_watch():')

if start_idx != -1 and end_idx != -1:
    new_logic = """print(f"==================================================")
print(f" LL PHOTOBOOTH - PC SYNC CLIENT (WEBP ONLY)")
print(f" Chi nhánh: {BRANCH_ID}")
print(f" Các phòng: {', '.join(ROOMS)}")
print(f" Thư mục theo dõi: {WATCH_FOLDER}")
print(f" Máy chủ: {SERVER_URL}")
print(f"==================================================\\n")

def process_and_upload(file_path, room_id, session_id):
    filename = os.path.basename(file_path)
    print(f"[>] Đang xử lý: {filename} (Phòng: {room_id}, Session: {session_id})")
    
    try:
        img = Image.open(file_path)
        
        if img.width > MAX_WIDTH:
            ratio = MAX_WIDTH / img.width
            new_height = int(img.height * ratio)
            img = img.resize((MAX_WIDTH, new_height), Image.Resampling.LANCZOS)
        
        if img.mode in ("RGBA", "P"):
            img = img.convert("RGB")
            
        byte_arr = io.BytesIO()
        img.save(byte_arr, format='WEBP', quality=QUALITY)
        byte_arr.seek(0)
        
        upload_url = f"{SERVER_URL}/api/stream-upload/{BRANCH_ID}/{room_id}/{session_id}"
        
        files = {
            'image': (f"{os.path.splitext(filename)[0]}.webp", byte_arr, 'image/webp')
        }
        headers = {}
        if PASSWORD:
            headers['Authorization'] = f"Bearer {PASSWORD}"
        
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
            rel_path = os.path.relpath(file_path, WATCH_FOLDER)
            parts = rel_path.split(os.sep)
            
            if len(parts) >= 2:
                room_id = parts[0]
                session_id = parts[1] if len(parts) > 2 else "default"
                
                if room_id in ROOMS:
                    time.sleep(0.5)
                    process_and_upload(file_path, room_id, session_id)
                else:
                    print(f"    [BỎ QUA] File không nằm trong thư mục phòng hợp lệ: {rel_path}")

"""
    content = content[:start_idx] + new_logic + content[end_idx:]
    with open('sync_client.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched sync_client.py watchdog logic.")
else:
    print("Could not find insertion points in sync_client.py for watchdog.")
