import os

from fastapi import HTTPException


def require_responder_key(responder_key: str | None) -> None:
    expected_key = os.getenv("AMANI_RESPONDER_KEY", "amani-dev-responder")
    if responder_key != expected_key:
        raise HTTPException(status_code=401, detail="Responder access required")
