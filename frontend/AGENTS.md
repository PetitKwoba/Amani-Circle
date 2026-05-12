# AGENTS.md

## Scope
This folder contains the React + Vite frontend for Amani Circle.

## Frontend priorities
- Mobile-first, accessible UI.
- Plain language for low-literacy contexts.
- Clear separation between community, responder, and public views.
- Quick-exit safety action available from primary app screens.
- Offline draft support before more complex sync.
- Multilingual strings through react-i18next.

## Accessibility and disability inclusion
- Treat WCAG 2.2 AA as the baseline for frontend work.
- Preserve keyboard-only access for every flow.
- Use semantic HTML before custom interaction patterns.
- Provide visible focus states for links, buttons, inputs, and custom controls.
- Connect form labels, helper text, and errors with accessible attributes.
- Do not rely on color alone; use text, shape, state, or semantics as well.
- Keep copy simple, predictable, and translation-ready.
- Support screen readers, text resizing, low-precision input, and cognitive accessibility.

## Privacy rules
- Do not show sensitive report details in public dashboard components.
- Do not request exact GPS in the initial community reporting flow.
- Prefer rough location text or region fields.
- Avoid storing personally identifying data in browser state.
