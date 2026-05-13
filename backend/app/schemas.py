from enum import StrEnum
from typing import Any, Literal

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


class ContentType(StrEnum):
    article = "article"
    meeting = "meeting"


class ContentStatus(StrEnum):
    draft = "draft"
    submitted = "submitted"
    approved = "approved"
    rejected = "rejected"
    archived = "archived"


class ContentAssetType(StrEnum):
    image = "image"
    pdf = "pdf"
    video = "video"


class ContentAssetScanStatus(StrEnum):
    pending = "pending"
    clean = "clean"
    infected = "infected"
    scan_failed = "scan_failed"


class ContactPreference(StrEnum):
    none = "none"
    if_needed = "if_needed"
    urgent = "urgent"


class ContactMethod(StrEnum):
    phone = "phone"
    email = "email"
    trusted_contact = "trusted_contact"
    other = "other"


class AccountContactType(StrEnum):
    email = "email"
    phone = "phone"


class Coordinates(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    precision: Literal["approximate", "exact"]


class ReportCreate(BaseModel):
    client_report_id: str = Field(min_length=8, max_length=80)
    follow_up_secret: str = Field(min_length=24, max_length=160)
    category: ReportCategory
    reporter_category_text: str | None = Field(default=None, max_length=120)
    urgency: ReportUrgency
    details: str = Field(min_length=8, max_length=4000)
    rough_location: str = Field(min_length=2, max_length=500)
    country: str = Field(min_length=2, max_length=120)
    city: str = Field(min_length=2, max_length=160)
    village: str = Field(min_length=2, max_length=160)
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
        if self.category == ReportCategory.other:
            if not self.reporter_category_text or len(self.reporter_category_text.strip()) < 2:
                raise ValueError("Other category details are required when category is other.")
            self.reporter_category_text = self.reporter_category_text.strip()
        elif self.reporter_category_text:
            raise ValueError("Other category details are only allowed when category is other.")

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


class AccountSignup(BaseModel):
    contact_type: AccountContactType
    contact: str = Field(min_length=3, max_length=240)
    username: str = Field(min_length=3, max_length=120)
    password: str = Field(min_length=10, max_length=240)

    @model_validator(mode="after")
    def validate_contact(self) -> "AccountSignup":
        if self.contact_type == AccountContactType.email and "@" not in self.contact:
            raise ValueError("A valid email address is required.")
        if self.contact_type == AccountContactType.phone and len("".join(ch for ch in self.contact if ch.isdigit())) < 7:
            raise ValueError("A valid phone number is required.")
        return self


class AccountLogin(BaseModel):
    username: str = Field(min_length=1, max_length=240)
    password: str = Field(min_length=1, max_length=240)


class AuthSessionResponse(BaseModel):
    authenticated: bool
    username: str | None = None
    role: str | None = None
    contact_type: AccountContactType | None = None
    contact: str | None = None
    contact_verified: bool = False


ResponderSessionResponse = AuthSessionResponse


class UserRole(StrEnum):
    reporter = "reporter"
    responder = "responder"
    admin = "admin"


class ResponderNotification(BaseModel):
    id: int
    report_id: int
    case_id: str
    notification_type: str
    read_at: str | None
    created_at: str


class AreaScope(StrEnum):
    country = "country"
    city = "city"
    village = "village"


class AreaAssignmentCreate(BaseModel):
    scope_type: AreaScope
    country: str = Field(min_length=2, max_length=120)
    city: str | None = Field(default=None, max_length=160)
    village: str | None = Field(default=None, max_length=160)

    @model_validator(mode="after")
    def validate_scope(self) -> "AreaAssignmentCreate":
        if self.scope_type == AreaScope.country:
            if self.city or self.village:
                raise ValueError("Country assignments cannot include city or village.")
        elif self.scope_type == AreaScope.city:
            if not self.city or self.village:
                raise ValueError("City assignments require city and cannot include village.")
        elif self.scope_type == AreaScope.village:
            if not self.city or not self.village:
                raise ValueError("Village assignments require both city and village.")
        return self


class AreaAssignment(BaseModel):
    id: int
    user_id: int
    scope_type: AreaScope
    country: str
    city: str | None
    village: str | None
    active: bool
    created_at: str
    updated_at: str


class AdminUserSummary(BaseModel):
    id: int
    username: str
    contact_type: AccountContactType
    contact: str
    role: UserRole
    contact_verified: bool


class ResponderReport(BaseModel):
    id: int
    case_id: str
    category: ReportCategory
    reporter_category_text: str | None = None
    assigned_category: str
    assigned_category_label: str | None = None
    category_edited_by: str | None = None
    category_edited_at: str | None = None
    category_edit_note: str | None = None
    urgency: ReportUrgency
    status: ReportStatus
    rough_location: str
    country: str
    city: str | None
    village: str | None
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
    responder_public_approved: bool = False
    admin_public_approved: bool = False
    public_approved_at: str | None = None
    created_at: str
    updated_at: str


class ResponderStatusUpdate(BaseModel):
    status: ReportStatus
    responder_notes: str | None = Field(default=None, max_length=2000)
    reporter_message: str | None = Field(default=None, max_length=1000)


class PublicReviewUpdate(BaseModel):
    approved: bool


class ReportCategoryUpdate(BaseModel):
    assigned_category: str = Field(min_length=2, max_length=80)
    assigned_category_label: str | None = Field(default=None, max_length=120)
    category_edit_note: str | None = Field(default=None, max_length=500)

    @model_validator(mode="after")
    def validate_category(self) -> "ReportCategoryUpdate":
        known_categories = {category.value for category in ReportCategory}
        self.assigned_category = self.assigned_category.strip()
        if self.assigned_category not in known_categories and self.assigned_category != "custom":
            raise ValueError("Assigned category must be a known category or custom.")
        if self.assigned_category == "custom":
            if not self.assigned_category_label or len(self.assigned_category_label.strip()) < 2:
                raise ValueError("Custom category label is required.")
            self.assigned_category_label = self.assigned_category_label.strip()
        else:
            self.assigned_category_label = None
        if self.category_edit_note:
            self.category_edit_note = self.category_edit_note.strip()
        return self


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


class PublicContentCreate(BaseModel):
    content_type: ContentType
    title: str = Field(min_length=3, max_length=160)
    hero_message: str | None = Field(default=None, max_length=240)
    summary: str = Field(min_length=10, max_length=500)
    body: str | None = Field(default=None, max_length=8000)
    body_json: dict[str, Any] | None = None
    body_text: str | None = Field(default=None, max_length=12000)
    meeting_starts_at: str | None = Field(default=None, max_length=80)
    meeting_location: str | None = Field(default=None, max_length=300)
    country: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=160)
    village: str | None = Field(default=None, max_length=160)

    @model_validator(mode="after")
    def validate_content_shape(self) -> "PublicContentCreate":
        if self.content_type == ContentType.article:
            if not self.hero_message or len(self.hero_message.strip()) < 6:
                raise ValueError("Articles require a hero message.")
            if not self.body_text or len(self.body_text.strip()) < 20:
                raise ValueError("Articles require body text.")
            if not self.body_json:
                raise ValueError("Articles require rich body content.")
            validate_rich_text_document(self.body_json)
            self.hero_message = self.hero_message.strip()
            self.body_text = self.body_text.strip()
            self.body = self.body_text
        if self.content_type == ContentType.meeting:
            if not self.meeting_starts_at or not self.meeting_location:
                raise ValueError("Meetings require date/time and a public rough location.")
            self.meeting_location = self.meeting_location.strip()
        self.title = self.title.strip()
        self.summary = self.summary.strip()
        return self


class PublicContentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=160)
    hero_message: str | None = Field(default=None, max_length=240)
    summary: str | None = Field(default=None, min_length=10, max_length=500)
    body: str | None = Field(default=None, max_length=8000)
    body_json: dict[str, Any] | None = None
    body_text: str | None = Field(default=None, max_length=12000)
    meeting_starts_at: str | None = Field(default=None, max_length=80)
    meeting_location: str | None = Field(default=None, max_length=300)
    country: str | None = Field(default=None, max_length=120)
    city: str | None = Field(default=None, max_length=160)
    village: str | None = Field(default=None, max_length=160)

    @model_validator(mode="after")
    def validate_rich_text_update(self) -> "PublicContentUpdate":
        if self.body_json is not None:
            validate_rich_text_document(self.body_json)
        if self.hero_message is not None:
            self.hero_message = self.hero_message.strip()
        if self.body_text is not None:
            self.body_text = self.body_text.strip()
            self.body = self.body_text
        return self


class PublicContentReview(BaseModel):
    note: str | None = Field(default=None, max_length=1000)


class PublicContent(BaseModel):
    id: int
    content_type: ContentType
    title: str
    hero_message: str | None
    summary: str
    body: str | None
    body_json: dict[str, Any] | None
    body_text: str | None
    meeting_starts_at: str | None
    meeting_location: str | None
    country: str | None
    city: str | None
    village: str | None
    status: ContentStatus
    created_by_username: str
    submitted_at: str | None
    reviewed_by_username: str | None
    reviewed_at: str | None
    admin_review_note: str | None
    assets: list["PublicContentAsset"] = []
    created_at: str
    updated_at: str


class PublicContentPublic(BaseModel):
    id: int
    content_type: ContentType
    title: str
    hero_message: str | None
    summary: str
    body: str | None
    body_json: dict[str, Any] | None
    body_text: str | None
    meeting_starts_at: str | None
    meeting_location: str | None
    country: str | None
    city: str | None
    village: str | None
    reviewed_at: str | None
    assets: list["PublicContentAssetPublic"] = []


class PublicContentAsset(BaseModel):
    id: int
    content_id: int
    asset_type: ContentAssetType
    original_filename: str
    mime_type: str
    file_size: int
    sha256_hash: str
    scan_status: ContentAssetScanStatus
    created_at: str


class PublicContentAssetPublic(BaseModel):
    id: int
    asset_type: ContentAssetType
    original_filename: str
    mime_type: str
    file_size: int
    url: str
    thumbnail_url: str | None = None


class LocationSearchResult(BaseModel):
    label: str
    country: str | None = None
    country_code: str | None = None
    city: str | None = None
    village: str | None = None
    landmark: str | None = None
    provider: str
    provider_place_id: str
    missing_fields: list[str] = []


RICH_TEXT_ALLOWED_NODES = {
    "doc",
    "paragraph",
    "text",
    "heading",
    "bulletList",
    "orderedList",
    "listItem",
    "blockquote",
    "hardBreak",
    "articleImage",
}
RICH_TEXT_ALLOWED_MARKS = {"bold", "italic", "underline", "link"}


def validate_rich_text_document(node: dict[str, Any]) -> None:
    def visit(current: Any) -> None:
        if not isinstance(current, dict):
            raise ValueError("Rich text content must be an object.")

        node_type = current.get("type")
        if node_type not in RICH_TEXT_ALLOWED_NODES:
            raise ValueError("Unsupported rich text node.")

        attrs = current.get("attrs")
        if attrs is not None:
            if not isinstance(attrs, dict):
                raise ValueError("Rich text attributes must be an object.")
            if node_type == "heading" and attrs.get("level") not in {2, 3}:
                raise ValueError("Only level 2 and 3 headings are supported.")
            if node_type == "articleImage":
                asset_id = attrs.get("assetId")
                if not isinstance(asset_id, int) or asset_id < 1:
                    raise ValueError("Article images must reference an uploaded image asset.")

        marks = current.get("marks", [])
        if marks:
            if not isinstance(marks, list):
                raise ValueError("Rich text marks must be a list.")
            for mark in marks:
                if not isinstance(mark, dict) or mark.get("type") not in RICH_TEXT_ALLOWED_MARKS:
                    raise ValueError("Unsupported rich text mark.")
                if mark.get("type") == "link":
                    href = (mark.get("attrs") or {}).get("href", "")
                    if not isinstance(href, str) or not href.startswith(("http://", "https://", "mailto:")):
                        raise ValueError("Unsupported rich text link.")

        text = current.get("text")
        if text is not None and not isinstance(text, str):
            raise ValueError("Rich text text nodes must contain text.")

        content = current.get("content", [])
        if content:
            if not isinstance(content, list):
                raise ValueError("Rich text child content must be a list.")
            for child in content:
                visit(child)

    visit(node)
