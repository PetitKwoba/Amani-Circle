import sqlite3

from fastapi import APIRouter, Request, Response

from ..auth import authenticate, hash_password, logout_session, session_from_request
from ..errors import ApiError
from ..rate_limit import check_auth_rate_limit
from ..schemas import AccountLogin, AccountSignup, AuthSessionResponse, ResponderLogin
from ..settings import settings
from ..store import signup_user

router = APIRouter(tags=["auth"])


def _client_key(request: Request, suffix: str) -> str:
    host = request.client.host if request.client else "unknown"
    return f"{host}:{suffix}"


def _set_session_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_ttl_seconds,
        path="/",
    )


def _session_response(session) -> AuthSessionResponse:
    return AuthSessionResponse(
        authenticated=True,
        username=session.username,
        role=session.role.value,
        contact_type=session.contact_type,
        contact=session.contact,
        contact_verified=session.contact_verified,
    )


@router.post("/auth/signup", response_model=AuthSessionResponse, status_code=201)
def signup(signup_request: AccountSignup, request: Request, response: Response) -> AuthSessionResponse:
    check_auth_rate_limit(_client_key(request, "signup"))
    try:
        signup_user(signup_request, hash_password(signup_request.password))
    except sqlite3.IntegrityError:
        raise ApiError(409, "ACCOUNT_UNAVAILABLE", "Account could not be created with those details.")

    session = authenticate(signup_request.username, signup_request.password)
    if not session:
        raise ApiError(500, "ACCOUNT_SESSION_FAILED", "Account was created but login failed.")
    _set_session_cookie(response, session.token)
    return _session_response(session)


@router.post("/auth/login", response_model=AuthSessionResponse)
def login(credentials: AccountLogin, request: Request, response: Response) -> AuthSessionResponse:
    check_auth_rate_limit(_client_key(request, "login"))
    session = authenticate(credentials.username, credentials.password)
    if not session:
        raise ApiError(401, "LOGIN_INVALID", "Login details are invalid.")
    _set_session_cookie(response, session.token)
    return _session_response(session)


@router.post("/auth/logout", response_model=AuthSessionResponse)
def logout(request: Request, response: Response) -> AuthSessionResponse:
    logout_session(request)
    response.delete_cookie(settings.session_cookie_name, path="/")
    return AuthSessionResponse(authenticated=False)


@router.get("/auth/session", response_model=AuthSessionResponse)
def session_status(request: Request) -> AuthSessionResponse:
    session = session_from_request(request)
    if not session:
        return AuthSessionResponse(authenticated=False)
    return _session_response(session)


@router.post("/responder/auth/login", response_model=AuthSessionResponse)
def responder_login(credentials: ResponderLogin, request: Request, response: Response) -> AuthSessionResponse:
    return login(AccountLogin(username=credentials.username, password=credentials.password), request, response)


@router.post("/responder/auth/logout", response_model=AuthSessionResponse)
def responder_logout(request: Request, response: Response) -> AuthSessionResponse:
    return logout(request, response)


@router.get("/responder/auth/session", response_model=AuthSessionResponse)
def responder_session_status(request: Request) -> AuthSessionResponse:
    return session_status(request)
