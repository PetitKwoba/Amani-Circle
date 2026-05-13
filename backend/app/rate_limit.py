from __future__ import annotations

import time
from collections import defaultdict, deque

from .errors import ApiError
from .settings import settings

_attempts: dict[str, deque[float]] = defaultdict(deque)


def check_followup_rate_limit(key: str) -> None:
    check_rate_limit(key, settings.followup_rate_limit_window_seconds, settings.followup_rate_limit_attempts, "FOLLOWUP_RATE_LIMITED")


def check_auth_rate_limit(key: str) -> None:
    check_rate_limit(f"auth:{key}", 300, 10, "AUTH_RATE_LIMITED")


def check_rate_limit(key: str, window_seconds: int, max_attempts: int, code: str) -> None:
    now = time.time()
    attempts = _attempts[key]
    while attempts and now - attempts[0] > window_seconds:
        attempts.popleft()
    if len(attempts) >= max_attempts:
        raise ApiError(429, code, "Too many attempts. Try again later.")
    attempts.append(now)


def reset_rate_limits_for_tests() -> None:
    _attempts.clear()
