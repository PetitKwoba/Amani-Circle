from fastapi import APIRouter, HTTPException, Request

from ..rate_limit import check_followup_rate_limit
from ..schemas import CaseStatusLookup, CaseStatusResponse, ReportCreate, ReportCreateResponse
from ..store import create_report, lookup_case_status

router = APIRouter(prefix="/community", tags=["community"])


@router.post("/reports", response_model=ReportCreateResponse, status_code=201)
def submit_report(report: ReportCreate) -> ReportCreateResponse:
    return create_report(report)


@router.post("/reports/{case_id}/status", response_model=CaseStatusResponse)
def check_case_status(case_id: str, lookup: CaseStatusLookup, request: Request) -> CaseStatusResponse:
    remote = request.client.host if request.client else "unknown"
    check_followup_rate_limit(f"{remote}:{case_id}")
    status = lookup_case_status(case_id, lookup.follow_up_code)
    if not status:
        raise HTTPException(status_code=404, detail="Case not found")
    return status
