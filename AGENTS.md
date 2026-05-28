# AGENTS.md

## Commands

```
npm start          # Run dev server (node server.js)
npm install        # Install dependencies
```

No test, lint, typecheck, or CI setup. Verify by running `npm start` and visiting `http://localhost:3000`.

## Architecture

Single-page Express app with server-rendered EJS templates.

```
server.js          — Entry point. Routes: GET /, GET /view/*, GET /api/tree
lib/config.js      — Loads config.json. Falls back to process.cwd() for rootDir + port
lib/fileTree.js    — Builds directory tree from rootDir. Extensions: .md .txt .json .yaml .yml
lib/renderer.js    — marked + highlight.js. Markdown links/images are STRIPPED to disabled spans.
views/index.ejs    — Single EJS template. Sidebar file tree + content area.
public/            — Static assets: css/style.css, js/app.js (sidebar toggle only)
```

**Key facts:**
- `config.json` `rootDir` can be absolute or relative (resolved against `process.cwd()`)
- Breadcrumb link text uses `rootDirName` (must be passed from both render calls in server.js)
- Path traversal is enforced via `absolutePath.startsWith(config.rootDir)` in `/view/*` route
- Markdown renderer strips all links and images to `<span class="disabled-link">` for sandboxed viewing
- File tree auto-starts collapsed on `/`, expands root folder on `/view/*`
- Frontend JS (`app.js`) only handles sidebar open/close + auto-expand the folder containing the active file

## Style

- CSS: `github-markdown-css` for markdown body, `highlight.js` github theme for code, custom `style.css` for layout
- No build step or transpiler — vanilla JS, EJS, and CSS
- When adding features, follow the existing simplicity: no dependencies unless necessary, no build tools, keep it readable in a single file per concern
