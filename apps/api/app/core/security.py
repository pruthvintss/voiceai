from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from functools import wraps
from typing import Any, Optional

from cryptography.fernet import Fernet, InvalidToken
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# -----------------------------------------------------------------------
# Password hashing
# -----------------------------------------------------------------------
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# -----------------------------------------------------------------------
# JWT
# -----------------------------------------------------------------------
ALGORITHM = "HS256"


def _now() -> datetime:
    return datetime.now(tz=timezone.utc)


def create_access_token(
    subject: str,
    extra: Optional[dict[str, Any]] = None,
) -> str:
    expire = _now() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": _now(),
        "exp": expire,
        "type": "access",
        "jti": str(uuid.uuid4()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def create_refresh_token(subject: str) -> str:
    expire = _now() + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": _now(),
        "exp": expire,
        "type": "refresh",
        "jti": str(uuid.uuid4()),
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=ALGORITHM)


def decode_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc


def get_subject_from_token(token: str, token_type: str = "access") -> str:
    payload = decode_token(token)
    if payload.get("type") != token_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token type, expected {token_type}",
        )
    subject: Optional[str] = payload.get("sub")
    if subject is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing subject",
        )
    return subject


# -----------------------------------------------------------------------
# API Key Encryption (Fernet symmetric)
# -----------------------------------------------------------------------
def _get_fernet() -> Fernet:
    key = settings.ENCRYPTION_KEY
    if isinstance(key, str):
        key = key.encode()
    return Fernet(key)


def encrypt_api_key(plain_key: str) -> str:
    """Encrypt a plain-text API key and return a base64 ciphertext string."""
    f = _get_fernet()
    token = f.encrypt(plain_key.encode())
    return token.decode()


def decrypt_api_key(encrypted_key: str) -> str:
    """Decrypt a previously encrypted API key."""
    f = _get_fernet()
    try:
        plain = f.decrypt(encrypted_key.encode())
        return plain.decode()
    except InvalidToken as exc:
        raise ValueError("Failed to decrypt API key — invalid token or wrong key") from exc


def mask_api_key(plain_key: str) -> str:
    """Return a masked version of the key for display (e.g. sk-...abcd)."""
    if len(plain_key) <= 8:
        return "****"
    return plain_key[:3] + "..." + plain_key[-4:]


# -----------------------------------------------------------------------
# RBAC helpers
# -----------------------------------------------------------------------
class Role:
    OWNER = "owner"
    ADMIN = "admin"
    MEMBER = "member"

    HIERARCHY: dict[str, int] = {
        "owner": 3,
        "admin": 2,
        "member": 1,
    }

    @classmethod
    def has_permission(cls, user_role: str, required_role: str) -> bool:
        return cls.HIERARCHY.get(user_role, 0) >= cls.HIERARCHY.get(required_role, 0)


def require_role(minimum_role: str):
    """Decorator factory for RBAC on route handlers.

    Usage:
        @require_role(Role.ADMIN)
        async def my_endpoint(membership: WorkspaceMember = Depends(get_workspace_member)):
            ...
    """
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Retrieve membership from kwargs (injected by dependency)
            membership = kwargs.get("membership")
            if membership is None:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Workspace membership not found",
                )
            if not Role.has_permission(membership.role, minimum_role):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=f"Requires {minimum_role} role or higher",
                )
            return await func(*args, **kwargs)
        return wrapper
    return decorator
