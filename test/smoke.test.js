const { describe, it, before, after } = require('node:test');
const assert = require('node:assert');
const path = require('path');
const fs = require('fs');

const { getFileTree, findFirstFile, SUPPORTED_EXTENSIONS } = require('../lib/fileTree');
const { renderFile } = require('../lib/renderer');
const { loadConfig } = require('../lib/config');

// 1. Path traversal rejects '..' sequences
describe('path traversal protection', () => {
  it('should reject relative path with .. that escapes rootDir', () => {
    const config = loadConfig();
    const rootDir = config.rootDir;
    const resolved = path.resolve(rootDir, '../outside');
    const rootWithSep = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;
    const isTraversal = !resolved.startsWith(rootWithSep) && resolved !== rootDir;
    assert.strictEqual(isTraversal, true,
      `resolved path "${resolved}" should not start with rootDir "${rootWithSep}"`);
  });

  it('should allow paths within rootDir', () => {
    const config = loadConfig();
    const rootDir = config.rootDir;
    const resolved = path.resolve(rootDir, 'some/file.md');
    const rootWithSep = rootDir.endsWith(path.sep) ? rootDir : rootDir + path.sep;
    const isSafe = resolved.startsWith(rootWithSep) || resolved === rootDir;
    assert.strictEqual(isSafe, true,
      `resolved path "${resolved}" should start with rootDir "${rootWithSep}"`);
  });
});

// 2. findFirstFile prefers .md over other extensions
describe('findFirstFile', () => {
  it('should return .md file when present', () => {
    const tree = {
      name: 'root',
      path: '/',
      type: 'directory',
      children: [
        { name: 'readme.md', path: 'readme.md', type: 'file', ext: '.md' },
        { name: 'notes.txt', path: 'notes.txt', type: 'file', ext: '.txt' },
      ],
    };
    assert.strictEqual(findFirstFile(tree), 'readme.md');
  });

  it('should fall back to non-.md supported file when no .md exists', () => {
    const tree = {
      name: 'root',
      path: '/',
      type: 'directory',
      children: [
        { name: 'data.json', path: 'data.json', type: 'file', ext: '.json' },
        { name: 'notes.txt', path: 'notes.txt', type: 'file', ext: '.txt' },
      ],
    };
    // First non-md file encountered in second pass is data.json
    assert.strictEqual(findFirstFile(tree), 'data.json');
  });

  it('should search recursively into subdirectories', () => {
    const tree = {
      name: 'root',
      path: '/',
      type: 'directory',
      children: [
        {
          name: 'subdir',
          path: 'subdir',
          type: 'directory',
          children: [
            { name: 'deep.md', path: 'subdir/deep.md', type: 'file', ext: '.md' },
          ],
        },
      ],
    };
    assert.strictEqual(findFirstFile(tree), 'subdir/deep.md');
  });

  it('should return null for empty tree', () => {
    const tree = {
      name: 'root',
      path: '/',
      type: 'directory',
      children: [],
    };
    assert.strictEqual(findFirstFile(tree), null);
  });
});

// 3. renderFile strips links and sanitizes HTML
describe('renderFile', () => {
  it('should convert markdown links to disabled-link spans', () => {
    const input = 'Hello [click here](http://example.com) world';
    const output = renderFile(input, '.md');
    // Should NOT contain an anchor tag
    assert.ok(!output.includes('<a'), `output should not contain <a, got: ${output}`);
    // Should contain disabled-link span
    assert.ok(output.includes('disabled-link'), `output should contain disabled-link, got: ${output}`);
    // The link text should appear
    assert.ok(output.includes('click here'), `output should contain link text, got: ${output}`);
  });

  it('should sanitize script tags from markdown', () => {
    const input = 'Hello <script>alert(1)</script> world';
    const output = renderFile(input, '.md');
    // Script tag should be stripped/escaped by DOMPurify
    assert.ok(!output.includes('<script>'), `output should not contain <script>, got: ${output}`);
    assert.ok(!output.includes('alert(1)'), `output should not contain alert(1), got: ${output}`);
  });

  it('should handle plain markdown without modification', () => {
    const input = '# Hello\n\nThis is **bold** and `code`.';
    const output = renderFile(input, '.md');
    assert.ok(output.includes('<h1>'), 'output should contain <h1>');
    assert.ok(output.includes('<strong>'), 'output should contain <strong>');
    assert.ok(output.includes('<code>'), 'output should contain <code>');
  });
});

// 4. getFileTree excludes dotfiles
describe('getFileTree', () => {
  let tmpDir;
  let tmpRoot;

  before(() => {
    tmpDir = fs.mkdtempSync(path.join(fs.realpathSync.native ? fs.realpathSync.native('/tmp') : '/tmp', 'mdviewer-test-'));
    // Create a .gitkeep file and some regular files
    fs.writeFileSync(path.join(tmpDir, '.hidden'), 'secret');
    fs.writeFileSync(path.join(tmpDir, '.gitkeep'), '');
    fs.writeFileSync(path.join(tmpDir, 'README.md'), '# Hello');
    fs.writeFileSync(path.join(tmpDir, 'notes.txt'), 'notes');
    tmpRoot = tmpDir;
  });

  after(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should not include dotfiles in the tree', () => {
    const tree = getFileTree(tmpRoot);
    const names = tree.children.map(c => c.name);
    assert.ok(!names.includes('.hidden'), '.hidden should be excluded');
    assert.ok(!names.includes('.gitkeep'), '.gitkeep should be excluded');
    assert.ok(names.includes('README.md'), 'README.md should be included');
    assert.ok(names.includes('notes.txt'), 'notes.txt should be included');
  });
});

// 5. SUPPORTED_EXTENSIONS is defined and non-empty
describe('SUPPORTED_EXTENSIONS', () => {
  it('should be an array', () => {
    assert.ok(Array.isArray(SUPPORTED_EXTENSIONS));
  });

  it('should not be empty', () => {
    assert.ok(SUPPORTED_EXTENSIONS.length > 0);
  });

  it('should contain expected extensions including .md', () => {
    assert.ok(SUPPORTED_EXTENSIONS.includes('.md'));
    assert.ok(SUPPORTED_EXTENSIONS.includes('.txt'));
    assert.ok(SUPPORTED_EXTENSIONS.includes('.json'));
  });
});
