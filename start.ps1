# HackZen / ProEduvate Platform PowerShell Launcher
Set-Location -Path $PSScriptRoot

if (Test-Path "backend\venv\Scripts\python.exe") {
    & "backend\venv\Scripts\python.exe" start.py $args
} elseif (Get-Command py -ErrorAction SilentlyContinue) {
    & py start.py $args
} else {
    & python start.py $args
}
