from fastapi import APIRouter, Query, Request

from ..location_search import search_locations
from ..schemas import LocationSearchResult

router = APIRouter(prefix="/location", tags=["location"])


@router.get("/search", response_model=list[LocationSearchResult])
def location_search(
    request: Request,
    q: str = Query(min_length=2, max_length=120),
) -> list[LocationSearchResult]:
    requester = request.client.host if request.client else "anonymous"
    return search_locations(q, requester=requester)
