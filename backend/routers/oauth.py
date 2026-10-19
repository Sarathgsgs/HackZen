import base64
from datetime import datetime, timedelta
import json
import logging
from typing import Optional
from urllib.parse import quote, urlencode, urlparse
from uuid import uuid4

from fastapi import APIRouter, HTTPException, Request, status
from fastapi.responses import RedirectResponse
import httpx

from core.config import settings
from core.security import create_access_token
from database import get_db
from services.userService import UserService

logger = logging.getLogger(__name__)

router = APIRouter()

GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo"

GITHUB_AUTH_URL = "https://github.com/login/oauth/authorize"
GITHUB_TOKEN_URL = "https://github.com/login/oauth/access_token"
GITHUB_USER_URL = "https://api.github.com/user"
GITHUB_EMAILS_URL = "https://api.github.com/user/emails"


def encode_oauth_state(frontend_origin: Optional[str] = None) -> str:
    """Encode the frontend origin and a nonce into the OAuth state parameter."""
    origin = (frontend_origin or settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    if origin:
        p = urlparse(origin)
        if p.scheme and p.netloc:
            origin = f"{p.scheme}://{p.netloc}".rstrip("/")
    payload = {"origin": origin, "nonce": uuid4().hex}
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()


def decode_oauth_state(state: Optional[str]) -> str:
    """Decode the frontend origin from OAuth state parameter or fall back to FRONTEND_URL."""
    if not state:
        return (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")
    try:
        data = json.loads(base64.urlsafe_b64decode(state.encode()).decode())
        origin = data.get("origin")
        if origin and (origin.startswith("http://") or origin.startswith("https://")):
            return origin.rstrip("/")
    except Exception:
        pass
    return (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")


def get_backend_base_url() -> str:
    if settings.OAUTH_REDIRECT_BASE_URL:
        return settings.OAUTH_REDIRECT_BASE_URL.rstrip("/")
    if settings.BACKEND_URL and not (settings.BACKEND_URL.startswith("http://localhost") or settings.BACKEND_URL.startswith("http://127.0.0.1")):
        return settings.BACKEND_URL.rstrip("/")
    return "https://hackzen-backend.onrender.com"


def get_frontend_base_url() -> str:
    return (settings.FRONTEND_URL or "http://localhost:5173").rstrip("/")


@router.get("/oauth/google")
async def login_google(request: Request):
    """Initiate Google OAuth 2.0 flow."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Google Client ID is not configured on the server.",
        )

    origin = request.query_params.get("origin")
    redirect_uri = f"{get_backend_base_url()}/api/auth/oauth/google/callback"
    state = encode_oauth_state(origin or request.headers.get("referer"))
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "select_account",
        "state": state,
    }
    auth_url = f"{GOOGLE_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/oauth/google/callback")
async def google_callback(request: Request):
    """Google OAuth 2.0 callback handler."""
    code = request.query_params.get("code")
    error = request.query_params.get("error")
    state = request.query_params.get("state")
    frontend_base_url = decode_oauth_state(state)
    frontend_callback = f"{frontend_base_url}/oauth/callback"

    if error or not code:
        err_msg = error or "Authorization code not received from Google."
        logger.error(f"[OAuth Google] Error: {err_msg}")
        return RedirectResponse(url=f"{frontend_callback}?error={quote(err_msg)}")

    redirect_uri = f"{get_backend_base_url()}/api/auth/oauth/google/callback"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange code for access token
            token_data = {
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": redirect_uri,
                "grant_type": "authorization_code",
            }
            token_res = await client.post(GOOGLE_TOKEN_URL, data=token_data)
            token_json = token_res.json()

            if token_res.status_code != 200 or "access_token" not in token_json:
                logger.error(f"[OAuth Google] Token exchange failed: {token_json}")
                return RedirectResponse(
                    url=f"{frontend_callback}?error={quote('Failed to exchange authorization code with Google.')}"
                )

            access_token = token_json["access_token"]

            # 2. Fetch user profile from Google
            userinfo_res = await client.get(
                GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
            )
            if userinfo_res.status_code != 200:
                logger.error(f"[OAuth Google] Userinfo failed: {userinfo_res.text}")
                return RedirectResponse(
                    url=f"{frontend_callback}?error={quote('Failed to retrieve user profile from Google.')}"
                )

            google_user = userinfo_res.json()
            email = google_user.get("email")
            google_id = google_user.get("id")
            name = google_user.get("name") or google_user.get("given_name")
            avatar = google_user.get("picture")

            if not email:
                return RedirectResponse(
                    url=f"{frontend_callback}?error={quote('No email associated with this Google account.')}"
                )

            # 3. Upsert user in database (default role: student)
            user = await UserService.upsert_oauth_user(
                provider="google",
                provider_id=google_id,
                email=email,
                name=name,
                avatar=avatar,
            )

            # 4. Create active session record
            db = get_db()
            session_id = f"sess-{uuid4().hex[:8]}"
            client_ip = (
                request.client.host if request and request.client else "127.0.0.1"
            )

            session_doc = {
                "sessionId": session_id,
                "userId": str(user["_id"]),
                "email": user["email"],
                "device": "OAuth / Google",
                "location": "Online",
                "ip": client_ip,
                "lastActive": datetime.utcnow(),
                "revoked": False,
                "createdAt": datetime.utcnow(),
            }
            await db["admin_sessions"].insert_one(session_doc)

            # 5. Generate JWT token
            user_role = str(user.get("role", "student")).lower()
            token_payload = {
                "sub": str(user["_id"]),
                "email": user["email"],
                "role": user_role,
                "sessionId": session_id,
            }
            token = create_access_token(token_payload, expires_delta=timedelta(days=7))

            return RedirectResponse(url=f"{frontend_callback}?token={token}")

    except Exception as exc:
        logger.exception(f"[OAuth Google] Unexpected error: {exc}")
        return RedirectResponse(url=f"{frontend_callback}?error={quote(str(exc))}")


@router.get("/oauth/github")
async def login_github(request: Request):
    """Initiate GitHub OAuth flow."""
    if not settings.GITHUB_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="GitHub Client ID is not configured on the server.",
        )

    origin = request.query_params.get("origin")
    redirect_uri = f"{get_backend_base_url()}/api/auth/oauth/github/callback"
    state = encode_oauth_state(origin or request.headers.get("referer"))
    params = {
        "client_id": settings.GITHUB_CLIENT_ID,
        "redirect_uri": redirect_uri,
        "scope": "read:user user:email",
        "state": state,
    }
    auth_url = f"{GITHUB_AUTH_URL}?{urlencode(params)}"
    return RedirectResponse(url=auth_url)


@router.get("/oauth/github/callback")
async def github_callback(request: Request):
    """GitHub OAuth callback handler."""
    code = request.query_params.get("code")
    error = request.query_params.get("error")
    state = request.query_params.get("state")
    frontend_base_url = decode_oauth_state(state)
    frontend_callback = f"{frontend_base_url}/oauth/callback"

    if error or not code:
        err_msg = error or "Authorization code not received from GitHub."
        logger.error(f"[OAuth GitHub] Error: {err_msg}")
        return RedirectResponse(url=f"{frontend_callback}?error={quote(err_msg)}")

    redirect_uri = f"{get_backend_base_url()}/api/auth/oauth/github/callback"

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            # 1. Exchange code for access token
            token_data = {
                "client_id": settings.GITHUB_CLIENT_ID,
                "client_secret": settings.GITHUB_CLIENT_SECRET,
                "code": code,
                "redirect_uri": redirect_uri,
            }
            token_res = await client.post(
                GITHUB_TOKEN_URL,
                data=token_data,
                headers={"Accept": "application/json"},
            )
            token_json = token_res.json()

            if token_res.status_code != 200 or "access_token" not in token_json:
                logger.error(f"[OAuth GitHub] Token exchange failed: {token_json}")
                return RedirectResponse(
                    url=f"{frontend_callback}?error={quote('Failed to exchange authorization code with GitHub.')}"
                )

            access_token = token_json["access_token"]

            # 2. Fetch user profile from GitHub
            user_res = await client.get(
                GITHUB_USER_URL,
                headers={
                    "Authorization": f"Bearer {access_token}",
                    "Accept": "application/json",
                    "User-Agent": "HackZen-Platform",
                },
            )
            if user_res.status_code != 200:
                logger.error(f"[OAuth GitHub] User fetch failed: {user_res.text}")
                return RedirectResponse(
                    url=f"{frontend_callback}?error={quote('Failed to retrieve user profile from GitHub.')}"
                )

            gh_user = user_res.json()
            github_id = str(gh_user.get("id"))
            name = gh_user.get("name") or gh_user.get("login")
            avatar = gh_user.get("avatar_url")
            email = gh_user.get("email")

            # 3. If email is private on GitHub profile, fetch from emails endpoint
            if not email:
                emails_res = await client.get(
                    GITHUB_EMAILS_URL,
                    headers={
                        "Authorization": f"Bearer {access_token}",
                        "Accept": "application/json",
                        "User-Agent": "HackZen-Platform",
                    },
                )
                if emails_res.status_code == 200:
                    emails_data = emails_res.json()
                    # Look for primary & verified
                    for em in emails_data:
                        if em.get("primary") and em.get("verified"):
                            email = em.get("email")
                            break
                    # Fallback to any verified email
                    if not email:
                        for em in emails_data:
                            if em.get("verified"):
                                email = em.get("email")
                                break
                    # Fallback to first email
                    if not email and emails_data:
                        email = emails_data[0].get("email")

            if not email:
                login_handle = gh_user.get("login", "github_user")
                email = f"{login_handle}@users.noreply.github.com"

            # 4. Upsert user in database (default role: student)
            user = await UserService.upsert_oauth_user(
                provider="github",
                provider_id=github_id,
                email=email,
                name=name,
                avatar=avatar,
            )

            # 5. Create active session record
            db = get_db()
            session_id = f"sess-{uuid4().hex[:8]}"
            client_ip = (
                request.client.host if request and request.client else "127.0.0.1"
            )

            session_doc = {
                "sessionId": session_id,
                "userId": str(user["_id"]),
                "email": user["email"],
                "device": "OAuth / GitHub",
                "location": "Online",
                "ip": client_ip,
                "lastActive": datetime.utcnow(),
                "revoked": False,
                "createdAt": datetime.utcnow(),
            }
            await db["admin_sessions"].insert_one(session_doc)

            # 6. Generate JWT token
            user_role = str(user.get("role", "student")).lower()
            token_payload = {
                "sub": str(user["_id"]),
                "email": user["email"],
                "role": user_role,
                "sessionId": session_id,
            }
            token = create_access_token(token_payload, expires_delta=timedelta(days=7))

            return RedirectResponse(url=f"{frontend_callback}?token={token}")

    except Exception as exc:
        logger.exception(f"[OAuth GitHub] Unexpected error: {exc}")
        return RedirectResponse(url=f"{frontend_callback}?error={quote(str(exc))}")
