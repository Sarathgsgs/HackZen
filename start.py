#!/usr/bin/env python3
"""
HackZen / ProEduvate Platform Launcher
Starts both Backend (FastAPI) and Frontend (Vite React) in a single terminal.

Usage:
    python start.py
"""

import os
import sys
import subprocess
import threading
import signal
import time
from pathlib import Path

# Paths
ROOT_DIR = Path(__file__).resolve().parent
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"

# Virtualenv Python detection
if sys.platform == "win32":
    VENV_PYTHON = BACKEND_DIR / "venv" / "Scripts" / "python.exe"
    NPM_CMD = "npm.cmd"
else:
    VENV_PYTHON = BACKEND_DIR / "venv" / "bin" / "python"
    NPM_CMD = "npm"

PYTHON_EXEC = str(VENV_PYTHON) if VENV_PYTHON.exists() else sys.executable

# Terminal Colors
CYAN = "\033[96m"
GREEN = "\033[92m"
YELLOW = "\033[93m"
MAGENTA = "\033[95m"
RED = "\033[91m"
BOLD = "\033[1m"
RESET = "\033[0m"

processes = []


def print_banner():
    print(f"\n{CYAN}{BOLD}{'=' * 65}{RESET}")
    print(f"{CYAN}{BOLD}   PROEDUVATE / HACKZEN FULL-STACK PLATFORM LAUNCHER{RESET}")
    print(f"{CYAN}{BOLD}{'=' * 65}{RESET}")
    print(f"  {GREEN}>> Frontend UI:{RESET}     {BOLD}http://localhost:5173{RESET}")
    print(f"  {CYAN}>> Backend API:{RESET}     {BOLD}http://localhost:8000{RESET}")
    print(
        f"  {YELLOW}>> API Docs (Swagger):{RESET} {BOLD}http://localhost:8000/docs{RESET}"
    )
    print(f"  {MAGENTA}>> Python Interpreter:{RESET} {PYTHON_EXEC}")
    print(f"{CYAN}{BOLD}{'=' * 65}{RESET}")
    print(f"  {YELLOW}Press Ctrl+C anytime to stop both servers safely.{RESET}\n")


def stream_logs(pipe, prefix, color):
    try:
        for line in iter(pipe.readline, ""):
            if not line:
                break
            clean_line = line.rstrip()
            if clean_line:
                print(f"{color}{BOLD}[{prefix}]{RESET} {clean_line}")
    except Exception:
        pass


def kill_proc_tree(pid):
    """Cleanly terminate child processes and their trees on Windows/Unix"""
    if sys.platform == "win32":
        try:
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                stdout=subprocess.DEVNULL,
                stderr=subprocess.DEVNULL,
                check=False,
            )
        except Exception:
            pass
    else:
        try:
            os.killpg(os.getpgid(pid), signal.SIGTERM)
        except Exception:
            pass


def cleanup():
    print(f"\n{YELLOW}{BOLD}[LAUNCHER] Shutting down servers...{RESET}")
    for proc in processes:
        if proc and proc.poll() is None:
            kill_proc_tree(proc.pid)
            try:
                proc.terminate()
            except Exception:
                pass
    print(f"{GREEN}{BOLD}[LAUNCHER] Both servers stopped cleanly. Goodbye!{RESET}\n")


def main():
    print_banner()

    # 1. Start Backend Server
    print(
        f"{CYAN}[BACKEND]{RESET} Starting FastAPI backend on http://localhost:8000..."
    )
    backend_proc = subprocess.Popen(
        [PYTHON_EXEC, "main.py"],
        cwd=str(BACKEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    processes.append(backend_proc)

    t_backend = threading.Thread(
        target=stream_logs, args=(backend_proc.stdout, "BACKEND", CYAN), daemon=True
    )
    t_backend.start()

    time.sleep(1)

    # 2. Start Frontend Server
    print(f"{MAGENTA}[FRONTEND]{RESET} Starting Vite React frontend...")
    frontend_proc = subprocess.Popen(
        [NPM_CMD, "run", "dev"],
        cwd=str(FRONTEND_DIR),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        bufsize=1,
        universal_newlines=True,
    )
    processes.append(frontend_proc)

    t_frontend = threading.Thread(
        target=stream_logs,
        args=(frontend_proc.stdout, "FRONTEND", MAGENTA),
        daemon=True,
    )
    t_frontend.start()

    # Wait for interruption or process termination
    try:
        while True:
            # If any process dies unexpectedly
            if backend_proc.poll() is not None:
                print(
                    f"{RED}[BACKEND] Server exited with code {backend_proc.poll()}{RESET}"
                )
                break
            if frontend_proc.poll() is not None:
                print(
                    f"{RED}[FRONTEND] Server exited with code {frontend_proc.poll()}{RESET}"
                )
                break
            time.sleep(0.5)
    except KeyboardInterrupt:
        pass
    finally:
        cleanup()


if __name__ == "__main__":
    signal.signal(signal.SIGINT, lambda s, f: sys.exit(0))
    signal.signal(signal.SIGTERM, lambda s, f: sys.exit(0))
    try:
        main()
    except SystemExit:
        cleanup()
