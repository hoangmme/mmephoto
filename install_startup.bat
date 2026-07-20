@echo off
cd /d "%~dp0"
chcp 65001 >nul
echo ================================================
echo   LL PHOTOBOOTH - CAI DAT KHOI DONG CUNG WINDOWS
echo ================================================

:: Check if Python is installed
python --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [LOI] Khong tim thay Python! Vui long cai dat Python truoc.
    pause
    exit /b
)

:: Install required packages
echo [*] Dang cai dat thu vien (requests, watchdog, pillow)...
pip install requests watchdog pillow

:: Create a VBS script in the current directory to run python silently
echo Set oShell = CreateObject ("Wscript.Shell") > run_hidden.vbs
echo Dim strArgs >> run_hidden.vbs
echo strArgs = "cmd /c python sync_client.py" >> run_hidden.vbs
echo oShell.Run strArgs, 0, false >> run_hidden.vbs

:: Create a shortcut in the Startup folder
echo [*] Dang tao file tu dong chay vao thu muc Startup cua Windows...

set STARTUP_DIR=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup
set SHORTCUT_PATH=%STARTUP_DIR%\LL_Photobooth_Sync.lnk
set VBS_PATH=%CD%\run_hidden.vbs

:: Create shortcut using PowerShell
powershell -Command "$wshell = New-Object -ComObject WScript.Shell; $shortcut = $wshell.CreateShortcut('%SHORTCUT_PATH%'); $shortcut.TargetPath = 'wscript.exe'; $shortcut.Arguments = '\"%VBS_PATH%\"'; $shortcut.WorkingDirectory = '%CD%'; $shortcut.Save()"

echo.
echo [OK] DA CAI DAT XONG!
echo Tu nay moi khi mo may tinh, Script se tu dong chay ngam (khong hien cua so).
echo.
echo Neu day la lan dau tien cai dat, Ban hay chay truc tiep file sync_client.py de dang ky Chi nhanh/Phong.
echo.
pause
