from fastapi import APIRouter, Depends, HTTPException, Query

from ..auth import ResponderSession, require_responder_session
from ..schemas import ResponderReport, ResponderStatusUpdate
from ..store import list_responder_reports, update_report_status

router = APIRouter(prefix="/responder", tags=["responder"])


@router.get("/reports", response_model=list[ResponderReport])
def responder_reports(
    status: str | None = None,
    category: str | None = None,
    urgency: str | None = None,
    limit: int = Query(default=100, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _: ResponderSession = Depends(require_responder_session),
) -> list[ResponderReport]:
    return list_responder_reports(status=status, category=category, urgency=urgency, limit=limit, offset=offset)


@router.patch("/reports/{report_id}/status", response_model=ResponderReport)
def responder_update_status(
    report_id: int,
    update: ResponderStatusUpdate,
    session: ResponderSession = Depends(require_responder_session),
) -> ResponderReport:
    report = update_report_status(report_id, update, actor=session.username)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
