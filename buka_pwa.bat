@echo off
title Aplikasi Web PWA Al-Masar
echo ===================================================
echo     MELANCARKAN APLIKASI WEB PWA AL-MASAR (المسار)
echo ===================================================
echo.
echo Melancarkan pelayan tempatan pada http://localhost:8080 ...
start "" http://localhost:8080/
python -m http.server 8080 --directory "%~dp0"
pause
