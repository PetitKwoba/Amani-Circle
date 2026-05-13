# Amani Circle Consolidated Roadmap

This file is the single planning reference for Amani Circle. It consolidates the
current MVP status, tool choices, missing features, automation opportunities,
and the recommended path from hackathon MVP to pilot-ready civic product.

## 1. Current Product Baseline

Amani Circle is a working monorepo MVP with:

- Anonymous community reporting.
- Optional reporter signup/login.
- Case ID and private follow-up code lookup.
- Offline drafts and queued submission retry using IndexedDB.
- Search-first structured location entry with manual fallback.
- Responder dashboard with triage, status updates, category review, and notifications.
- Admin review paths for public-facing content.
- Public dashboard with aggregate-only reporting trends.
- Public articles and meeting updates after admin approval.
- Rich article editing using TipTap.
- Low-data mode as the product default.
- Multilingual UI foundations for English, French, Arabic, Portuguese, and Swahili.
- PWA shell, install prompt, manifest, service worker, and offline fallback.
- GitHub Actions CI for frontend and backend.

The system is a strong MVP. It is not yet pilot-safe without additional work on
security, operations, privacy hardening, automated testing, accessibility QA,
and production deployment.

## 2. Tool Inventory

### Frontend

Current tools:

- React 18 for the UI.
- Vite for development server and build.
- TypeScript for static typing.
- Tailwind CSS, PostCSS, and Autoprefixer for styling.
- TipTap for rich article editing.
- Native fetch APIs for backend communication.

Assessment:

- This stack fits the MVP well: fast, maintainable, and easy for a small team.
- Tailwind supports consistent, low-bandwidth UI when used with restraint.
- TipTap is appropriate for article-style content, but not full Microsoft Word parity.
- Missing: dedicated ESLint rules, accessibility linting, and stronger frontend architecture boundaries as the app grows.

### Backend

Current tools:

- FastAPI for API routing.
- Pydantic schemas for validation.
- Uvicorn for local ASGI serving.
- SQLite through Python's standard `sqlite3` module.
- Alembic for migration direction.
- Custom cookie-backed session auth.
- Custom in-memory rate limiting.
- Python multipart support for uploads.
- Nominatim/OpenStreetMap proxy for location search.

Assessment:

- FastAPI and Pydantic fit the privacy-sensitive API well.
- SQLite is acceptable for local MVP work but needs careful migration planning before pilot use.
- Custom session auth is better than the early responder header gate, but still below production identity standards.
- In-memory throttling is not enough for multi-instance deployments.

### Data And Storage

Current tools:

- SQLite for backend persistence.
- Alembic migration scaffolding.
- IndexedDB for report drafts, pending submissions, and local receipts.
- `localStorage` for non-sensitive UI preferences such as language, low-data mode, and comfort mode.
- Local filesystem media storage for MVP uploads.

Assessment:

- IndexedDB is the right browser primitive for offline-first reporting.
- Local filesystem media storage is only acceptable for development.
- Sensitive local browser data is not encrypted in the MVP.
- Pilot deployments should move to managed database and object storage.

### Offline And PWA

Current tools:

- Web app manifest.
- Service worker for app shell/offline fallback.
- IndexedDB submission queue.
- Install prompt UI.

Assessment:

- The current PWA layer is intentionally conservative and avoids caching sensitive API responses.
- Offline report retry works while the app is open.
- Background sync, retry backoff, queue observability, and conflict handling remain deferred.

### Internationalization

Current tools:

- `react-i18next`.
- English fallback.
- Enabled languages: English, French, Arabic, Portuguese, Swahili.
- Language registry with planned local/global languages.
- Arabic `dir="rtl"` handling.

Assessment:

- The approach is extensible and appropriate.
- Translation coverage is not complete enough for a pilot.
- Safety-sensitive language needs human review.
- Locale-specific dates, numbers, and long-string layout QA are still needed.

### Accessibility

Current tools and patterns:

- Semantic HTML in major flows.
- Visible focus styles.
- Accessible form labels, helper text, and error messaging.
- Comfort Mode.
- Keyboard-accessible modal patterns in key areas.

Assessment:

- Accessibility is built into the product direction, not treated as a cosmetic pass.
- Automated accessibility scanning is still missing.
- Formal keyboard, screen reader, zoom, contrast, reduced-motion, and long-translation testing is required before pilot use.

### Testing

Current tools:

- Pytest for backend tests.
- FastAPI/TestClient/httpx for API tests.
- Vitest for frontend tests.
- React Testing Library, jest-dom, user-event, and jsdom for component tests.

Assessment:

- Good foundation for critical MVP flows.
- Missing: Playwright end-to-end tests, axe accessibility checks, richer offline queue tests, auth/session integration tests, and migration tests against existing data.

### CI/CD

Current tools:

- GitHub Actions.
- Path-filtered frontend and backend jobs.
- Node 20 frontend CI.
- Python 3.11 backend CI.
- Frontend GitHub Pages deployment.

Assessment:

- CI is appropriate and understandable.
- Backend CD is still absent.
- Security, accessibility, localization, migration, and deployment smoke checks should be added incrementally.

### Observability And Operations

Current state:

- Basic health endpoint.
- No dedicated readiness endpoint.
- No structured logging standard.
- No metrics.
- No error monitoring.
- No backup/restore or rollback workflow.

Assessment:

- This is the largest operational gap for pilot readiness.

## 3. Missing Features

### Identity And Permissions

- External identity provider or stronger internal account system.
- Distinct responder and admin roles with least-privilege permissions.
- Password reset and account recovery.
- Session revocation across devices.
- MFA for trusted responders.
- Fine-grained authorization for sensitive report fields.
- Admin-only responder promotion workflow with audit trail.

### Security Controls

- CSRF mitigation for cookie-authenticated endpoints.
- Distributed rate limiting.
- Abuse and spam controls for report submission.
- Secret rotation strategy.
- Safer deployment defaults for secure cookies and sessions.
- Security logging and anomaly detection.
- Dependency and vulnerability review workflow.

### Privacy Hardening

- Encryption-at-rest strategy for sensitive browser queues.
- Retention and deletion policies.
- Deployment-specific data minimization controls.
- Stronger aggregate disclosure controls for small communities.
- Formal review of exact-location lifecycle.
- Export and deletion support for compliance needs.

### Reporter Experience

- More guided rough-location entry and recent location reuse.
- Stronger consent UX for contact and exact location.
- Copy, print, and save affordances for follow-up codes.
- Clearer follow-up guidance after submission.
- Evidence attachments with malware scanning and private storage.
- Optional request-a-callback flow when reporter opts into contact.
- Multi-draft management.

### Responder Workflow

- Assignment and ownership.
- Status history UI.
- Search and server-driven filtering in the dashboard.
- Bulk triage actions.
- Escalation and referral destinations.
- Internal notes separated from reporter-visible messages.
- Audit trail review.
- Export and handoff tools for trusted organizations.
- Region-based email notifications through a production provider.

### Admin Workflow

- Public aggregate approval queue for reports recommended by responders.
- Article approval queue.
- Meeting approval queue.
- Category-edit visibility before public approval.
- Role, assignment, and responder management.
- Rejection notes, approval removal, and archive flows.

### Public Experience

- Public Updates area for approved articles and meetings.
- Time-range filters on public trends.
- Stronger explanation for suppressed data.
- Accessible table alternatives for chart-like views.
- Better "not enough data yet" states.
- Deploy-configurable aggregate dimensions.

### Rich Content And Media

- Image insertion is available for articles, but media governance still needs hardening.
- Safe upload pipeline with MIME checks, hashing, size limits, malware scanning, and scan status.
- Object storage outside the frontend build.
- Low-data thumbnails and explicit load controls.
- PDF and video attachment handling.
- Admin approval blocked when any asset is unscanned, failed, or infected.

### Localization

- Full translation coverage for all UI strings.
- Human review for safety-sensitive reporting copy.
- Locale-specific date and number formatting.
- More local language packs.
- Translation QA in CI.
- RTL review beyond direction switching.

### Accessibility

- Formal WCAG 2.2 AA audit.
- Screen reader QA.
- Keyboard walkthroughs for every flow.
- Real-browser dialog focus validation.
- Mobile zoom and reflow checks.
- Reduced-motion support.
- Color-contrast tooling.
- Long translated string testing.

### Operations

- Backend deployment pipeline.
- Environment-specific config templates.
- Structured logs and request IDs.
- Metrics and dashboards.
- Health versus readiness endpoints.
- Error monitoring.
- Backup, restore, and rollback procedures.
- Post-deploy smoke checks.

## 4. Automation Opportunities

### Already Useful

- Frontend install, typecheck, test, audit, and build in CI.
- Backend install and pytest in CI.
- Path-based monorepo filtering.
- Frontend GitHub Pages deploy.

### Automate Next

1. Pull request quality gates:
   - frontend lint/typecheck/test/build
   - backend tests
   - migration validation
   - dependency audit

2. Privacy regression tests:
   - public APIs never expose report text, contact details, exact coordinates, evidence notes, or reporter "Other" text
   - public aggregate suppression thresholds are enforced

3. Accessibility checks:
   - Playwright plus axe for reporter, follow-up, responder, admin, public dashboard, account, and content flows
   - keyboard/focus tests for modals and rich editor controls

4. Localization checks:
   - missing key detection against English
   - Arabic RTL smoke test
   - long-string layout checks for common screens

5. PWA checks:
   - manifest exists and is valid
   - service worker exists
   - service worker does not cache sensitive API responses

6. Security checks:
   - `npm audit --audit-level=high`
   - `pip-audit`
   - secret scanning
   - CSRF tests for cookie-authenticated state-changing routes

7. Deployment checks:
   - backend build/deploy workflow after target is chosen
   - readiness smoke check after deployment
   - frontend preview smoke check

8. Product automations:
   - responder email notifications by assigned country/city/village
   - request-a-callback workflow for reporters who opted into contact
   - admin review queue reminders
   - stale report/status reminders

## 5. Recommended Priorities

### Priority 1: Security And Trust

1. Add CSRF protection for cookie-authenticated endpoints.
2. Replace in-process rate limiting with shared/deployable throttling.
3. Add production-grade responder/admin account management.
4. Add role and permission boundaries for sensitive fields.
5. Add stronger local-data protection strategy for queued reports.

### Priority 2: Reliability And Tests

6. Add Playwright E2E tests for anonymous report lifecycle, offline retry, follow-up lookup, responder login/update, admin approval, and public suppression.
7. Add backend migration tests against clean and existing SQLite data.
8. Add frontend tests for Quick Exit, queue replay, responder dashboard, public content, and install prompt.
9. Add privacy regression tests for every public endpoint.

### Priority 3: Operational Readiness

10. Choose backend hosting and add deployment workflow.
11. Add environment-specific settings templates.
12. Add readiness endpoint, structured logs, metrics, and error monitoring.
13. Define backup/restore and rollback strategy.

### Priority 4: Product Completeness

14. Improve follow-up UX with copy, print, save, and clearer guidance.
15. Add reporter request-a-callback support with safe contact consent.
16. Add responder assignment, search, history UI, referrals, and email notifications.
17. Add public articles and meetings as first-class public surfaces.
18. Add time filters and clearer public suppression explanations.

### Priority 5: Inclusion And Localization

19. Complete translation coverage.
20. Human-review safety-sensitive translations.
21. Run formal WCAG 2.2 AA audit.
22. Add reduced-motion support and long-translation layout testing.

## 6. Suggested Execution Plan

### Sprint 1: Stabilize Trust Boundaries

- Implement CSRF protection.
- Add shared rate-limit design.
- Add privacy regression tests.
- Add Playwright smoke tests for report submit and follow-up lookup.

### Sprint 2: Improve Pilot Reliability

- Add backend readiness endpoint.
- Add structured logs and request IDs.
- Validate Alembic migrations against a seeded database.
- Add backend deployment plan and environment templates.

### Sprint 3: Strengthen Responder/Admin Workflows

- Add assignment ownership and status history UI.
- Complete admin approval queues for reports, articles, and meetings.
- Add production notification provider abstraction for email.
- Add request-a-callback workflow for opted-in reporters.

### Sprint 4: Complete Public And Content Experience

- Finish public Updates area for approved articles and meetings.
- Harden rich media upload safety.
- Keep low-data mode default and make larger media user-initiated.
- Add accessible table alternatives for public trends.

### Sprint 5: Accessibility And Localization Completion

- Add automated axe checks.
- Run keyboard and screen reader QA.
- Complete locale coverage and fallback tests.
- Validate Arabic RTL and long translated strings.

## 7. Decisions To Keep

- Keep anonymous reporting first-class.
- Keep account signup optional for reporters.
- Keep public reporting aggregate-only.
- Keep low-data mode on by default.
- Keep exact/current GPS opt-in and restricted.
- Keep backend location search proxied through Amani Circle, not direct browser calls.
- Keep raw report content out of public views.
- Keep admin approval required for all public-facing articles and meetings.
- Keep TipTap output as structured JSON and never render untrusted raw HTML.

## 8. Deferred Until Pilot Or Production

- External identity provider.
- MFA.
- Distributed rate limiting.
- Background sync.
- Encryption for local offline queues.
- Real malware scanning provider.
- Production email/SMS provider.
- Full taxonomy governance.
- Advanced analytics.
- Calendar/RSVP integrations.
- Rich collaborative editing, comments, page layout, and track changes.

## 9. Bottom Line

Amani Circle is currently a credible MVP. The next engineering goal is not more
features first; it is safer operation under real community conditions. The most
important next work is security hardening, E2E coverage, operational readiness,
privacy regression testing, and accessibility/localization completion.
