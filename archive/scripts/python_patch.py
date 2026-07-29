import re

with open('sync_client.py', 'r', encoding='utf-8') as f:
    content = f.read()

start_idx = content.find('def load_config():')
end_idx = content.find('    with open(CONFIG_FILE, "r") as f:', start_idx)

if start_idx != -1 and end_idx != -1:
    new_logic = """def load_config():
    if not os.path.exists(CONFIG_FILE):
        print("=== CÀI ĐẶT LẦN ĐẦU ===")
        server_url = "https://photo.llphotobooth.vn"
        setup_code = input("Nhập Mã Cài Đặt (Setup Code) do Admin cấp: ").strip()
        watch_folder = input("Nhập đường dẫn thư mục lưu ảnh (VD: ./photos): ").strip()
        if not watch_folder: watch_folder = "./photos"
        
        print("\\nĐang xác thực Mã Cài Đặt với Server...")
        try:
            res = requests.post(f"{server_url}/api/setup-room", json={"setupCode": setup_code})
            if res.status_code == 200:
                data = res.json()
                print("[OK] Xác thực thành công!")
                config = {
                    "server_url": server_url,
                    "branch_id": data["branchId"],
                    "password": data["password"],
                    "room_id": data["roomId"],
                    "watch_folder": watch_folder,
                    "compress_quality": 80,
                    "max_width": 1200
                }
                with open(CONFIG_FILE, "w") as f:
                    json.dump(config, f, indent=4)
                return config
            else:
                print(f"[LỖI] {res.json().get('error')}")
                print("Vui lòng chạy lại script và nhập đúng Mã Cài Đặt.")
                exit(1)
        except Exception as e:
            print(f"[LỖI] Không thể kết nối tới server: {e}")
            exit(1)
            
"""
    content = content[:start_idx] + new_logic + content[end_idx:]
    with open('sync_client.py', 'w', encoding='utf-8') as f:
        f.write(content)
    print("Patched sync_client.py successfully.")
else:
    print("Could not find insertion points in sync_client.py")
