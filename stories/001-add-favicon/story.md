# Add favicon

## Context

The app has no favicon, so browsers show a default blank tab icon. Adding a favicon that represents a text file reinforces the app's identity as a file viewer and provides a recognisable tab icon.

## Out of Scope

- Favicon generation for legacy `.ico` format or multiple sizes — a single SVG favicon covers all modern browsers.
- Apple touch icon or other platform-specific icons.
- Modifying the CSP header — the existing `default-src 'self'` already allows loading `/favicon.svg` under the implied `img-src` fallback.

## Implementation approach

1. **Create `public/favicon.svg`** — a 16×16 viewBox SVG depicting a document with a folded corner and horizontal lines suggesting text content. Uses the app's steel-blue accent colour (`oklch(0.52 0.14 260)`) for visual consistency with the sidebar design tokens. The icon must be a standalone file loadable via URL (not embedded as a data URI or inline SVG in the HTML).

2. **Add `<link rel="icon">` to `views/index.ejs`** — a single line in the `<head>` pointing to `/favicon.svg` with `type="image/svg+xml"`. This is the only template, so one edit covers all routes.

3. **No server changes needed** — `express.static('public')` already serves files from `public/` at the root path, so `public/favicon.svg` is automatically available at `/favicon.svg`.

## Tasks

### Task 1 - Create and serve favicon SVG

- file `public/favicon.svg` exists
  - → `GET /favicon.svg` returns HTTP 200 with `Content-Type: image/svg+xml`
  - → response body contains a valid SVG root element with `viewBox`
  - → SVG depicts a document shape (rectangular outline with folded corner) and at least one horizontal line suggesting text content

### Task 2 - Reference favicon in HTML head

- any page rendered by the app
  - → `<head>` contains `<link rel="icon" type="image/svg+xml" href="/favicon.svg">`
  - → the link tag appears before the first stylesheet `<link>` (standard practice: meta & icon before resources)

## Technical Context

No new dependencies. The SVG file is a static asset served by the existing `express.static` middleware (`server.js` line 27). The CSP policy (`default-src 'self'`) allows the browser to fetch `/favicon.svg` under the `img-src` fallback directive.

## Notes

- SVG favicons are supported in all modern browsers (Chrome, Firefox, Safari 12+, Edge). No `.ico` fallback is required for the target audience of a local dev tool.
- The favicon colour should match the app's accent token (`--accent: oklch(0.52 0.14 260)` defined in `public/css/style.css` line 24). Since CSS custom properties are not available in standalone SVG files loaded as favicons, the implementer must convert the oklch value to a hex colour for use in the SVG attributes.
- The existing sidebar file icon (lines 42-45 of `index.ejs`) uses a simple document outline. The favicon mirrors this shape but adds horizontal lines inside to suggest "text file" rather than a generic document.
