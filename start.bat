@echo off
echo UNO 2.0 を起動中...
echo ブラウザで http://localhost:1000 を開きます
start http://localhost:1000
python -m http.server 1000
