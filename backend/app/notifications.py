from __future__ import annotations

from dataclasses import dataclass

from .settings import settings


@dataclass(frozen=True)
class NotificationEmail:
    recipient: str
    subject: str
    body: str


OUTBOX: list[NotificationEmail] = []


def send_new_report_email(
    *,
    recipient: str,
    case_id: str,
    category: str,
    urgency: str,
    country: str,
    city: str | None,
    village: str | None,
    created_at: str,
) -> None:
    area = ", ".join(value for value in [village, city, country] if value)
    OUTBOX.append(
        NotificationEmail(
            recipient=recipient,
            subject=f"Amani Circle: new assigned report {case_id}",
            body=(
                f"Case ID: {case_id}\n"
                f"Category: {category}\n"
                f"Urgency: {urgency}\n"
                f"Area: {area}\n"
                f"Created: {created_at}\n"
                f"Open dashboard: {settings.dashboard_base_url}"
            ),
        )
    )


def reset_outbox_for_tests() -> None:
    OUTBOX.clear()
