# AGENTS.md

## Project
Amani Circle is an offline-first, multilingual PeaceTech web application.
It helps community members anonymously report conflict risks, resource disputes,
exclusion, corruption, or abuse, and routes those signals to trusted responders.

## Stack
- Frontend: React + Vite + TypeScript + Tailwind CSS
- Backend: FastAPI
- Offline support: PWA + IndexedDB
- Multilingual: react-i18next
- Optional maps: Leaflet for rough location only

## Product goals
- Anonymous reporting
- Low-bandwidth usability
- Rough location by default
- Multilingual support
- Responder/admin dashboard
- Public dashboard with aggregated data only
- Safety-first UX for at-risk users

## Privacy and safety rules
- Do not expose sensitive personal data in public views.
- Public views must show only aggregated, anonymized trends.
- Default to rough location, not exact GPS.
- Exact coordinates should only be available to restricted responder roles when necessary.
- Minimize personally identifying data across the system.

## Engineering rules
- Keep the MVP hackathon-friendly.
- Prefer simple, readable code over complex abstractions.
- Build in small working increments.
- Keep frontend and backend independently runnable.
- Use mock data before adding complex integrations.
- Add basic validation and error handling for every important flow.
- Update README when setup changes.

## UX rules
- Mobile-first.
- Large buttons and short forms.
- Plain language.
- Low-literacy-friendly UI.
- Include quick-exit safety action.
- Keep public, responder, and community views clearly separated.

## Accessibility
- Treat accessibility as a core product requirement.
- Target WCAG 2.2 AA baseline.
- Support keyboard-only navigation and visible focus states.
- Use semantic HTML, accessible labels, and screen-reader-friendly structure.
- Ensure forms have clear labels, instructions, validation, and error feedback.
- Maintain accessible contrast and do not rely on color alone.
- Support text resizing, responsive layouts, and low-precision interactions.
- Design for visual, motor, hearing, cognitive, and low-literacy needs.
- Prefer simple language, predictable flows, and consistent navigation.

## CI/CD
- Use GitHub Actions for CI/CD.
- Add monorepo-aware CI with separate frontend and backend jobs.
- Prefer path-based change detection so only relevant jobs run.
- Frontend CI should install dependencies, lint, and build.
- Backend CI should install dependencies and run tests.
- Keep workflows simple and understandable.
- CD can be added later after CI is stable.

## Workflow
1. Explain the plan briefly before major edits.
2. Make the smallest useful change first.
3. Keep the app runnable after each step.
4. Prefer clear file organization.
5. Do not add production complexity unless requested.