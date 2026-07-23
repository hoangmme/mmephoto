# 📸 LL PHOTOBOOTH - MMEPHOTO MANAGEMENT & SYNC SYSTEM

Hệ thống quản lý phòng chụp Photobooth tự động: đồng bộ ảnh trực tiếp từ máy ảnh PC lên VPS, xử lý ghép khung in A5, hiển thị mã QR tải ảnh và quản lý hàng chờ chuyên nghiệp.

---

## 🚀 1. Hướng Dẫn Cài Đặt Cho Máy Tính Phòng Chụp (PC Client - Windows)

### 📌 Bước 1: Yêu cầu chuẩn bị trên PC
1. **Python 3.x**: Đã cài đặt (tích chọn `Add Python to PATH` khi cài đặt).
2. **Git**: Đã cài đặt trên Windows.

---

### 📥 Bước 2: Lệnh cài đặt nhanh (Run via PowerShell)

Mở **PowerShell (Run as Administrator)** trên Windows và dán câu lệnh sau:

```powershell
git clone https://github.com/hoangmme/mmephoto.git C:\mmephoto; cd C:\mmephoto; .\install.ps1
```

*(Script sẽ tự động cài thư viện `requests`, `watchdog`, `pillow`, thêm `mmephoto` vào biến môi trường PATH và tạo Shortcut khởi động cùng Windows)*.

---

### ⚙️ Bước 3: Đăng ký mã Setup Phòng Chụp

Sau khi cài đặt xong, gõ lệnh sau ở bất kỳ đâu trong Terminal / Cmd:

```cmd
mmephoto setup
```

1. **Nhập Mã Cài Đặt (Setup Code)** do Admin cấp.
2. **Chọn Tên Phòng** tương ứng với PC này.
3. **Nhập Đường Dẫn Thư Mục Ảnh Máy Ảnh** (ví dụ: `D:\Photos` hoặc `C:\DSLR_HotFolder`).

> 💡 **Tính năng nổi bật:** Script hỗ trợ **quét đệ quy tất cả các thư mục con** (ví dụ: `D:\Photos\user1\image` và `D:\Photos\user1`). Tất cả ảnh thuộc các thư mục con đều được tự động nén WebP và đẩy lên máy chủ theo phiên chụp tương ứng.

---

### 🛠️ Các Lệnh Quản Lý Nhanh Trên PC (`mmephoto`)

Bạn có thể gõ các lệnh sau ở bất kỳ đâu trong Command Prompt (`cmd`) hoặc PowerShell:

| Lệnh | Công dụng |
| :--- | :--- |
| `mmephoto update` | **Lấy code mới nhất từ Git** và tự động Khởi động lại service chạy ngầm |
| `mmephoto setup` | Nhập Mã Cài Đặt mới & Đăng ký phòng chụp |
| `mmephoto reset` | Xóa cấu hình phòng cũ & Đăng ký lại từ đầu |
| `mmephoto start` | Bật lại service đồng bộ chạy ngầm |
| `mmephoto stop` | Tắt service đồng bộ chạy ngầm |

---

## 🌐 2. Hướng Dẫn Cài Đặt Máy Chủ VPS (Server)

### 📌 Bước 1: Cài đặt Node.js & Git trên VPS
```bash
sudo apt update
sudo apt install nodejs npm git -y
```

### 📥 Bước 2: Tải code và khởi chạy Server
```bash
git clone https://github.com/hoangmme/mmephoto.git /var/www/mmephoto
cd /var/www/mmephoto
npm install
node server.js &
```

---

## ✨ 3. Các Tính Năng Nổi Bật Đã Cập Nhật

1. **Đồng bộ ảnh siêu tốc WebP**: Tự động nén ảnh trên RAM và stream upload lên VPS trong thời gian thực.
2. **Quét đệ quy thư mục con**: Tự động nhận diện tất cả ảnh trong thư mục gốc và thư mục con của phần mềm máy ảnh.
3. **Quản Lý Hàng Chờ & Xóa Vật Lý**: Khi xóa phiên chụp trong bảng *Quản Lý Hàng Chờ*, hệ thống sẽ tự động xóa sạch thư mục ảnh đó khỏi đĩa VPS.
4. **Xem QR / Tải Ảnh**: Mở trực tiếp trang download mã QR (`download.html`) chuẩn cho khách hàng.
