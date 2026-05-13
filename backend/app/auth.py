from __future__ import annotations

import base64
import hashlib
import hmac
import secrets
from dataclasses import dataclass

from fastapi import Request

from .errors import ApiError
from .schemas import UserRole
from .settings import settings
from .store import create_session, find_user_for_login, get_session_user, revoke_session


PASSWORD_SCHEME = "scrypt"


@dataclass(frozen=True)
class AuthSession:
    user_id: int
    username: str
    role: UserRole
    token: str
    contact_type: str | None = None
    contact: str | None = None
    contact_verified: bool = False


def _encode(value: bytes) -> str:
    return base64.urlsafe_b64encode(value).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    return base64.urlsafe_b64decode(f"{value}{'=' * (-len(value) % 4)}".encode("ascii"))


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64)
    return f"{PASSWORD_SCHEME}${_encode(salt)}${_encode(digest)}"


def verify_password(password: str, encoded: str) -> bool:
    try:
        scheme, salt_value, digest_value = encoded.split("$", 2)
        if scheme != PASSWORD_SCHEME:
            return False
        salt = _decode(salt_value)
        expected = _decode(digest_value)
        received = hashlib.scrypt(password.encode("utf-8"), salt=salt, n=2**14, r=8, p=1, dklen=64)
        return hmac.compare_digest(received, expected)
    except (ValueError, TypeError):
        return False


def authenticate(username: str, password: str) -> AuthSession | None:
    user = find_user_for_login(username)
    if not user or not user["is_active"] or not verify_password(password, user["password_hash"]):
        return None
    token = create_session(user["id"])
    return AuthSession(
        user_id=user["id"],
        username=user["username"],
        role=UserRole(user["role"]),
        token=token,
        contact_type=user["contact_type"],
        contact=user["contact"],
        contact_verified=bool(user["contact_verified_at"]),
    )


def session_from_request(request: Request) -> AuthSession | None:
    token = request.cookies.get(settings.session_cookie_name)
    if not token:
        return None
    user = get_session_user(token)
    if not user:
        return None
    return AuthSession(
        user_id=user["id"],
        username=user["username"],
        role=UserRole(user["role"]),
        token=token,
        contact_type=user["contact_type"],
        contact=user["contact"],
        contact_verified=bool(user["contact_verified_at"]),
    )


def require_responder_session(request: Request) -> AuthSession:
    session = session_from_request(request)
    if not session or session.role not in {UserRole.responder, UserRole.admin}:
        raise ApiError(401, "RESPONDER_AUTH_REQUIRED", "Responder login required.")
    return session


def require_admin_session(request: Request) -> AuthSession:
    session = session_from_request(request)
    if not session or session.role != UserRole.admin:
        raise ApiError(403, "ADMIN_AUTH_REQUIRED", "Admin access required.")
    return session


def logout_session(request: Request) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        revoke_session(token)
