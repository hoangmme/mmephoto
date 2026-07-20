import requests
import io
import time
from PIL import Image

def simulate(branch="CNHANGKHAY", room="ROOM1", session="khach_test_123"):
    url = f"https://photo.llphotobooth.vn/api/stream-upload/{branch}/{room}/{session}"
    colors = ["#ff9999", "#99ff99", "#9999ff", "#ffff99"]
    
    print(f"Bắt đầu đẩy 4 ảnh lên Server cho chi nhánh {branch} - {room} - {session}")
    for i, color in enumerate(colors):
        # Create a simple image with color
        img = Image.new('RGB', (800, 600), color=color)
        img_byte_arr = io.BytesIO()
        img.save(img_byte_arr, format='WEBP')
        img_byte_arr = img_byte_arr.getvalue()
        
        files = {'image': (f'dummy_{i+1}.webp', img_byte_arr, 'image/webp')}
        try:
            response = requests.post(url, files=files)
            print(f"Đã đẩy ảnh {i+1} ({color}). Trạng thái: {response.status_code}")
            time.sleep(1) # Delay 1s giữa mỗi ảnh cho giống thực tế
        except Exception as e:
            print(f"Lỗi: {e}")

if __name__ == "__main__":
    simulate()
