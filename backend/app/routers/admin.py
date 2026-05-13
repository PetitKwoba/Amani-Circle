from fastapi import APIRouter, Depends, HTTPException

from ..auth import AuthSession, require_admin_session
from ..schemas import (
    AdminUserSummary,
    AreaAssignment,
    AreaAssignmentCreate,
    ContentStatus,
    PublicContent,
    PublicContentReview,
    PublicReviewUpdate,
    ResponderReport,
)
from ..store import (
    create_area_assignment,
    delete_area_assignment,
    list_content_for_admin_review,
    list_admin_users,
    list_area_assignments,
    review_public_content,
    update_admin_public_approval,
)

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserSummary])
def admin_users(_: AuthSession = Depends(require_admin_session)) -> list[AdminUserSummary]:
    return list_admin_users()


@router.get("/responders/{user_id}/assignments", response_model=list[AreaAssignment])
def admin_assignments(user_id: int, _: AuthSession = Depends(require_admin_session)) -> list[AreaAssignment]:
    return list_area_assignments(user_id)


@router.post("/responders/{user_id}/assignments", response_model=AreaAssignment, status_code=201)
def admin_create_assignment(
    user_id: int,
    assignment: AreaAssignmentCreate,
    _: AuthSession = Depends(require_admin_session),
) -> AreaAssignment:
    return create_area_assignment(user_id, assignment)


@router.delete("/responders/{user_id}/assignments/{assignment_id}", status_code=204)
def admin_delete_assignment(
    user_id: int,
    assignment_id: int,
    _: AuthSession = Depends(require_admin_session),
) -> None:
    if not delete_area_assignment(user_id, assignment_id):
        raise HTTPException(status_code=404, detail="Assignment not found")


@router.patch("/reports/{report_id}/public-approval", response_model=ResponderReport)
def admin_public_approval(
    report_id: int,
    update: PublicReviewUpdate,
    session: AuthSession = Depends(require_admin_session),
) -> ResponderReport:
    report = update_admin_public_approval(report_id, update, actor=session.username)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found or not responder-approved")
    return report


@router.get("/content/review", response_model=list[PublicContent])
def admin_content_review(_: AuthSession = Depends(require_admin_session)) -> list[PublicContent]:
    return list_content_for_admin_review()


@router.post("/content/{content_id}/approve", response_model=PublicContent)
def admin_approve_content(
    content_id: int,
    review: PublicContentReview,
    session: AuthSession = Depends(require_admin_session),
) -> PublicContent:
    content = review_public_content(content_id, session.user_id, ContentStatus.approved, review)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.post("/content/{content_id}/reject", response_model=PublicContent)
def admin_reject_content(
    content_id: int,
    review: PublicContentReview,
    session: AuthSession = Depends(require_admin_session),
) -> PublicContent:
    content = review_public_content(content_id, session.user_id, ContentStatus.rejected, review)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content


@router.post("/content/{content_id}/archive", response_model=PublicContent)
def admin_archive_content(
    content_id: int,
    review: PublicContentReview,
    session: AuthSession = Depends(require_admin_session),
) -> PublicContent:
    content = review_public_content(content_id, session.user_id, ContentStatus.archived, review)
    if not content:
        raise HTTPException(status_code=404, detail="Content not found")
    return content
