#!/bin/bash
echo "🚀 Đang khởi chạy Server Slot Editor trên http://localhost:3000/slot-editor.html ..."
(sleep 1 && open "http://localhost:3000/slot-editor.html") &
node server.js
