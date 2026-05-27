# MD Viewer

A lightweight Node.js web application for browsing and viewing markdown and text files from the local filesystem. Renders markdown as styled HTML, displays other supported text files with syntax highlighting, and provides a collapsible sidebar file tree for navigation.

## Features

- **Sidebar file tree** with collapsible folders for navigating the directory structure
- **Markdown rendering** with GitHub-style formatting (links are disabled to prevent escaping the root directory)
- **Syntax highlighting** for `.json`, `.yaml`/`.yml`, and `.txt` files via highlight.js
- **Subdirectory navigation** to browse into any folder
- **Responsive layout** with a slide-in sidebar on narrow viewports
- **Path traversal protection** on all file routes

## Supported File Types

| Extension | Rendering |
|-----------|-----------|
| `.md` | Markdown to HTML (links stripped) |
| `.txt` | Plain text with syntax highlighting |
| `.json` | JSON with syntax highlighting |
| `.yaml` / `.yml` | YAML with syntax highlighting |

Other file types are hidden from the tree and cannot be viewed.

## Quick Start

```bash
npm install
node server.js
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Configuration

Create `config.json` in the project root (one is included by default):

```json
{
  "rootDir": ".",
  "port": 3000
}
```

- **rootDir**: Absolute path or path relative to the project root. Defaults to the current working directory if omitted.
- **port**: Port to listen on. Defaults to `3000`.

## Project Structure

```
md-viewer/
├── config.json          # Optional configuration
├── package.json
├── server.js            # Express server entry point
├── lib/
│   ├── config.js        # Config loader with defaults
│   ├── fileTree.js      # Directory scanning and tree building
│   └── renderer.js      # Markdown and syntax highlighting logic
├── views/
│   └── index.ejs        # Main HTML template
└── public/
    ├── css/
    │   └── style.css    # Layout, sidebar, and content styles
    └── js/
        └── app.js       # Sidebar toggle (mobile)
```

## Routes

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/` | Redirects to the first markdown file found, or shows a welcome page |
| `GET` | `/view/*` | Renders the requested file (path relative to root directory) |
| `GET` | `/api/tree` | Returns the file tree as JSON |

## Security

- **Path traversal protection**: All file paths are resolved and validated to stay within the configured root directory.
- **Link stripping**: Hyperlinks in rendered markdown are disabled to prevent navigation outside the root directory.
- **Read-only**: The application only reads files. No write, delete, or upload capabilities.
- **Local use**: Designed for local development, not public-facing deployment.

## Tech Stack

- **Server**: Express
- **Templating**: EJS (server-rendered HTML)
- **Markdown**: `marked` + `highlight.js`
- **Styling**: `github-markdown-css` + custom CSS
- **Client JS**: Vanilla JS (sidebar toggle only)