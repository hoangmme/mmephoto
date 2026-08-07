#!/bin/bash
echo "🚀 Đang dọn dẹp port 3000 và khởi chạy Server Slot Editor..."
lsof -ti:3000 | xargs kill -9 2>/dev/null
(sleep 1 && open "http://localhost:3000/slot-editor.html") &
node server.js
