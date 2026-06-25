@echo off
echo ========================================
echo  智能备考系统 - 备份到GitHub
echo ========================================
echo.

cd /d "%~dp0"

echo [1/2] 提交本地修改...
git add -A
git commit -m "自动备份：%date% %time%" --allow-empty

echo.
echo [2/2] 推送到GitHub...
git push origin main

echo.
echo ========================================
echo  备份完成！
echo ========================================
pause
