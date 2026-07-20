@echo off
cd /d "%~dp0"
if exist config.json del config.json
if exist "%WINDIR%\System32\config.json" del "%WINDIR%\System32\config.json"
echo Da xoa thanh cong file cau hinh cu (neu co)!
pause
