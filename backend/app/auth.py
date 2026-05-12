from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass

from fastapi import Request

from .errors import ApiError
from .settings import settings


@dataclass(frozen=True)
class ResponderSession:
    username: str
    expires_at: int


def _encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).decode("ascii").rstrip("=")


def _decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(f"{value}{padding}".encode("ascii"))


def create_session_token(username: str) -> str:
    payload = json.dumps(
        {"sub": username, "exp": int(time.time()) + settings.session_ttl_seconds},
        separators=(",", ":"),
        sort_keys=True,
    ).encode("utf-8")
    signature = hmac.new(settings.session_secret.encode("utf-8"), payload, hashlib.sha256).digest()
    return f"{_encode(payload)}.{_encode(signature)}"


def read_session_token(token: str | None) -> ResponderSession | None:
    if not token or "." not in token:
        return None
    payload_part, signature_part = token.split(".", 1)
    try:
        payload = _decode(payload_part)
        received_signature = _decode(signature_part)
        expected_signature = hmac.new(settings.session_secret.encode("utf-8"), payload, hashlib.sha256).digest()
        if not hmac.compare_digest(received_signature, expected_signature):
            return None
        decoded = json.loads(payload.decode("utf-8"))
        expires_at = int(decoded["exp"])
        if expires_at <= int(time.time()):
            return None
        username = str(decoded["sub"])
        return ResponderSession(username=username, expires_at=expires_at)
    except (KeyError, ValueError, TypeError, json.JSONDecodeError):
        return None


def require_responder_session(request: Request) -> ResponderSession:
    session = read_session_token(request.cookies.get(settings.session_cookie_name))
    if not session:
        raise ApiError(401, "RESPONDER_AUTH_REQUIRED", "Responder login required.")
    return session
