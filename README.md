# Hướng dẫn đưa PhotoTune Pro lên VPS

Hiện tại, PhotoTune Pro là một ứng dụng thuần Front-end (Static Web App). Nó chỉ bao gồm các file HTML, CSS, và JS, mọi tính năng xử lý ảnh đều được thực hiện trực tiếp trên trình duyệt của người dùng (Client-side).

Do đó, việc đưa webtool này lên VPS cực kỳ đơn giản. Bạn không cần cài đặt Node.js hay Database, chỉ cần một Web Server như **Nginx**.

## Yêu cầu chuẩn bị
- Một VPS chạy Linux (khuyến nghị Ubuntu 20.04 hoặc 22.04).
- Một tên miền (Domain) đã trỏ IP về VPS.

---

## Các bước triển khai (Deployment)

### Bước 1: Cài đặt Nginx trên VPS
SSH vào VPS của bạn và chạy các lệnh sau:
```bash
sudo apt update
sudo apt install nginx -y
```

### Bước 2: Đưa source code lên VPS
Tạo một thư mục chứa source code trên VPS:
```bash
sudo mkdir -p /var/www/phototune
```

Bạn có thể dùng phần mềm như FileZilla, WinSCP (trên Windows) hoặc lệnh `scp` (trên Mac/Linux) để copy toàn bộ thư mục code hiện tại (bao gồm `index.html`, `style.css`, thư mục `js`, thư mục `luts`) vào đường dẫn `/var/www/phototune` trên VPS.

```bash
# Ví dụ lệnh scp từ máy tính của bạn lên VPS
scp -r /Users/hoji/Documents/code/photo-editor/* root@IP_CUA_VPS:/var/www/phototune/
```

Sau khi copy xong, phân quyền lại cho thư mục:
```bash
sudo chown -R www-data:www-data /var/www/phototune
sudo chmod -R 755 /var/www/phototune
```

### Bước 3: Cấu hình Nginx
Tạo một file cấu hình Nginx mới cho tên miền của bạn:
```bash
sudo nano /etc/nginx/sites-available/phototune
```

Dán nội dung sau vào file (thay `tenmien-cua-ban.com` bằng tên miền thực tế):
```nginx
server {
    listen 80;
    server_name tenmien-cua-ban.com www.tenmien-cua-ban.com;
    root /var/www/phototune;
    index index.html;

    location / {
        try_files $uri $uri/ =404;
    }

    # Cache file tĩnh (tuỳ chọn nhưng khuyên dùng)
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|cube)$ {
        expires 30d;
        add_header Cache-Control "public, no-transform";
    }
}
```

Kích hoạt cấu hình và khởi động lại Nginx:
```bash
sudo ln -s /etc/nginx/sites-available/phototune /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### Bước 4: Cài đặt SSL miễn phí (HTTPS) - RẤT QUAN TRỌNG
Vì app sử dụng một số API trình duyệt mới, bạn **bắt buộc** phải có HTTPS.
Cài đặt Certbot để lấy chứng chỉ SSL Let's Encrypt miễn phí:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot --nginx -d tenmien-cua-ban.com -d www.tenmien-cua-ban.com
```
Làm theo hướng dẫn trên màn hình. Sau khi xong, trang web của bạn đã có thể truy cập bằng `https://tenmien-cua-ban.com`.

---

## Định hướng hệ thống mới (Luồng có API, Tự động chỉnh ảnh, Webtool 2)
Nếu bạn muốn hệ thống có API nhận ảnh, tự động xử lý và sinh mã QR như yêu cầu mới nhất, chúng ta không thể dùng cấu hình Static Web App đơn giản như trên nữa.

Hệ thống sẽ phải trở thành một hệ thống **Client-Server hoàn chỉnh**, cần cài đặt Docker, Node.js Backend, và Redis/Database để quản lý "Phiên chụp" (Sessions). 

Vui lòng xem file **`implementation_plan.md`** mà tôi vừa tạo ra trong giao diện để xem kiến trúc cho hệ thống mới này và trả lời các câu hỏi để chúng ta bắt đầu!
