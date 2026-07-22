$ErrorActionPreference = "Stop"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "  LL PHOTOBOOTH - TU DONG CAI DAT TREN WINDOWS" -ForegroundColor Cyan
Write-Host "================================================" -ForegroundColor Cyan

# 1. Kiem tra Python va Git
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Da tim thay Python: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[Loi] Khong tim thay Python! Vui long cai dat Python truoc khi tiep tuc." -ForegroundColor Red
    exit
}

try {
    $gitVersion = git --version 2>&1
    Write-Host "[OK] Da tim thay Git: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[Loi] Khong tim thay Git! Vui long cai dat Git truoc khi tiep tuc." -ForegroundColor Red
    exit
}

# 2. Xac dinh thu muc cai dat
$CurrentDir = (Get-Location).Path

if (Test-Path (Join-Path $CurrentDir ".git")) {
    $InstallDir = $CurrentDir
    Write-Host "[*] Dang o san trong thu muc code. Dang cap nhat..." -ForegroundColor Yellow
    git pull
} else {
    $InstallDir = Join-Path $CurrentDir "mmephoto"
    if (Test-Path $InstallDir) {
        Write-Host "[*] Thu muc $InstallDir da ton tai. Dang cap nhat..." -ForegroundColor Yellow
        Set-Location $InstallDir
        git pull
    } else {
        Write-Host "[*] Dang tai ban clone tu Github vao $InstallDir..." -ForegroundColor Yellow
        git clone https://github.com/hoangmme/mmephoto.git $InstallDir
        Set-Location $InstallDir
    }
}

# 3. Chay cac buoc cai dat thong qua mmephoto.bat
Write-Host "[*] Dang dang ky lenh 'mmephoto' toan cuc..." -ForegroundColor Yellow
cmd.exe /c "mmephoto.bat add_to_path"

Write-Host "[*] Dang cai dat thu vien va tao Startup script..." -ForegroundColor Yellow
cmd.exe /c "mmephoto.bat install"

Write-Host "================================================" -ForegroundColor Cyan
Write-Host "[XONG] CAI DAT HOAN TAT!" -ForegroundColor Green
Write-Host "================================================" -ForegroundColor Cyan
Write-Host "Neu day la lan dau tien cai dat PC nay, hay mo Terminal và go lenh duoi day de dang ky Thong tin Phong:" -ForegroundColor Yellow
Write-Host "  mmephoto setup"
Write-Host ""
Write-Host "Cac lenh ho tro sau nay (co the go o bat ky dau):" -ForegroundColor Cyan
Write-Host "  mmephoto update   (De lay code moi va restart)"
Write-Host "  mmephoto reset    (De dang ky lai phong)"
Write-Host "================================================" -ForegroundColor Cyan
