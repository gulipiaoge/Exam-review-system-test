@echo off
echo ===============================
echo 自动提交到Git
echo ===============================

cd /d "%~dp0"

:: 检查是否有修改
git status --porcelain > temp_status.txt
findstr /r "." temp_status.txt > nul 2>&1
if %errorlevel% neq 0 (
    echo 发现修改，正在提交...
    
    :: 添加所有修改
    git add .
    
    :: 提交，使用时间戳
    for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
    set datetime=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2% %datetime:~8,2%:%datetime:~10,2%:%datetime:~12,2%
    
    git commit -m "自动提交：%datetime%"
    
    echo.
    echo ✅ 已提交！
    git log -1 --oneline
) else (
    echo 没有修改，无需提交。
)

del temp_status.txt > nul 2>&1
echo.
pause
