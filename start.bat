@echo off
setlocal
cd /d "%~dp0"
echo UNO 2.0 を起動中...

rem Python Launcher (py) が利用可能な場合
where py >nul 2>&1
if %errorlevel% equ 0 (
    echo http://localhost:1000 でサーバーを起動します...
    start http://localhost:1000
    py -m http.server 1000
    goto :eof
)

rem Python が利用可能な場合
where python >nul 2>&1
if %errorlevel% equ 0 (
    echo http://localhost:1000 でサーバーを起動します...
    start http://localhost:1000
    python -m http.server 1000
    goto :eof
)

rem Node.js / npx が利用可能な場合
where npx >nul 2>&1
if %errorlevel% equ 0 (
    echo http://localhost:1000 でサーバーを起動します...
    start http://localhost:1000
    npx --yes serve -l 1000 .
    goto :eof
)

rem いずれも見つからない場合は直接 index.html を開く
echo ローカルサーバーが見つからないため、直接ブラウザで開きます。
start "" "%~dp0index.html"
