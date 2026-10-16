@echo off
title HackZen / ProEduvate Platform
setlocal
cd /d "%~dp0"

REM Prefer virtual environment python in backend/venv
if exist "backend\venv\Scripts\python.exe" (
    "backend\venv\Scripts\python.exe" start.py %*
) else (
    REM Try Windows py launcher
    where py >nul 2>&1
    if %errorlevel% equ 0 (
        py start.py %*
    ) else (
        python start.py %*
    )
)
