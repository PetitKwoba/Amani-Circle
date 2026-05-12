from __future__ import annotations

import time
from collections import defaultdict, deque

from .errors import ApiError
from .settings import settings

_attempts: dict[str, deque[float]] = defaultdict(deque)


def check_followup_rate_limit(key: str) -> None:
    now = time.time()
    attempts = _attempts[key]
    while attempts and now - attempts[0] > settings.followup_rate_limit_window_seconds:
        attempts.popleft()
    if len(attempts) >= settings.followup_rate_limit_attempts:
        raise ApiError(429, "FOLLOWUP_RATE_LIMITED", "Too many follow-up attempts. Try again later.")
    attempts.append(now)


def reset_rate_limits_for_tests() -> None:
    _attempts.clear()
