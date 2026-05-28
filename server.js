const express = require('express');
const fs = require('fs');
const path = require('path');
const { loadConfig } = require('./lib/config');
const { getFileTree, findFirstFile, SUPPORTED_EXTENSIONS } = require('./lib/fileTree');
const { renderFile } = require('./lib/renderer');

const config = loadConfig();
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

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

app.use(express.static(path.join(__dirname, 'public')));

// Serve highlight.js CSS from node_modules
app.use('/vendor/highlight.js', express.static(
  path.join(__dirname, 'node_modules', 'highlight.js', 'styles')
));

// Serve github-markdown-css from node_modules
app.use('/vendor/github-markdown-css', express.static(
  path.join(__dirname, 'node_modules', 'github-markdown-css')
));

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'");
  next();
});

// GET / — redirect to first file or show welcome
app.get('/', (req, res) => {
  const tree = getCachedTree();
  const firstFile = findFirstFile(tree);

  if (firstFile) {
    return res.redirect(`/view/${firstFile}`);
  }

  res.render('index', {
    tree,
    content: null,
    filePath: null,
    fileName: null,
    rootDir: config.rootDir,
    rootDirName: path.basename(config.rootDir) || config.rootDir,
  });
});

// GET /view/* — render a file
app.get('/view/*', (req, res) => {
  const relativePath = req.params[0];
  const absolutePath = path.resolve(config.rootDir, relativePath);

  // Path traversal protection
  const rootWithSep = config.rootDir.endsWith(path.sep) ? config.rootDir : config.rootDir + path.sep;
  if (!absolutePath.startsWith(rootWithSep) && absolutePath !== config.rootDir) {
    return res.status(403).send('Forbidden');
  }

  // Only allow files, not directories
  let stat;
  try {
    stat = fs.statSync(absolutePath);
  } catch (e) {
    return res.status(404).send('File not found');
  }

  if (stat.isDirectory()) {
    return res.redirect('/');
  }

  const ext = path.extname(absolutePath).toLowerCase();
  if (!SUPPORTED_EXTENSIONS.includes(ext)) {
    return res.status(415).send('Unsupported file type');
  }

  let content;
  try {
    const raw = fs.readFileSync(absolutePath, 'utf8');
    content = renderFile(raw, ext);
  } catch (e) {
    return res.status(500).send('Error reading file');
  }

  const tree = getCachedTree();

  res.render('index', {
    tree,
    content,
    filePath: relativePath,
    fileName: path.basename(relativePath),
    rootDir: config.rootDir,
    rootDirName: path.basename(config.rootDir) || config.rootDir,
  });
});

// GET /api/tree — return file tree as JSON
app.get('/api/tree', (req, res) => {
  const tree = getCachedTree();
  res.json(tree);
});

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send('Internal server error');
});

const PORT = config.port;
app.listen(PORT, () => {
  console.log(`MD Viewer serving ${config.rootDir}`);
  console.log(`http://localhost:${PORT}`);
});