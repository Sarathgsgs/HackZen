"""
File upload utilities for hackathon posters and templates
"""

import os
import shutil
import uuid
import zipfile
import re
from pathlib import Path
from typing import Optional
from fastapi import UploadFile, HTTPException

from core.config import settings


class FileUploadService:
    def __init__(self):
        # Get absolute path for uploads directory
        backend_dir = Path(__file__).parent.parent.resolve()
        self.base_dir = backend_dir / "uploads"
        self.posters_dir = self.base_dir / "posters"
        self.templates_dir = self.base_dir / "templates"
        # Shared team files live outside /uploads, which is mounted publicly.
        self.shared_files_dir = Path(__file__).parent.parent.resolve() / "private_team_files"

        # Create directories
        self.posters_dir.mkdir(parents=True, exist_ok=True)
        self.templates_dir.mkdir(parents=True, exist_ok=True)
        self.shared_files_dir.mkdir(parents=True, exist_ok=True)

    async def save_shared_file(self, file: UploadFile) -> tuple[str, str, int, str]:
        """Validate and persist a private team file using a server-generated name."""
        allowed = {".pptx", ".pdf", ".zip", ".mp4"}
        original_name = (file.filename or "").replace("\\", "/").split("/")[-1].strip()
        if not original_name or len(original_name) > 180 or any(ord(char) < 32 for char in original_name):
            raise HTTPException(status_code=400, detail="Enter a valid file name.")

        extension = Path(original_name).suffix.lower()
        if extension not in allowed:
            raise HTTPException(status_code=400, detail="Supported file types are PPTX, PDF, ZIP, and MP4.")

        file.file.seek(0, os.SEEK_END)
        size = file.file.tell()
        file.file.seek(0)
        max_size = 200 * 1024 * 1024
        if size <= 0:
            raise HTTPException(status_code=400, detail="The selected file is empty.")
        if size > max_size:
            raise HTTPException(status_code=413, detail="Files must be 200 MB or smaller.")

        header = file.file.read(16)
        file.file.seek(0)
        valid = False
        content_type = "application/octet-stream"
        if extension == ".pdf":
            valid = header.startswith(b"%PDF-")
            content_type = "application/pdf"
        elif extension in {".zip", ".pptx"}:
            valid = zipfile.is_zipfile(file.file)
            file.file.seek(0)
            if valid and extension == ".pptx":
                try:
                    with zipfile.ZipFile(file.file) as archive:
                        valid = "ppt/presentation.xml" in archive.namelist()
                except (OSError, zipfile.BadZipFile):
                    valid = False
            content_type = "application/vnd.openxmlformats-officedocument.presentationml.presentation" if extension == ".pptx" else "application/zip"
        elif extension == ".mp4":
            valid = len(header) >= 8 and header[4:8] == b"ftyp"
            content_type = "video/mp4"
        file.file.seek(0)
        if not valid:
            raise HTTPException(status_code=400, detail="The file contents do not match the selected file type.")

        storage_name = f"{uuid.uuid4().hex}{extension}"
        target = self.shared_files_dir / storage_name
        try:
            with target.open("xb") as output:
                shutil.copyfileobj(file.file, output)
        except Exception:
            target.unlink(missing_ok=True)
            raise
        finally:
            file.file.seek(0)
        return storage_name, original_name, size, content_type

    def get_shared_file_path(self, storage_name: str) -> Path:
        """Resolve only generated storage names, never caller-supplied paths."""
        if not storage_name or not re.fullmatch(r"[a-f0-9]{32}\.(pptx|pdf|zip|mp4)", storage_name):
            raise HTTPException(status_code=404, detail="File not found.")
        target = (self.shared_files_dir / storage_name).resolve()
        if target.parent != self.shared_files_dir.resolve() or not target.is_file():
            raise HTTPException(status_code=404, detail="File not found.")
        return target

    async def save_poster(self, file: UploadFile) -> tuple:
        """Save hackathon poster image"""
        allowed_types = [".jpg", ".jpeg", ".png", ".webp"]
        path = await self._save_file(file, self.posters_dir, allowed_types)
        url = self.get_file_url(path)
        return (path, url)

    async def save_template(self, file: UploadFile) -> tuple:
        """Save hackathon presentation template"""
        allowed_types = [".zip", ".ppt", ".pptx", ".pdf", ".doc", ".docx"]
        path = await self._save_file(file, self.templates_dir, allowed_types)
        url = self.get_file_url(path)
        return (path, url)

    async def save_submission_file(
        self, file: UploadFile, hackathon_id: str, team_id: str
    ) -> str:
        """Save hackathon project submission file"""
        # Validate file type
        allowed_types = [
            ".zip",
            ".rar",
            ".tar",
            ".gz",
            ".7z",
            ".pdf",
            ".doc",
            ".docx",
            ".ppt",
            ".pptx",
        ]

        # Use a submissions directory
        submissions_dir = self.base_dir / "submissions"
        submissions_dir.mkdir(parents=True, exist_ok=True)

        # Get file extension
        filename = file.filename or ""
        file_ext = os.path.splitext(filename)[1].lower()

        # Validate file type
        if file_ext not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid file type. Allowed: {', '.join(allowed_types)}",
            )

        # Validate file size
        file.file.seek(0, 2)
        file_size = file.file.tell()
        file.file.seek(0)

        if file_size > settings.MAX_UPLOAD_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE // (1024 * 1024)}MB",
            )

        # Create hackathon/team specific directory
        target_dir = submissions_dir / hackathon_id / team_id
        target_dir.mkdir(parents=True, exist_ok=True)

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = target_dir / unique_filename

        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # Return relative path
        return f"submissions/{hackathon_id}/{team_id}/{unique_filename}"

    async def _save_file(
        self, file: UploadFile, directory: Path, allowed_types: list
    ) -> str:
        """Save uploaded file with validation"""
        # Get file extension
        filename = file.filename or ""
        file_ext = os.path.splitext(filename)[1].lower()

        # Generate unique filename
        unique_filename = f"{uuid.uuid4().hex}{file_ext}"
        file_path = directory / unique_filename
        print(f"DEBUG (UPLOAD): Saving file to: {file_path}")

        # Save file
        content = await file.read()
        print(f"DEBUG (UPLOAD): Read {len(content)} bytes")
        with open(file_path, "wb") as buffer:
            buffer.write(content)

        # Reset file pointer in case it's needed elsewhere
        await file.seek(0)

        # Return relative path from uploads directory
        relative_path = f"{directory.name}/{unique_filename}"
        print(f"DEBUG (UPLOAD): Saved successfully. Path: {relative_path}")
        return relative_path

    def get_file_url(self, file_path: str) -> str:
        """Convert file path to full absolute URL"""
        if not file_path:
            return ""
        base_url = settings.BACKEND_URL.rstrip("/")
        if not base_url.startswith("http"):
            base_url = f"http://{base_url}"
        return f"{base_url}/uploads/{file_path}"

    def delete_file(self, file_path: str) -> bool:
        """Delete uploaded file"""
        if not file_path:
            return False

        full_path = self.base_dir / file_path
        if full_path.exists():
            full_path.unlink()
            return True
        return False

    def list_hackathon_files(self, hackathon_id: str) -> dict:
        """List all files uploaded for a hackathon"""
        result = {"posters": [], "templates": []}

        # List posters
        posters_dir = self.posters_dir / hackathon_id
        if posters_dir.exists():
            for file in posters_dir.iterdir():
                if file.is_file():
                    result["posters"].append(
                        {
                            "filename": file.name,
                            "path": f"posters/{hackathon_id}/{file.name}",
                            "url": f"/uploads/posters/{hackathon_id}/{file.name}",
                            "size": file.stat().st_size,
                        }
                    )

        # List templates
        templates_dir = self.templates_dir / hackathon_id
        if templates_dir.exists():
            for file in templates_dir.iterdir():
                if file.is_file():
                    result["templates"].append(
                        {
                            "filename": file.name,
                            "path": f"templates/{hackathon_id}/{file.name}",
                            "url": f"/uploads/templates/{hackathon_id}/{file.name}",
                            "size": file.stat().st_size,
                        }
                    )

        return result


# Singleton instance
file_upload_service = FileUploadService()
