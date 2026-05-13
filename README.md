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
- search-first rough location entry through the backend location proxy, with manual fallback
- IndexedDB draft storage for the active report
- IndexedDB queued submissions with pending, syncing, failed, and sent states
- minimal local receipts after queued sync, including case ID and follow-up code
- case status lookup with case ID and follow-up code
- short readable case IDs with copy actions for case ID and follow-up code
- required reporter explanation when choosing the Other category
- responder report list, filters, status update, and assignment notifications
- responder category review and reclassification for triage/public aggregate quality
- responder-created article and meeting drafts with admin approval before public visibility
- responder media uploads for public content drafts with strict type checks and scan status
- admin-managed responder geography assignments for country, city, and village coverage
- public aggregate dashboard using backend stats, weekly counts, and approved community updates
- default low-data public updates where larger media loads only when selected
- optional Accessibility Comfort Mode with persisted local preference
- installable PWA shell with manifest, service worker, and offline fallback page
- searchable language picker with enabled and planned language registry entries
- optional Account screen with reporter signup/login and role-aware responder/admin access

## Backend Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt -r requirements-dev.txt
uvicorn app.main:app --reload
```

Windows troubleshooting (when `python` or `py` is not recognized):

```powershell
cd backend
& 'C:\Users\<your-user>\AppData\Local\Python\bin\python.exe' -m venv .venv
.venv\Scripts\Activate.ps1
& 'C:\Users\<your-user>\AppData\Local\Python\bin\python.exe' -m pip install -r requirements.txt -r requirements-dev.txt
& 'C:\Users\<your-user>\AppData\Local\Python\bin\python.exe' -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

Use `Invoke-RestMethod -Uri http://127.0.0.1:8000/health` to verify backend health in PowerShell.

Test check:

```bash
cd backend
python -m pytest -q
```

The backend currently includes:

- `GET /health`
- `POST /community/reports`
- `POST /community/reports/{case_id}/status`
- `POST /auth/signup`
- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/session`
- `GET /location/search?q=...`
- `GET /responder/reports`
- `PATCH /responder/reports/{id}/status`
- `PATCH /responder/reports/{id}/category`
- `GET /responder/notifications`
- `POST /responder/notifications/{id}/read`
- `GET /responder/content`
- `POST /responder/content`
- `PATCH /responder/content/{id}`
- `POST /responder/content/{id}/submit`
- `POST /responder/content/{id}/assets`
- `GET /responder/content/{id}/assets`
- `DELETE /responder/content/{id}/assets/{asset_id}`
- `GET /admin/users`
- `GET /admin/responders/{id}/assignments`
- `POST /admin/responders/{id}/assignments`
- `DELETE /admin/responders/{id}/assignments/{assignment_id}`
- `GET /admin/content/review`
- `POST /admin/content/{id}/approve`
- `POST /admin/content/{id}/reject`
- `POST /admin/content/{id}/archive`
- `GET /public/stats`
- `GET /public/content`
- `GET /public/content/{id}`
- `GET /public/content/{id}/assets/{asset_id}/download`
- SQLite persistence in `backend/amani_circle.sqlite3`
- hashed follow-up codes
- client-held high-entropy follow-up secrets hashed server-side
- responder-only sensitive fields
- aggregate-only public stats with privacy suppression for all low-volume bucket breakdowns
- public aggregate stats include only reports recommended by a responder and approved by an admin
- approved public articles and meeting announcements are separate from reports and never expose raw report content
- public content media is only exposed after content approval and a clean asset scan status
- role-oriented route modules for system, community, responder, and public APIs
- schema validation that rejects inconsistent contact and exact-location combinations
- cookie-backed admin/responder login/logout/session endpoints with database-backed sessions
- optional reporter signup with email or phone, hashed passwords, and reporter role by default
- hierarchical responder assignment matching and persisted dashboard notifications
- development email notification provider that records minimal assignment notices without sensitive report details
- Nominatim/OpenStreetMap-backed location search proxy with normalized country/city/village results
- follow-up rate limiting, structured API errors, responder filters/pagination, and status-history persistence
- Alembic migration scaffolding for schema evolution

Responder routes now require a login session backed by an HttpOnly cookie. Local bootstrap identities are intentionally development-only:

```bash
AMANI_BOOTSTRAP_ADMIN_USERNAME=admin
AMANI_BOOTSTRAP_ADMIN_PASSWORD=amani-admin-dev-password
AMANI_DEFAULT_RESPONDER_USERNAME=responder
AMANI_DEFAULT_RESPONDER_PASSWORD=amani-responder-dev
AMANI_SESSION_SECRET=replace-this-before-deploying
AMANI_MEDIA_UPLOAD_DIR=./media_uploads
AMANI_MEDIA_MAX_UPLOAD_BYTES=10485760
AMANI_MEDIA_DEV_MARK_CLEAN=true
```

Use `backend/.env.example` as the source list for supported backend settings. Replace responder credentials and session secrets before any shared deployment.

Backend validation rules:

- New case IDs use the readable `AC-XXXX-XXXX` format; old IDs remain valid.
- Follow-up lookup accepts case IDs with lowercase text, spaces, or missing hyphens.
- Reports using the Other category require a short reporter explanation.
- New reporter accounts require email or phone contact, username, and a password of at least 10 characters.
- Contact details are rejected unless the reporter explicitly opts into contact.
- Contact opt-in requires both a contact method and contact details.
- Current/exact coordinates are rejected unless exact-location consent is enabled.

## Privacy Assumptions

- Reports are anonymous unless the reporter opts into contact.
- Accounts are optional. Creating an account does not automatically link a report to that account.
- Contact details are stored only when explicitly requested.
- Rough location plus country, city, and village/local area are required for new reports so responder routing can work.
- Location search sends only the search query to the backend proxy; report text, contact details, and reporter identity are not sent to the geocoding provider.
- Exact coordinates are available only in the responder API for this MVP.
- Public stats do not include raw report text, contact details, coordinates, or individual records.
- Reporter-entered Other category text is shown only to protected responder/admin views and is not exposed publicly.
- Public stats exclude reports until a responder recommends public aggregation and an admin approves it.
- Public articles and meeting notices are visible only after admin approval.
- Public update media is low-data by default. Videos do not autoplay, PDFs are links, and larger media requires user action unless the user opts in.
- Media uploads are stored outside the frontend public directory and are never exposed publicly until approved content has clean assets.
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

- Admin/responder bootstrap identities are still MVP scaffolding. Replace them with production account provisioning, stronger identity, and deployment-grade secret handling before production.
- SQLite is acceptable for MVP but should be migrated or managed carefully for deployment.
- Offline retry runs only while the app is open; service-worker background sync is deferred.
- IndexedDB data is not encrypted in this MVP.
- Accessibility has been improved, but formal WCAG conformance still needs assistive-technology testing.
- Public aggregate suppression begins at a bucket size of 3 across all bucketed breakdowns; evaluate stronger thresholds before launch in small communities.
- Vitest coverage now exists for a few critical frontend states, but broader report sync and responder interaction tests still need expansion.
- Maps/geocoding are deferred. Manual rough location must remain the fallback even after maps are added.
- Location search uses a simple in-memory backend cache and should be replaced with shared caching/throttling before high-volume deployment.
- Real email provider integration, delivery retries, richer assignment governance, moderation, and file uploads are deferred.
