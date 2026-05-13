# AGENTS.md

## Scope
This folder contains the React + Vite + TypeScript frontend for Amani Circle.

## Frontend priorities
- Mobile-first responsive design
- Offline-first behavior
- Simple, short forms
- Multilingual UI
- Accessible components
- Low-bandwidth experience
- Clear separation of community, responder, and public views

## Frontend rules
- Use Tailwind CSS.
- Keep components small and reusable.
- Use plain-language labels and errors.
- Prefer icon + text for important actions.
- Use step-by-step flows instead of long forms.
- Keep public screens privacy-safe.
- Do not expose exact coordinates in public UI.
- Responder-only sensitive data must be role-gated.

## Target screens
- Community report flow
- Responder dashboard
- Public aggregated trends page

## Avoid
- Heavy animations
- Large image assets
- Complex state management unless necessary
- Over-designed dashboards