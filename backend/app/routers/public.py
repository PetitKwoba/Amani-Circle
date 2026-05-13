from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from ..media import stored_file_path
from ..schemas import PublicContent, PublicContentAssetPublic, PublicContentPublic, PublicStats
from ..store import get_approved_public_content, get_public_content_asset, get_public_stats, list_public_content

router = APIRouter(prefix="/public", tags=["public"])


@router.get("/stats", response_model=PublicStats)
def public_stats() -> PublicStats:
    return get_public_stats()


def public_content_response(content: PublicContent) -> PublicContentPublic:
    return PublicContentPublic(
        id=content.id,
        content_type=content.content_type,
        title=content.title,
        hero_message=content.hero_message,
        summary=content.summary,
        body=content.body,
        body_json=content.body_json,
        body_text=content.body_text,
        meeting_starts_at=content.meeting_starts_at,
        meeting_location=content.meeting_location,
        country=content.country,
        city=content.city,
        village=content.village,
        reviewed_at=content.reviewed_at,
        assets=[
            PublicContentAssetPublic(
                id=asset.id,
                asset_type=asset.asset_type,
                original_filename=asset.original_filename,
                mime_type=asset.mime_type,
                file_size=asset.file_size,
                url=f"/public/content/{content.id}/assets/{asset.id}/download",
                thumbnail_url=f"/public/content/{content.id}/assets/{asset.id}/download" if asset.asset_type.value == "image" else None,
            )
            for asset in content.assets
            if asset.scan_status.value == "clean"
        ],
    )


@router.get("/content", response_model=list[PublicContentPublic])
def public_content(type: str | None = None) -> list[PublicContentPublic]:
    return [public_content_response(content) for content in list_public_content(type)]


@router.get("/content/{content_id}", response_model=PublicContentPublic)
def public_content_detail(content_id: int) -> PublicContentPublic:
    content = get_approved_public_content(content_id)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return public_content_response(content)


@router.get("/content/{content_id}/assets/{asset_id}/download")
def public_content_asset_download(content_id: int, asset_id: int) -> FileResponse:
    asset = get_public_content_asset(content_id, asset_id)
    if not asset:
        raise HTTPException(status_code=404, detail="Asset not found")
    path = stored_file_path(asset["stored_filename"])
    if not path.exists():
        raise HTTPException(status_code=404, detail="Asset not found")
    return FileResponse(
        path,
        media_type=asset["mime_type"],
        filename=asset["original_filename"],
        headers={
            "Content-Disposition": f"attachment; filename=\"{asset['original_filename']}\"",
            "X-Content-Type-Options": "nosniff",
            "Cache-Control": "public, max-age=86400",
        },
    )
