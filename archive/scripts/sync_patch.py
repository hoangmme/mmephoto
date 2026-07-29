import re

with open('sync_client.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('def load_config():')
end_idx = content.find('if not os.path.exists(WATCH_FOLDER):')

if start_idx != -1 and end_idx != -1:
    new_logic = """def load_config():
    if not os.path.exists(CONFIG_FILE):
        print("=== CÀI ĐẶT LẦN ĐẦU ===")
        server_url = "https://photo.llphotobooth.vn"
        setup_code = input("Nhập Mã Cài Đặt (Setup Code) do Admin cấp: ").strip()
        watch_folder = input("Nhập đường dẫn thư mục gốc (Nhấn Enter để dùng './photos'): ").strip()
        
        if not watch_folder: watch_folder = "./photos"
        
        print("\\nĐang xác thực Mã Cài Đặt với Server...")
        try:
            res = requests.post(f"{server_url}/api/setup-room", json={"setupCode": setup_code})
            if res.status_code == 200:
                data = res.json()
                print(f"[OK] Xác thực thành công! Chi nhánh: {data['branchId']}")
                print(f"Các phòng thuộc chi nhánh: {', '.join(data.get('rooms', []))}")
                
                # Automatically create folder structure
                branch_folder = os.path.join(watch_folder, data['branchId'])
                if not os.path.exists(branch_folder):
                    os.makedirs(branch_folder)
                    
                rooms = data.get('rooms', [])
                for r in rooms:
                    room_path = os.path.join(branch_folder, r)
                    if not os.path.exists(room_path):
                        os.makedirs(room_path)
                
                print(f"[OK] Đã tạo cấu trúc thư mục tại: {branch_folder}")
                
                config = {
                    "server_url": server_url,
                    "branch_id": data["branchId"],
                    "password": data["password"],
                    "rooms": rooms,
                    "watch_folder": branch_folder,
                    "compress_quality": 80,
                    "max_width": 1200
                }
            else:
                print(f"[LỖI] {res.json().get('error')}")
                print("Vui lòng chạy lại script và nhập đúng Mã Cài Đặt.")
                exit(1)
        except Exception as e:
            print(f"[LỖI] Không thể kết nối tới server: {e}")
            exit(1)
            
        with open(CONFIG_FILE, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=4)
        print(f"[*] Đã lưu cấu hình vào {CONFIG_FILE}.")
        return config

    with open(CONFIG_FILE, 'r', encoding='utf-8') as f:
        return json.load(f)

config = load_config()

SERVER_URL = config["server_url"].rstrip('/')
BRANCH_ID = config["branch_id"]
ROOMS = config.get("rooms", [])
WATCH_FOLDER = config["watch_folder"]
PASSWORD = config.get("password", "")
QUALITY = config["compress_quality"]
MAX_WIDTH = config["max_width"]

"""
    content = content[:start_idx] + new_logic + content[end_idx:]
    with open('sync_client.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched sync_client.py config loading.")
else:
    print("Could not find insertion points in sync_client.py for config.")
