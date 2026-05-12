import hmac

from fastapi import APIRouter, Request, Response

from ..auth import create_session_token, read_session_token
from ..errors import ApiError
from ..schemas import ResponderLogin, ResponderSessionResponse
from ..settings import settings

router = APIRouter(prefix="/responder/auth", tags=["responder-auth"])


@router.post("/login", response_model=ResponderSessionResponse)
def login(credentials: ResponderLogin, response: Response) -> ResponderSessionResponse:
    username_matches = hmac.compare_digest(credentials.username, settings.responder_username)
    password_matches = hmac.compare_digest(credentials.password, settings.responder_password)
    if not username_matches or not password_matches:
        raise ApiError(401, "RESPONDER_LOGIN_INVALID", "Responder credentials are invalid.")

    response.set_cookie(
        key=settings.session_cookie_name,
        value=create_session_token(credentials.username),
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_seconds,
        path="/",
    )
    return ResponderSessionResponse(authenticated=True, username=credentials.username)


@router.post("/logout", response_model=ResponderSessionResponse)
def logout(response: Response) -> ResponderSessionResponse:
    response.delete_cookie(settings.session_cookie_name, path="/")
    return ResponderSessionResponse(authenticated=False)


@router.get("/session", response_model=ResponderSessionResponse)
def session_status(request: Request) -> ResponderSessionResponse:
    session = read_session_token(request.cookies.get(settings.session_cookie_name))
    if not session:
        return ResponderSessionResponse(authenticated=False)
    return ResponderSessionResponse(authenticated=True, username=session.username)
