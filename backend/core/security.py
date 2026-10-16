from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple
from jose import JWTError, jwt
from fastapi import HTTPException, status, Security, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import secrets
import bcrypt
import hashlib
import re
from uuid import uuid4
from core.config import settings
import json
import base64

security = HTTPBearer(auto_error=False)

_CONTROL_CHARS = re.compile(r"[\x00-\x1f\x7f]")
_MULTI_SPACE = re.compile(r"\s+")


def sanitize_text(value: str, limit: int = 8000) -> str:
    cleaned = _CONTROL_CHARS.sub(" ", value)
    cleaned = _MULTI_SPACE.sub(" ", cleaned).strip()
    return cleaned[:limit]


def secure_filename(name: str) -> str:
    from pathlib import Path

    base = Path(name).name
    return re.sub(r"[^A-Za-z0-9._-]", "_", base)


def get_password_hash(password: str) -> str:
    """Hash a password for storing."""
    salt = bcrypt.gensalt(rounds=12)  # Increased rounds for better security
    hashed_password = bcrypt.hashpw(password.encode("utf-8"), salt)
    return hashed_password.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a stored password against one provided by user."""
    return bcrypt.checkpw(
        plain_password.encode("utf-8"), hashed_password.encode("utf-8")
    )


def create_access_token(
    data: Dict[str, Any], expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token."""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        # Parse expiration time from settings
        expires_in = settings.ACCESS_TOKEN_EXPIRE_MINUTES
        expire = datetime.utcnow() + timedelta(minutes=expires_in)

    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access",
            "jti": str(uuid4()),  # Use UUID for better uniqueness
            "iss": settings.JWT_ISSUER,
            "aud": settings.JWT_AUDIENCE,
        }
    )

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    """Create a JWT refresh token."""
    expire = datetime.utcnow() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode = {
        "sub": str(user_id),
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "refresh",
        "jti": str(uuid4()),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_token(token: str, token_type: str = "access") -> Dict[str, Any]:
    """Verify JWT token and return payload."""
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM],
            audience=settings.JWT_AUDIENCE,
            issuer=settings.JWT_ISSUER,
        )

        # Check token type
        if payload.get("type") != token_type:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token type. Expected {token_type}",
            )

        return payload

    except jwt.ExpiredSignatureError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except JWTError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Dict[str, Any]:
    """Get current user from JWT token."""
    # Get token from Authorization header
    token = None

    if credentials:
        token = credentials.credentials

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if settings.ALLOW_MOCK_AUTH and token.startswith("mock-token-"):
        encoded_email = token.replace("mock-token-", "", 1)
        try:
            padding = "=" * (-len(encoded_email) % 4)
            email = base64.b64decode(f"{encoded_email}{padding}").decode("utf-8")
        except Exception:
            email = "mock@example.com"

        mock_roles = {
            "ananya.rao@microsoft.com": "mentor",
            "msailesh@gmail.com": "student",
            "psaravanan@gmail.com": "organizer",
            "ghariraajan@gmail.com": "admin",
        }
        role = mock_roles.get(email.lower(), "student")

        return {
            "id": f"mock-{role}-{email}",
            "email": email,
            "role": role,
            "permissions": [],
            "team_id": None,
            "exp": None,
            "jti": "mock-token",
            "is_mock": True,
        }

    payload = verify_token(token, "access")

    # Extract user information
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )

    return {
        "id": user_id,
        "email": payload.get("email"),
        "role": payload.get("role", "user"),
        "permissions": payload.get("permissions", []),
        "team_id": payload.get("team_id"),
        "exp": payload.get("exp"),
        "jti": payload.get("jti"),
    }


async def get_current_user_optional(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Optional[Dict[str, Any]]:
    """Get current user from JWT token optionally (don't raise 401 if missing)."""
    if not credentials or not credentials.credentials:
        return None
    try:
        token = credentials.credentials
        payload = verify_token(token, "access")
        user_id = payload.get("sub")
        if not user_id:
            return None
        return {
            "id": user_id,
            "email": payload.get("email"),
            "role": payload.get("role", "user"),
            "permissions": payload.get("permissions", []),
            "team_id": payload.get("team_id"),
        }
    except Exception:
        return None


async def get_current_active_user(
    current_user: Dict[str, Any] = Security(get_current_user),
) -> Dict[str, Any]:
    """Get current active user (checks if user is active)."""
    # Add any additional active user checks here
    # For example: check if user account is active in database
    return current_user


def generate_api_key(name: str, user_id: str) -> Tuple[str, str, Dict[str, Any]]:
    """Generate an API key for programmatic access with metadata."""
    # Generate random key
    random_string = secrets.token_urlsafe(32)
    api_key = f"hk_{random_string}"

    # Create metadata
    metadata = {
        "name": name,
        "user_id": user_id,
        "created_at": datetime.utcnow().isoformat(),
        "last_used": None,
        "prefix": api_key[:8],
    }

    # Hash the key for storage
    api_key_hash = hash_data(api_key)

    return api_key, api_key_hash, metadata


def verify_api_key(api_key: str, stored_hash: str) -> bool:
    """Verify an API key against its stored hash."""
    computed_hash = hash_data(api_key)
    return secrets.compare_digest(computed_hash, stored_hash)


def generate_team_invite_code() -> str:
    alphabet = "1234567890"
    return "".join(secrets.choice(alphabet) for _ in range(6))


def generate_submission_id() -> str:
    """Generate a unique submission ID."""
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_part = secrets.token_hex(3).upper()
    return f"SUB-{timestamp}-{random_part}"


def generate_hackathon_code() -> str:
    """Generate a unique hackathon code for organizers."""
    alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
    return "".join(secrets.choice(alphabet) for _ in range(8))


def generate_verification_code(length: int = 6) -> str:
    """Generate a numeric verification code for email verification."""
    return "".join(secrets.choice("0123456789") for _ in range(length))


def hash_data(data: str) -> str:
    """Hash data for secure storage."""
    # Use HMAC with secret key for additional security
    return hashlib.sha256(f"{data}{settings.SECRET_KEY}".encode()).hexdigest()


def validate_password_strength(password: str) -> Tuple[bool, str]:
    """Validate password strength with comprehensive checks."""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"

    if len(password) > 128:
        return False, "Password must be less than 128 characters"

    if not re.search(r"[A-Z]", password):
        return False, "Password must contain at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return False, "Password must contain at least one lowercase letter"

    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one digit"

    if not re.search(r'[!@#$%^&*()_+\-=\[\]{};\':"\\|,.<>\/?]', password):
        return False, "Password must contain at least one special character"

    # Check for common passwords
    common_passwords = {"password", "12345678", "qwerty123", "admin123"}
    if password.lower() in common_passwords:
        return False, "Password is too common"

    # Check for sequential characters
    if re.search(r"(.)\1{3,}", password):
        return False, "Password contains too many repeating characters"

    return True, "Password is strong"


def sanitize_input(input_str: str) -> str:
    """Sanitize user input to prevent XSS attacks."""
    # Remove HTML tags
    clean = re.sub(r"<[^>]*>", "", input_str)
    # Escape special characters
    clean = clean.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    return clean.strip()


def generate_secure_filename(original_filename: str) -> str:
    """Generate a secure filename for uploads."""
    # Extract extension
    ext = original_filename.split(".")[-1] if "." in original_filename else ""

    # Generate secure name
    timestamp = datetime.utcnow().strftime("%Y%m%d%H%M%S")
    random_part = secrets.token_hex(8)

    if ext:
        return f"file_{timestamp}_{random_part}.{ext}"
    return f"file_{timestamp}_{random_part}"


def create_password_reset_token(email: str) -> str:
    """Create a password reset token."""
    expire = datetime.utcnow() + timedelta(
        minutes=settings.PASSWORD_RESET_TOKEN_EXPIRE_MINUTES
    )

    to_encode = {
        "sub": email,
        "exp": expire,
        "iat": datetime.utcnow(),
        "type": "password_reset",
        "jti": str(uuid4()),
    }

    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def verify_password_reset_token(token: str) -> str:
    """Verify password reset token and return email."""
    payload = verify_token(token, "password_reset")
    return payload.get("sub")


# Rate limiting implementation
class RateLimiter:
    """Rate limiter for API endpoints."""

    def __init__(self):
        self.requests = {}

    async def is_rate_limited(
        self, identifier: str, endpoint: str, limit: int = 60, window: int = 60
    ) -> bool:
        """
        Check if request is rate limited.
        In production, replace with Redis implementation.
        """
        key = f"{identifier}:{endpoint}"
        current_time = datetime.utcnow()
        window_start = current_time - timedelta(seconds=window)

        # Filter out old requests
        if key in self.requests:
            self.requests[key] = [
                req_time for req_time in self.requests[key] if req_time > window_start
            ]

        # Check if limit exceeded
        if key not in self.requests:
            self.requests[key] = []

        if len(self.requests[key]) >= limit:
            return True

        # Add current request
        self.requests[key].append(current_time)
        return False


# Security headers middleware
def get_security_headers() -> Dict[str, str]:
    """Get comprehensive security headers for responses."""
    return {
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "DENY",
        "X-XSS-Protection": "1; mode=block",
        "Strict-Transport-Security": f"max-age={31536000}; includeSubDomains",
        "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com;",
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "Cross-Origin-Opener-Policy": "same-origin",
        "Cross-Origin-Resource-Policy": "same-origin",
    }


# CORS settings for FastAPI
def get_cors_config() -> Dict[str, Any]:
    """Get CORS configuration for FastAPI."""
    return {
        "allow_origins": settings.CORS_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        "allow_headers": ["Authorization", "Content-Type", "X-API-Key"],
        "expose_headers": ["Content-Range", "X-Content-Range"],
        "max_age": 600,
    }


# Backward compatibility functions
async def get_current_user_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Security(security),
) -> Dict[str, Any]:
    """
    Deprecated: Use get_current_user instead.
    Kept for backward compatibility with existing code.
    """
    import warnings

    warnings.warn(
        "get_current_user_token is deprecated. Use get_current_user instead.",
        DeprecationWarning,
        stacklevel=2,
    )

    # Replicate the old function's behavior
    token = credentials.credentials
    payload = verify_token(token)

    if payload.get("type") != "access":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token type"
        )

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token: missing user ID",
        )

    return {
        "sub": user_id,
        "email": payload.get("email"),
        "role": payload.get("role"),
        "exp": payload.get("exp"),
        "jti": payload.get("jti"),
    }
