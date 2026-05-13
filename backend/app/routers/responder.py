from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile

from ..auth import AuthSession, require_responder_session
from ..schemas import (
    PublicContent,
    PublicContentAsset,
    PublicContentCreate,
    PublicContentUpdate,
    PublicReviewUpdate,
    ReportCategoryUpdate,
    ResponderNotification,
    ResponderReport,
    ResponderStatusUpdate,
)
from ..store import (
    list_notifications,
    list_responder_content,
    list_responder_reports,
    mark_notification_read,
    create_public_content,
    create_content_asset,
    delete_content_asset,
    list_content_assets,
    submit_public_content,
    update_public_content,
    update_report_status,
    update_report_category,
    update_responder_public_review,
)
from ..media import validate_and_store_upload

router = APIRouter(prefix="/responder", tags=["responder"])


@router.get("/reports", response_model=list[ResponderReport])
def responder_reports(
    status: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: AuthSession = Depends(require_responder_session),
) -> list[ResponderReport]:
    return list_responder_reports(status=status, category=category, urgency=urgency, limit=limit, offset=offset)


@router.get("/content", response_model=list[PublicContent])
def responder_content(session: AuthSession = Depends(require_responder_session)) -> list[PublicContent]:
    return list_responder_content(session.user_id)


@router.post("/content", response_model=PublicContent, status_code=201)
def responder_create_content(
    content: PublicContentCreate,
    session: AuthSession = Depends(require_responder_session),
) -> PublicContent:
    return create_public_content(session.user_id, content)


@router.patch("/content/{content_id}", response_model=PublicContent)
def responder_update_content(
    content_id: int,
    content: PublicContentUpdate,
    session: AuthSession = Depends(require_responder_session),
) -> PublicContent:
    updated = update_public_content(session.user_id, content_id, content)
    if not updated:
        raise HTTPException(status_code=404, detail="Editable content not found")
    return updated


@router.post("/content/{content_id}/submit", response_model=PublicContent)
def responder_submit_content(
    content_id: int,
    session: AuthSession = Depends(require_responder_session),
) -> PublicContent:
    submitted = submit_public_content(session.user_id, content_id)
    if not submitted:
        raise HTTPException(status_code=404, detail="Submittable content not found")
    return submitted


@router.post("/content/{content_id}/assets", response_model=PublicContentAsset, status_code=201)
async def responder_upload_content_asset(
    content_id: int,
    file: UploadFile = File(...),
    session: AuthSession = Depends(require_responder_session),
) -> PublicContentAsset:
    metadata = await validate_and_store_upload(file)
    asset = create_content_asset(content_id, session.user_id, metadata)
    if not asset:
        raise HTTPException(status_code=404, detail="Editable content not found")
    return asset


@router.get("/content/{content_id}/assets", response_model=list[PublicContentAsset])
def responder_content_assets(
    content_id: int,
    _: AuthSession = Depends(require_responder_session),
) -> list[PublicContentAsset]:
    return list_content_assets(content_id)


@router.delete("/content/{content_id}/assets/{asset_id}", status_code=204)
def responder_delete_content_asset(
    content_id: int,
    asset_id: int,
    session: AuthSession = Depends(require_responder_session),
) -> None:
    if not delete_content_asset(content_id, asset_id, session.user_id):
        raise HTTPException(status_code=404, detail="Editable asset not found")


@router.patch("/reports/{report_id}/status", response_model=ResponderReport)
def responder_update_status(
    report_id: int,
    update: ResponderStatusUpdate,
    session: AuthSession = Depends(require_responder_session),
) -> ResponderReport:
    report = update_report_status(report_id, update, actor=session.username)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/reports/{report_id}/category", response_model=ResponderReport)
def responder_update_category(
    report_id: int,
    update: ReportCategoryUpdate,
    session: AuthSession = Depends(require_responder_session),
) -> ResponderReport:
    report = update_report_category(report_id, update, actor=session.username)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.patch("/reports/{report_id}/public-review", response_model=ResponderReport)
def responder_public_review(
    report_id: int,
    update: PublicReviewUpdate,
    session: AuthSession = Depends(require_responder_session),
) -> ResponderReport:
    report = update_responder_public_review(report_id, update, actor=session.username)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.get("/notifications", response_model=list[ResponderNotification])
def responder_notifications(session: AuthSession = Depends(require_responder_session)) -> list[ResponderNotification]:
    return list_notifications(session.user_id)


@router.post("/notifications/{notification_id}/read", response_model=ResponderNotification)
def responder_mark_notification_read(
    notification_id: int,
    session: AuthSession = Depends(require_responder_session),
) -> ResponderNotification:
    notification = mark_notification_read(session.user_id, notification_id)
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    return notification
