from fastapi import APIRouter

from ..schemas import PublicStats
from ..store import get_public_stats

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/stats", response_model=PublicStats)
def public_stats() -> PublicStats:
    return get_public_stats()
