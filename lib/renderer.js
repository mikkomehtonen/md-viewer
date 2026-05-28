const { marked } = require('marked');
const hljs = require('highlight.js');
const createDOMPurify = require('isomorphic-dompurify');

// Configure marked with highlight.js for code blocks
marked.setOptions({
  highlight(code, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(code, { language: lang }).value;
      } catch (_) {
        // fall through
      }
    }
    return hljs.highlightAuto(code).value;
  },
});

// Custom renderer that strips links from markdown output
const linkStripper = {
  link({ href, text }) {
    // Render links as plain styled text, not clickable
    return `<span class="disabled-link">${text}</span>`;
  },
  image({ href, text }) {
    // Render image alt text as plain text
    return `<span class="disabled-link">${text || href}</span>`;
  },
};

marked.use({ renderer: linkStripper });

function renderMarkdown(content) {
  const rawHtml = marked.parse(content);
  return createDOMPurify.sanitize(rawHtml);
}

function renderCode(content, language) {
  let highlighted;
  if (language && hljs.getLanguage(language)) {
    highlighted = hljs.highlight(content, { language }).value;
  } else {
    highlighted = hljs.highlightAuto(content).value;
  }
  return `<pre><code class="hljs">${highlighted}</code></pre>`;
}

function renderFile(content, ext) {
  switch (ext) {
    case '.md':
      return renderMarkdown(content);
    case '.json':
      return renderCode(content, 'json');
    case '.yaml':
    case '.yml':
      return renderCode(content, 'yaml');
    case '.txt':
      return renderCode(content, 'plaintext');
    default:
      return renderCode(content, 'plaintext');
  }
}

module.exports = { renderFile, renderMarkdown, renderCode };