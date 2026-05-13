from __future__ import annotations

import json
import time
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from .schemas import LocationSearchResult

_CACHE_TTL_SECONDS = 300
_CACHE: dict[str, tuple[float, list[LocationSearchResult]]] = {}
_LAST_REQUEST_AT: dict[str, float] = {}


def _first(address: dict[str, str], keys: list[str]) -> str | None:
    for key in keys:
        value = address.get(key)
        if value:
            return value
    return None


def normalize_nominatim_item(item: dict[str, object]) -> LocationSearchResult:
    address = item.get("address") if isinstance(item.get("address"), dict) else {}
    typed_address = {str(key): str(value) for key, value in address.items()}
    country = _first(typed_address, ["country"])
    city = _first(typed_address, ["city", "town", "municipality", "county", "state_district"])
    village = _first(typed_address, ["village", "suburb", "neighbourhood", "neighborhood", "hamlet", "locality"])
    landmark = _first(typed_address, ["amenity", "building", "road", "waterway", "shop", "tourism"])
    missing_fields = [
        field
        for field, value in [("country", country), ("city", city), ("village", village)]
        if not value
    ]
    return LocationSearchResult(
        label=str(item.get("display_name") or ""),
        country=country,
        country_code=typed_address.get("country_code", "").upper() or None,
        city=city,
        village=village,
        landmark=landmark,
        provider="nominatim",
        provider_place_id=str(item.get("place_id") or item.get("osm_id") or ""),
        missing_fields=missing_fields,
    )


def _provider_search(query: str) -> list[LocationSearchResult]:
    params = urlencode(
        {
            "q": query,
            "format": "jsonv2",
            "addressdetails": "1",
            "limit": "5",
        }
    )
    request = Request(
        f"https://nominatim.openstreetmap.org/search?{params}",
        headers={"User-Agent": "AmaniCircle/0.1 location-search"},
    )
    with urlopen(request, timeout=4) as response:
        payload = json.loads(response.read().decode("utf-8"))
    if not isinstance(payload, list):
        return []
    return [normalize_nominatim_item(item) for item in payload if isinstance(item, dict)]


def search_locations(query: str, requester: str = "anonymous") -> list[LocationSearchResult]:
    cleaned = " ".join(query.strip().split())
    if len(cleaned) < 2:
        return []

    now = time.time()
    cache_key = cleaned.lower()
    cached = _CACHE.get(cache_key)
    if cached and now - cached[0] < _CACHE_TTL_SECONDS:
        return cached[1]

    last_request = _LAST_REQUEST_AT.get(requester, 0)
    if now - last_request < 1:
        return []
    _LAST_REQUEST_AT[requester] = now

    try:
        results = _provider_search(cleaned)
    except Exception:
        results = []
    _CACHE[cache_key] = (now, results)
    return results


def reset_location_search_for_tests() -> None:
    _CACHE.clear()
    _LAST_REQUEST_AT.clear()
