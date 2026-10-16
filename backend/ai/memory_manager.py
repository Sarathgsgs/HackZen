import json
import os
import threading
from datetime import datetime, timezone


class MemoryManager:
    def __init__(
        self,
        storage_path: str,
        max_messages_per_hackathon: int = 50,
        max_notes: int = 10,
    ):
        self.storage_path = storage_path
        self.max_messages_per_hackathon = max_messages_per_hackathon
        self.max_notes = max_notes
        self._lock = threading.Lock()
        self._data = self._load()

    def _load(self) -> dict:
        if not os.path.exists(self.storage_path):
            return {}
        try:
            with open(self.storage_path, "r", encoding="utf-8") as file:
                return json.load(file)
        except Exception:
            return {}

    def _save(self) -> None:
        os.makedirs(os.path.dirname(self.storage_path) or ".", exist_ok=True)
        with open(self.storage_path, "w", encoding="utf-8") as file:
            json.dump(self._data, file, indent=2)

    def _user_bucket(self, client_id: str) -> dict:
        return self._data.setdefault(
            client_id,
            {
                "active_hackathon": "",
                "profile": {
                    "role": "Student",
                    "stage": "Idea",
                },
                "hackathons": {},
            },
        )

    def _hackathon_bucket(self, client_id: str, hackathon_norm: str) -> dict:
        user_bucket = self._user_bucket(client_id)
        return user_bucket["hackathons"].setdefault(
            hackathon_norm,
            {
                "history": [],
                "notes": [],
                "uploads": [],
            },
        )

    def set_active_hackathon(self, client_id: str, hackathon_norm: str) -> None:
        with self._lock:
            bucket = self._user_bucket(client_id)
            bucket["active_hackathon"] = hackathon_norm
            self._save()

    def get_active_hackathon(self, client_id: str) -> str:
        with self._lock:
            return self._user_bucket(client_id).get("active_hackathon", "")

    def update_profile(self, client_id: str, role: str = "", stage: str = "") -> dict:
        with self._lock:
            profile = self._user_bucket(client_id)["profile"]
            if role:
                profile["role"] = role
            if stage:
                profile["stage"] = stage
            self._save()
            return dict(profile)

    def get_profile(self, client_id: str) -> dict:
        with self._lock:
            return dict(self._user_bucket(client_id).get("profile", {}))

    def get_history(self, client_id: str, hackathon_norm: str) -> list[dict]:
        with self._lock:
            return list(
                self._hackathon_bucket(client_id, hackathon_norm).get("history", [])
            )

    def get_notes(self, client_id: str, hackathon_norm: str) -> list[str]:
        with self._lock:
            return list(
                self._hackathon_bucket(client_id, hackathon_norm).get("notes", [])
            )

    def remember_upload(
        self, client_id: str, hackathon_norm: str, filename: str
    ) -> None:
        with self._lock:
            bucket = self._hackathon_bucket(client_id, hackathon_norm)
            uploads = bucket.setdefault("uploads", [])
            if filename not in uploads:
                uploads.append(filename)
            uploads[:] = uploads[-10:]
            self._append_note_locked(bucket, f"Uploaded file: {filename}")
            self._save()

    def clear_uploads(self, client_id: str, hackathon_norm: str) -> None:
        with self._lock:
            bucket = self._hackathon_bucket(client_id, hackathon_norm)
            bucket["uploads"] = []
            self._append_note_locked(
                bucket, "Uploaded files were cleared after review."
            )
            self._save()

    def append_turn(
        self,
        client_id: str,
        hackathon_norm: str,
        user_message: str,
        assistant_message: str,
    ) -> list[dict]:
        timestamp = datetime.now(timezone.utc).isoformat()
        with self._lock:
            bucket = self._hackathon_bucket(client_id, hackathon_norm)
            history = bucket.setdefault("history", [])
            history.extend(
                [
                    {"role": "user", "content": user_message, "timestamp": timestamp},
                    {
                        "role": "assistant",
                        "content": assistant_message,
                        "timestamp": timestamp,
                    },
                ]
            )
            bucket["history"] = history[-self.max_messages_per_hackathon :]
            self._remember_from_messages_locked(bucket, user_message, assistant_message)
            self._user_bucket(client_id)["active_hackathon"] = hackathon_norm
            self._save()
            return list(bucket["history"])

    def build_memory_notes(self, client_id: str, hackathon_norm: str) -> str:
        with self._lock:
            bucket = self._hackathon_bucket(client_id, hackathon_norm)
            notes = bucket.get("notes", [])
            uploads = bucket.get("uploads", [])
            lines = []
            if uploads:
                lines.append("Uploaded files: " + ", ".join(uploads[-5:]))
            if notes:
                lines.extend(notes[-self.max_notes :])
            return "\n".join(f"- {line}" for line in lines)

    def _remember_from_messages_locked(
        self, bucket: dict, user_message: str, assistant_message: str
    ) -> None:
        lowered = user_message.lower()
        if any(
            token in lowered
            for token in ("code", "build", "api", "fastapi", "react", "backend")
        ):
            self._append_note_locked(
                bucket, "User is asking for implementation or code."
            )
        if any(token in lowered for token in ("ppt", "slides", "deck", "presentation")):
            self._append_note_locked(bucket, "User asked for presentation content.")
        if any(
            token in lowered
            for token in ("problem statement", "rules", "prize", "timeline", "theme")
        ):
            self._append_note_locked(bucket, "User is asking about hackathon facts.")
        preview = user_message.strip()
        if preview:
            self._append_note_locked(bucket, f"Recent user goal: {preview[:140]}")
        answer_preview = assistant_message.strip()
        if answer_preview:
            self._append_note_locked(
                bucket, f"Recent assistant reply: {answer_preview[:140]}"
            )

    def _append_note_locked(self, bucket: dict, note: str) -> None:
        notes = bucket.setdefault("notes", [])
        if note in notes:
            notes.remove(note)
        notes.append(note)
        bucket["notes"] = notes[-self.max_notes :]
