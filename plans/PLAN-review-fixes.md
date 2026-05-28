# Fix Plan

## Critical

### 1. XSS via raw HTML in markdown
- **Files**: `lib/renderer.js`, `views/index.ejs`
- **Issue**: `marked` does not sanitize HTML by default. Raw `<script>`, `<iframe>`, event handlers, etc. in markdown files pass through and execute in the browser. The custom renderer only strips `link` and `image` tokens.
- **Fix**: Sanitize `marked.parse()` output before returning it. Add `isomorphic-dompurify` as a dependency and wrap the parsed HTML with `DOMPurify.sanitize()`. Alternatively, override the `html` renderer in marked to escape raw HTML tags, but DOMPurify is safer and handles edge cases.
- **Validation**: Create a test markdown file with `<script>alert('xss')</script>` and verify it renders as harmless text, not an alert.

### 2. Focus lost when sidebar closes
- **Files**: `public/js/app.js`
- **Issue**: `closeSidebar()` removes the `open` class but does not return focus to the element that triggered the open. Keyboard users are stranded.
- **Fix**: Cache the element that triggered `openSidebar` (the toggle button clicked or the key that opened it). In `closeSidebar()`, call `.focus()` on that cached element.
- **Validation**: Tab to the sidebar toggle, press Enter to open, press Escape to close — focus should return to the toggle button.

### 3. Mobile sidebar is a modal without modal behavior
- **Files**: `views/index.ejs`, `public/js/app.js`
- **Issue**: On narrow viewports the sidebar acts as a blocking overlay, but there is no focus trap, no `aria-hidden`/`inert` on `<main>`, and no `aria-modal` or `role="dialog"`. Keyboard users can tab behind the drawer.
- **Fix**:
  - Add `aria-expanded="true/false"` to toggle buttons and update it in `openSidebar`/`closeSidebar`.
  - When opening on mobile, set `inert` on `<main>` (or `aria-hidden="true"` and `tabindex="-1"` for broader support) to remove it from the accessibility tree.
  - Trap focus within the sidebar while open (cycle from last focusable element back to first).
  - Add `role="dialog"` and `aria-modal="true"` to the `<aside>` when on mobile, or use a `data-mobile-open` attribute to conditionally apply these.
- **Validation**: Open sidebar on a narrow viewport, press Tab repeatedly — focus should stay inside the sidebar.

## High

### 4. `findFirstFile` fallback bug
- **Files**: `lib/fileTree.js`
- **Issue**: In the fallback loop (line 78), `findFirstFile(child)` is called without an `ext` argument, so it defaults to `.md`. Non-`.md` files in subdirectories are never found as fallbacks.
- **Fix**: Refactor `findFirstFile` to a single pass that prefers `.md` but falls back to any supported file. Remove the two-pass structure.
  ```js
  function findFirstFile(tree) {
    for (const child of tree.children) {
      if (child.type === 'file' && child.ext === '.md') return child.path;
      if (child.type === 'directory') {
        const found = findFirstFile(child);
        if (found) return found;
      }
    }
    for (const child of tree.children) {
      if (child.type === 'file') return child.path;
      if (child.type === 'directory') {
        const found = findFirstFile(child);
        if (found) return found;
      }
    }
    return null;
  }
  ```
- **Validation**: Create a nested directory with only `.txt` files and verify `/` redirects to the first one.

### 5. `statSync` in sort comparator
- **Files**: `lib/fileTree.js`
- **Issue**: `fs.statSync` is called inside the `Array.sort` comparator. For 1,000 entries this can trigger ~20,000 stat calls.
- **Fix**: Pre-compute stats before sorting. Build an array of `{ name, isDir }` objects first, then sort that array.
  ```js
  const items = fs.readdirSync(dirPath).map(name => {
    const isDir = fs.statSync(path.join(dirPath, name)).isDirectory();
    return { name, isDir };
  }).sort((a, b) => {
    if (a.isDir && !b.isDir) return -1;
    if (!a.isDir && b.isDir) return 1;
    return a.name.localeCompare(b.name);
  });
  ```
- **Validation**: Profile `getFileTree()` on a directory with 500+ entries — stat calls should equal the number of entries, not `O(n log n)`.

### 6. Active file contrast fails WCAG AA
- **Files**: `public/css/style.css`
- **Issue**: `.tree-file.active` uses `--accent` (`oklch(0.52)`) on `--accent-subtle` (`oklch(0.95)`) at `0.8125rem`. Likely below 4.5:1.
- **Fix**: Darken the active text color or strengthen the background. Options:
  - Change `.tree-file.active` to use `--text-primary` with a stronger background (e.g., `oklch(0.90 0.03 260)`).
  - Or darken `--accent` to `oklch(0.42 0.14 260)` for the active state only.
- **Validation**: Use a contrast checker (e.g., WebAIM) on the computed colors.

### 7. Breadcrumb tertiary text contrast fails AA
- **Files**: `public/css/style.css`
- **Issue**: Intermediate breadcrumb parts use `--text-tertiary` (`oklch(0.62)`) on near-white, which is ~3:1.
- **Fix**: Change `.breadcrumb ol` color from `--text-tertiary` to `--text-secondary`. Keep `aria-current="page"` in `--text-primary`.
- **Validation**: Verify contrast ratio is ≥ 4.5:1.

## Medium

### 8. Tree rebuilt on every request
- **Files**: `server.js`
- **Issue**: `getFileTree(config.rootDir)` is called on every route (`/`, `/view/*`, `/api/tree`). For large directories this is expensive.
- **Fix**: Add a simple in-memory cache with a TTL (e.g., 5 seconds) or use `fs.watch` on the root directory to invalidate.
  ```js
  let cachedTree = null;
  let cacheTime = 0;
  const CACHE_TTL = 5000;

  function getCachedTree() {
    const now = Date.now();
    if (!cachedTree || now - cacheTime > CACHE_TTL) {
      cachedTree = getFileTree(config.rootDir);
      cacheTime = now;
    }
    return cachedTree;
  }
  ```
- **Validation**: Add logging or use a debugger to confirm `getFileTree` is only called once every 5 seconds across multiple requests.

### 9. No dotfile/dotdir filtering
- **Files**: `lib/fileTree.js`
- **Issue**: `.git/`, `node_modules/`, `.DS_Store`, and other hidden files are scanned and included. `.git/` in particular can be massive.
- **Fix**: Skip entries starting with `.` during tree building. Add an explicit exclusion list if needed (e.g., `node_modules`).
  ```js
  if (item.startsWith('.')) continue;
  ```
- **Validation**: Verify `.git` and `.DS_Store` do not appear in the file tree.

### 10. Body scroll not locked on mobile
- **Files**: `public/js/app.js`, `public/css/style.css`
- **Issue**: When the mobile sidebar opens, users can still scroll the page behind it.
- **Fix**: In `openSidebar()`, add `document.body.style.overflow = 'hidden'`. In `closeSidebar()`, restore it to `''`.
- **Validation**: Open sidebar on a narrow viewport, attempt to scroll — page should be locked.

### 11. Breadcrumb overflow unhandled
- **Files**: `public/css/style.css`
- **Issue**: `white-space: nowrap` on breadcrumb items without `overflow: hidden` or `text-overflow: ellipsis` can break the sticky header.
- **Fix**: Add to `.breadcrumb ol`:
  ```css
  overflow: hidden;
  text-overflow: ellipsis;
  ```
  And ensure `.breadcrumb li` can shrink with `min-width: 0` or `flex-shrink: 1` if needed.
- **Validation**: Navigate to a deeply nested file on a narrow viewport — breadcrumb should truncate with ellipsis, not push layout.

### 12. Welcome toggle positioning bug
- **Files**: `public/css/style.css`
- **Issue**: `.sidebar-toggle--welcome` is `position: absolute` but neither `.welcome` nor `.content` has `position: relative`, so it positions relative to the viewport.
- **Fix**: Add `position: relative` to `.welcome`.
- **Validation**: Resize the browser window and verify the toggle stays anchored to the welcome area.

### 13. Duplicate `id="sidebar-toggle"`
- **Files**: `views/index.ejs`
- **Issue**: Both the content header and welcome state use `id="sidebar-toggle"`. Invalid HTML, risks selector bugs.
- **Fix**: Change both to `class="sidebar-toggle"` and select by class in `app.js` (already does this). Remove the `id` attribute from both buttons.
- **Validation**: Run the page through an HTML validator — no duplicate ID errors.

## Low

### 14. Path traversal `startsWith` is fragile
- **Files**: `server.js`
- **Issue**: `absolutePath.startsWith(config.rootDir)` without a trailing separator has a theoretical prefix-matching problem (e.g., `/home/user/data-fake` passing if root is `/home/user/data`).
- **Fix**: Append `path.sep` to the root directory in the check:
  ```js
  const rootWithSep = config.rootDir.endsWith(path.sep) ? config.rootDir : config.rootDir + path.sep;
  if (!absolutePath.startsWith(rootWithSep) && absolutePath !== config.rootDir) {
  ```
- **Validation**: Attempt to access a file in a sibling directory with a prefix-matching name — should return 403.

### 15. No security headers
- **Files**: `server.js`
- **Issue**: No `Content-Security-Policy`, `X-Content-Type-Options`, or `X-Frame-Options` headers are set.
- **Fix**: Add a basic security headers middleware:
  ```js
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
    next();
  });
  ```
- **Validation**: Inspect response headers in browser DevTools — security headers should be present.

### 16. No Express error-handling middleware
- **Files**: `server.js`
- **Issue**: Unexpected exceptions show the default Express HTML error page.
- **Fix**: Add an error-handling middleware at the end of the middleware stack:
  ```js
  app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).send('Internal server error');
  });
  ```
- **Validation**: Introduce a deliberate error in a route handler and verify the custom error response is returned.

### 17. No reduced-motion support
- **Files**: `public/css/style.css`
- **Issue**: Transitions are unconditional.
- **Fix**: Wrap transitions in `@media (prefers-reduced-motion: no-preference)`:
  ```css
  @media (prefers-reduced-motion: no-preference) {
    .sidebar { transition: transform var(--duration-normal) var(--ease-out); }
    /* etc */
  }
  ```
- **Validation**: Enable "Reduce motion" in OS settings and verify sidebar opens/closes instantly.

### 18. Touch targets undersized
- **Files**: `public/css/style.css`
- **Issue**: Tree items are ~25–28px tall, below the 44×44px recommendation.
- **Fix**: Increase vertical padding on `.tree-folder-label` and `.tree-file` inside the mobile breakpoint (`@media (max-width: 768px)`), or add `min-height: 44px` and `align-items: center`.
- **Validation**: Use browser DevTools device mode to measure tap target size.

### 19. Sidebar title is `<h1>`
- **Files**: `views/index.ejs`
- **Issue**: The sidebar contains `<h1 class="sidebar-title">MD Viewer</h1>`, which conflicts with the `<h1>` in rendered markdown content. Screen-reader heading navigation becomes confusing.
- **Fix**: Demote to `<p class="sidebar-title">` or `<div class="sidebar-title">`.
- **Validation**: Run a screen reader (or inspect the accessibility tree) and verify only one `<h1>` exists on the page when viewing a file.

### 20. Missing `aria-expanded` on toggles
- **Files**: `views/index.ejs`, `public/js/app.js`
- **Issue**: Toggle buttons do not communicate their open/closed state to assistive tech.
- **Fix**: Add `aria-expanded="false"` to both toggle buttons in the template. Update it to `"true"` in `openSidebar()` and `"false"` in `closeSidebar()`.
- **Validation**: Inspect the toggle button in browser DevTools accessibility pane — `aria-expanded` should toggle.

### 21. Active file lacks `aria-current="page"`
- **Files**: `views/index.ejs`
- **Issue**: The currently viewed file gets `.active` but no `aria-current` attribute.
- **Fix**: Add `aria-current="page"` to the active file link:
  ```ejs
  <a href="/view/<%= node.path %>"
     class="tree-file<%= filePath === node.path ? ' active' : '' %>"
     <%= filePath === node.path ? 'aria-current="page"' : '' %>
     ...>
  ```
- **Validation**: Inspect the active file link in browser DevTools — `aria-current="page"` should be present.

### 22. Scrollbar styling is WebKit-only
- **Files**: `public/css/style.css`
- **Issue**: `::-webkit-scrollbar` rules leave Firefox with default, chunky scrollbars.
- **Fix**: Add Firefox scrollbar properties:
  ```css
  .sidebar, .file-tree {
    scrollbar-width: thin;
    scrollbar-color: var(--border) transparent;
  }
  ```
- **Validation**: Open the app in Firefox and verify thin, styled scrollbars in the sidebar.

### 23. `require` inside route handler
- **Files**: `server.js`
- **Issue**: `const { SUPPORTED_EXTENSIONS } = require('./lib/fileTree');` is inside the `/view/*` route handler.
- **Fix**: Move the require to the top of the file with the other imports.
- **Validation**: Verify the app still starts and routes work correctly.

### 24. Config parse failure is silent
- **Files**: `lib/config.js`
- **Issue**: Malformed `config.json` silently falls back to defaults with only a `console.warn`.
- **Fix**: Exit the process with a clear error message so the user knows their config is broken:
  ```js
  console.error(`Failed to parse config.json: ${e.message}`);
  process.exit(1);
  ```
  Or, if graceful fallback is intentional, log at `error` level instead of `warn`.
- **Validation**: Introduce a syntax error in `config.json` and verify the app exits with a clear message.

### 25. No tests
- **Files**: (new)
- **Issue**: No test framework or test files.
- **Fix**: Add a minimal test setup using Node.js built-in `node:test` and `node:assert`. Write smoke tests for:
  - Path traversal rejects `..` sequences.
  - `findFirstFile` finds `.md` first, then any supported file.
  - `renderFile` strips links and sanitizes HTML.
  - `getFileTree` excludes dotfiles.
- **Validation**: Run `npm test` and verify all tests pass.

---

## Implementation Order

1. **Critical**: XSS sanitization, focus management, mobile modal behavior.
2. **High**: `findFirstFile` bug, `statSync` performance, contrast fixes.
3. **Medium**: Caching, dotfile filtering, scroll lock, breadcrumb overflow, welcome toggle, duplicate ID.
4. **Low**: Security headers, error middleware, reduced motion, touch targets, heading fix, `aria-*` attributes, scrollbar styles, require cleanup, config error handling, tests.

Each fix is independent unless noted otherwise. Critical and High items can be done in parallel by different contributors. Medium and Low items can be batched into a single follow-up PR.
