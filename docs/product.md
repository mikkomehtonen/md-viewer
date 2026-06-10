# MD Viewer

A single-page Express app that renders markdown, text, JSON, and YAML files from a configured directory for sandboxed, read-only viewing. Built with server-rendered EJS templates, no build step, and minimal dependencies.

## Features

- **Favicon** — SVG document icon at `/favicon.svg` for browser tab identification ([story](stories/001-add-favicon/story.md))

## Non-Goals

- Editing or writing files — this is a viewer only.
- Serving arbitrary file types beyond .md, .txt, .json, .yaml, .yml.
- Multi-user or authenticated access — single-user local dev tool.

## Known Limitations

- Markdown links and images are stripped to disabled spans for sandboxed viewing — no outbound navigation from rendered content.
- File tree cache has a 5-second TTL; rapid filesystem changes may not appear immediately.
