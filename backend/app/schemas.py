from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class ReportCategory(StrEnum):
    conflict_risk = "conflict_risk"
    resource_dispute = "resource_dispute"
    exclusion = "exclusion"
    corruption = "corruption"
    abuse = "abuse"
    other = "other"


class ReportUrgency(StrEnum):
    low = "low"
    medium = "medium"
    high = "high"


class ReportStatus(StrEnum):
    received = "received"
    under_review = "under_review"
    referred = "referred"
    needs_more_information = "needs_more_information"
    closed = "closed"


class ContactPreference(StrEnum):
    none = "none"
    if_needed = "if_needed"
    urgent = "urgent"


class ContactMethod(StrEnum):
    phone = "phone"
    email = "email"
    trusted_contact = "trusted_contact"
    other = "other"


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    precision: Literal["approximate", "exact"]


class ReportCreate(BaseModel):
    client_report_id: str = Field(min_length=8, max_length=80)
    follow_up_secret: str = Field(min_length=24, max_length=160)
    category: ReportCategory
    urgency: ReportUrgency
    details: str = Field(min_length=8, max_length=4000)
    rough_location: str = Field(min_length=2, max_length=500)
    rough_region: str | None = Field(default=None, max_length=200)
    nearby_landmark: str | None = Field(default=None, max_length=300)
    location_place_type: str | None = Field(default=None, max_length=80)
    evidence_notes: str | None = Field(default=None, max_length=2000)
    contact_preference: ContactPreference = ContactPreference.none
    contact_method: ContactMethod | None = None
    contact_details: str | None = Field(default=None, max_length=500)
    exact_location_consent: bool = False
    current_location: Coordinates | None = None

    @model_validator(mode="after")
    def validate_privacy_sensitive_fields(self) -> "ReportCreate":
        if self.contact_preference == ContactPreference.none:
            if self.contact_method is not None or self.contact_details:
                raise ValueError("Contact details require reporter contact consent.")
        else:
            if self.contact_method is None or not self.contact_details:
                raise ValueError("Contact method and contact details are required when contact is requested.")

        if self.exact_location_consent:
            if self.current_location is None:
                raise ValueError("Current location is required when exact-location consent is enabled.")
        elif self.current_location is not None:
            raise ValueError("Current location requires exact-location consent.")

        return self


class ReportCreateResponse(BaseModel):
    case_id: str
    follow_up_code: str
    status: ReportStatus


class CaseStatusResponse(BaseModel):
    case_id: str
    status: ReportStatus
    reporter_message_code: str
    reporter_message: str | None = None
    updated_at: str


class CaseStatusLookup(BaseModel):
    follow_up_code: str = Field(min_length=24, max_length=160)


class ResponderLogin(BaseModel):
    username: str = Field(min_length=1, max_length=120)
    password: str = Field(min_length=1, max_length=240)


class ResponderSessionResponse(BaseModel):
    authenticated: bool
    username: str | None = None


class ResponderReport(BaseModel):
    id: int
    case_id: str
    category: ReportCategory
    urgency: ReportUrgency
    status: ReportStatus
    rough_location: str
    rough_region: str | None
    nearby_landmark: str | None
    location_place_type: str | None
    details: str
    evidence_notes: str | None
    contact_preference: ContactPreference
    contact_method: ContactMethod | None
    contact_details: str | None
    has_exact_location: bool
    exact_latitude: float | None
    exact_longitude: float | None
    responder_notes: str | None
    created_at: str
    updated_at: str


class ResponderStatusUpdate(BaseModel):
    status: ReportStatus
    responder_notes: str | None = Field(default=None, max_length=2000)
    reporter_message: str | None = Field(default=None, max_length=1000)


class PublicBucket(BaseModel):
    key: str
    count: int


class PublicWeeklyTrend(BaseModel):
    week_start: str
    count: int


class PublicStats(BaseModel):
    total_reports: int
    by_category: list[PublicBucket]
    by_urgency: list[PublicBucket]
    by_status: list[PublicBucket]
    by_region: list[PublicBucket]
    by_week: list[PublicWeeklyTrend]
