# Fit original forms to screen width

## User correction

The user rejected the separate card editor. The current implementation restores the original form layout and original input controls on every screen. It scales the whole A4 sheet proportionally to fit the layout viewport on initial display; users can pinch zoom when editing small fields. No field cards or duplicate editing controls remain.

`responsive-editor.js` now only calculates a screen scale from the root content width and original paper width. CSS zoom adjusts both rendering and layout dimensions, so the original sheet is neither clipped nor hidden behind a horizontal scrolling container. ResizeObserver handles orientation/layout-width changes. It does not fit against visualViewport, which would fight user pinch zoom. The viewport meta retains normal user zoom and has no maximum-scale or user-scalable restriction.

Print rules reset zoom to 1. Existing field identifiers, calculation logic, validation, source layout and A4 print dimensions are reused unchanged. No new dependency, network transmission, storage, authentication, security or permission changes are introduced.

## Reuse and references

The prior GitHub review examined MIT-licensed kasapdev/invoice-generator-pro and BaseMax/invoice-form-builder. Their separate editor pattern was not retained after the user's clarification. The solution reuses this repository's original paper forms from commit 99be240d71d7706a21f365e4b866d2cdab4d44de, rather than copying external code.

## Verification boundaries

Automated Chromium viewport testing covers the five forms at narrow/expanded widths, source field focus/input, document/root overflow and A4 output. This is not physical Galaxy S24, A34 or Fold6 testing and does not establish native Samsung keyboard or Samsung Internet behavior. Proportional fitting intentionally makes the text smaller on narrow screens; manual pinch zoom remains available. Deliberate user zoom may pan the magnified document, as expected.

The build environment's public-site HTTP route previously returned 403 and is not retried or bypassed. Public deployment rendering is verified separately with the user's ordinary authorized Chrome browser.
