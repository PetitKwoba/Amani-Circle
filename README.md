# Amani Circle

Amani Circle is an offline-first, multilingual PeaceTech web app for anonymous community reporting, responder workflows, and privacy-safe public transparency through aggregated trends.

## Monorepo Structure

- `frontend/` - React + Vite + TypeScript + Tailwind
- `backend/` - FastAPI with SQLite MVP persistence
- `.github/workflows/` - GitHub Actions CI and frontend GitHub Pages deployment
- `AGENTS.md` - repository-wide implementation rules

## Product Principles

- Anonymous reporting by default.
- Rough location first; current/exact location is optional and consent-based.
- Public transparency uses aggregate data only.
- Accessibility and disability inclusion follow WCAG 2.2 AA as the baseline.
- Mobile-first, low-bandwidth, plain-language flows.
- English fallback with French, Arabic, Portuguese, and Kiswahili configured.

## Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Build check:

```bash
cd frontend
npm run lint
npm run build
npm test
```

The frontend currently includes:

- mobile-first Community, Follow up, Responder, and Public views
- global quick-exit action
- accessible multi-step community report flow
- optional contact details after a safety warning
- optional current location after explicit consent
- IndexedDB draft storage for the active report
- IndexedDB queued submissions with pending, syncing, failed, and sent states
- minimal local receipts after queued sync, including case ID and follow-up code
- case status lookup with case ID and follow-up code
- responder report list, filters, and status update
- development responder passcode gate for protected responder routes
- public aggregate dashboard using backend stats and weekly counts
- optional Accessibility Comfort Mode with persisted local preference
- installable PWA shell with manifest, service worker, and offline fallback page
- searchable language picker with enabled and planned language registry entries

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

Test check:

```bash
cd backend
python -m pytest -q
```

The backend currently includes:

- `GET /health`
- `POST /community/reports`
- `POST /community/reports/{case_id}/status`
- `GET /responder/reports`
- `PATCH /responder/reports/{id}/status`
- `GET /public/stats`
- SQLite persistence in `backend/amani_circle.sqlite3`
- hashed follow-up codes
- client-held high-entropy follow-up secrets hashed server-side
- responder-only sensitive fields
- aggregate-only public stats with privacy suppression for all low-volume bucket breakdowns
- role-oriented route modules for system, community, responder, and public APIs
- schema validation that rejects inconsistent contact and exact-location combinations
- cookie-backed responder login/logout/session endpoints
- follow-up rate limiting, structured API errors, responder filters/pagination, and status-history persistence
- Alembic migration scaffolding for schema evolution

Responder routes now require a login session backed by an HttpOnly cookie. Local defaults are intentionally development-only:

```bash
AMANI_RESPONDER_USERNAME=responder
AMANI_RESPONDER_PASSWORD=amani-responder-dev
AMANI_SESSION_SECRET=replace-this-before-deploying
```

Use `backend/.env.example` as the source list for supported backend settings. Replace responder credentials and session secrets before any shared deployment.

Backend validation rules:

- Contact details are rejected unless the reporter explicitly opts into contact.
- Contact opt-in requires both a contact method and contact details.
- Current/exact coordinates are rejected unless exact-location consent is enabled.

## Privacy Assumptions

- Reports are anonymous unless the reporter opts into contact.
- Contact details are stored only when explicitly requested.
- Rough location is required; current/exact coordinates are optional.
- Exact coordinates are available only in the responder API for this MVP.
- Public stats do not include raw report text, contact details, coordinates, or individual records.
- Public rough-region stats suppress buckets with fewer than 3 reports.
- Public category, urgency, status, and rough-region buckets all suppress counts below 3.
- Queued offline report payloads are stored locally until sent; users should be careful on shared devices.
- After queued sync succeeds, the full queued payload is removed and only a minimal local receipt remains.
- Quick Exit clears local report drafts, pending queue items, local receipts, and attempts responder logout before redirecting.
- Cookie session auth is materially safer than the previous shared responder header, but a production identity provider is still deferred.

## Accessibility

Accessibility and disability inclusion are first-class product requirements.

- WCAG 2.2 AA is the baseline.
- Reporter, responder, public, language, and follow-up flows should work with keyboard-only navigation.
- Forms use labels, helper text, accessible validation, and visible focus states.
- UI avoids color-only meaning and supports text resizing and responsive layouts.
- Comfort Mode can increase readability while baseline accessibility remains enabled.
- Report sync, form errors, loading, and success states use accessible status or alert messaging.
- Copy should stay simple and translation-ready for cognitive and low-literacy accessibility.
- Automated accessibility testing is still deferred.

## Translation System

Frontend translations live in `frontend/src/i18n/locales/`.

- English is the default and fallback language.
- English, French, Arabic, Portuguese, and Kiswahili are enabled in the MVP.
- The searchable language picker also lists planned languages as unavailable until reviewed.
- Planned African/local languages include Hausa, Amharic, Yoruba, Igbo, Somali, Zulu, Xhosa, Kinyarwanda, Kirundi, Lingala, Wolof, Bambara, Oromo, Tigrinya, and Malagasy.
- Planned global languages include Spanish, Hindi, Bengali, Urdu, Indonesian, Turkish, Russian, Chinese Simplified, and Filipino/Tagalog.
- Add future local languages by creating a locale file and registering it in `frontend/src/i18n/languages.ts` and `frontend/src/i18n/index.ts`.
- Arabic sets the document direction to right-to-left.

## CI/CD

GitHub Actions runs monorepo-aware CI:

- Frontend CI runs `npm ci`, `npm run lint`, `npm run build`, and `npm test`.
- Backend CI installs `requirements.txt` and `requirements-dev.txt`, then runs `pytest -q`.
- CI uses path filtering so frontend-only and backend-only changes avoid unrelated jobs.
- Frontend CD deploys to GitHub Pages on `main` when frontend or deployment files change.
- Backend CD is deferred until the deployment target is chosen.

CI assumptions:

- Node.js 20 is the frontend CI runtime.
- Python 3.11 is the backend CI runtime.
- `frontend/package-lock.json` is the source of truth for deterministic frontend installs.
- `npm run lint` currently performs a TypeScript project check; a dedicated ESLint pass can be added later if the frontend rule set grows.

Backend migration notes:

```bash
cd backend
python -m alembic upgrade head
```

The app still initializes lightweight SQLite tables defensively at runtime for MVP resilience, while Alembic provides the forward path for explicit schema management.

## Known MVP Limits

- Responder sessions are still local-credential MVP auth. Add account management, stronger identity, and deployment-grade secret handling before production.
- SQLite is acceptable for MVP but should be migrated or managed carefully for deployment.
- Offline retry runs only while the app is open; service-worker background sync is deferred.
- IndexedDB data is not encrypted in this MVP.
- Accessibility has been improved, but formal WCAG conformance still needs assistive-technology testing.
- Public aggregate suppression begins at a bucket size of 3 across all bucketed breakdowns; evaluate stronger thresholds before launch in small communities.
- Vitest coverage now exists for a few critical frontend states, but broader report sync and responder interaction tests still need expansion.
- Maps/geocoding are deferred. Manual rough location must remain the fallback even after maps are added.
- Notifications, assignments, audit logs, moderation, and file uploads are deferred.
