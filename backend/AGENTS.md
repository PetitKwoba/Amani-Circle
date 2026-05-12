# AGENTS.md

## Scope
This folder contains the FastAPI backend for Amani Circle.

## Backend priorities
- Clear REST API design
- Input validation
- Privacy-first data handling
- Role-based access control
- Clean, minimal architecture

## API rules
- Separate endpoints by role where useful: public, community, responder, admin.
- Never expose sensitive fields in public endpoints.
- Rough location should be the default stored/displayed location.
- Exact coordinates must be optional and restricted.
- Include timestamps on reports and actions.
- Keep public analytics aggregated.

## Data rules
- Minimize personally identifying information.
- Use enums where helpful for category, status, and urgency.
- Keep models simple for MVP.
- Prefer mock/light persistence before complex infrastructure.

## Backend quality
- Add a health endpoint early.
- Add basic tests for important routes.
- Keep dependencies minimal.