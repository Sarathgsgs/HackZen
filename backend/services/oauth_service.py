"""OAuth 2.0 helpers for Google, GitHub and LinkedIn."""
import hashlib
import hmac
import json
import secrets
import time
from base64 import urlsafe_b64decode, urlsafe_b64encode
from typing import Any, Dict
from urllib.parse import urlencode

import httpx
from fastapi import HTTPException, status

from core.config import settings


PROVIDERS = {
    "google": {
        "authorize": "https://accounts.google.com/o/oauth2/v2/auth",
        "token": "https://oauth2.googleapis.com/token",
        "userinfo": "https://openidconnect.googleapis.com/v1/userinfo",
        "scope": "openid email profile",
    },
    "github": {
        "authorize": "https://github.com/login/oauth/authorize",
        "token": "https://github.com/login/oauth/access_token",
        "userinfo": "https://api.github.com/user",
        "scope": "read:user user:email",
    },
    "linkedin": {
        "authorize": "https://www.linkedin.com/oauth/v2/authorization",
        "token": "https://www.linkedin.com/oauth/v2/accessToken",
        "userinfo": "https://api.linkedin.com/v2/userinfo",
        "scope": "openid profile email",
    },
}


def _base64(value: bytes) -> str:
    return urlsafe_b64encode(value).decode().rstrip("=")


def _unbase64(value: str) -> bytes:
    return urlsafe_b64decode(value + "=" * (-len(value) % 4))


def _state(frontend_origin: str) -> str:
    payload = {"origin": frontend_origin.rstrip("/"), "nonce": secrets.token_urlsafe(20), "exp": int(time.time()) + 600}
    encoded = _base64(json.dumps(payload, separators=(",", ":")).encode())
    signature = hmac.new(settings.SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).digest()
    return f"{encoded}.{_base64(signature)}"


def validate_state(state: str) -> str:
    try:
        encoded, received_signature = state.split(".", 1)
        expected_signature = _base64(hmac.new(settings.SECRET_KEY.encode(), encoded.encode(), hashlib.sha256).digest())
        if not hmac.compare_digest(received_signature, expected_signature):
            raise ValueError("signature")
        payload = json.loads(_unbase64(encoded))
        if payload["exp"] < time.time() or not payload["origin"].startswith(("http://", "https://")):
            raise ValueError("expired or invalid origin")
        return payload["origin"]
    except (ValueError, KeyError, json.JSONDecodeError):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired OAuth request")


def callback_url(provider: str) -> str:
    base_url = (settings.OAUTH_REDIRECT_BASE_URL or settings.BACKEND_URL or "").rstrip("/")
    if not base_url:
        raise HTTPException(status_code=503, detail="OAuth is not configured: set OAUTH_REDIRECT_BASE_URL")
    return f"{base_url}/api/auth/oauth/{provider}/callback"


def client_credentials(provider: str):
    prefix = provider.upper()
    client_id = getattr(settings, f"{prefix}_CLIENT_ID")
    client_secret = getattr(settings, f"{prefix}_CLIENT_SECRET")
    if not client_id or not client_secret:
        raise HTTPException(status_code=503, detail=f"{provider.title()} sign-in is not configured yet")
    return client_id, client_secret


def authorization_url(provider: str, frontend_origin: str) -> str:
    if provider not in PROVIDERS:
        raise HTTPException(status_code=404, detail="Unsupported OAuth provider")
    client_id, _ = client_credentials(provider)
    params = {"client_id": client_id, "redirect_uri": callback_url(provider), "response_type": "code", "scope": PROVIDERS[provider]["scope"], "state": _state(frontend_origin)}
    return f"{PROVIDERS[provider]['authorize']}?{urlencode(params)}"


async def get_profile(provider: str, code: str) -> Dict[str, str]:
    client_id, client_secret = client_credentials(provider)
    async with httpx.AsyncClient(timeout=15) as client:
        token_response = await client.post(PROVIDERS[provider]["token"], data={
            "client_id": client_id, "client_secret": client_secret, "code": code,
            "redirect_uri": callback_url(provider), "grant_type": "authorization_code",
        }, headers={"Accept": "application/json"})
        if token_response.is_error:
            raise HTTPException(status_code=401, detail="The provider did not accept this sign-in request")
        access_token = token_response.json().get("access_token")
        if not access_token:
            raise HTTPException(status_code=401, detail="No access token was received from the provider")
        headers = {"Authorization": f"Bearer {access_token}", "Accept": "application/json"}
        response = await client.get(PROVIDERS[provider]["userinfo"], headers=headers)
        if response.is_error:
            raise HTTPException(status_code=401, detail="Could not read your profile from the provider")
        data: Dict[str, Any] = response.json()
        if provider == "github" and not data.get("email"):
            emails = await client.get("https://api.github.com/user/emails", headers=headers)
            if emails.is_success:
                primary = next((item for item in emails.json() if item.get("primary") and item.get("verified")), None)
                data["email"] = primary.get("email") if primary else None
        provider_id = str(data.get("sub") or data.get("id") or "")
        email = data.get("email")
        name = data.get("name") or data.get("login") or ""
        if not provider_id or not email:
            raise HTTPException(status_code=400, detail="Your provider account must have a verified email address")
        return {"id": provider_id, "email": email, "name": name}
