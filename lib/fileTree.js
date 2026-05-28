const fs = require('fs');
const path = require('path');

const SUPPORTED_EXTENSIONS = ['.md', '.txt', '.json', '.yaml', '.yml'];

function buildTree(dirPath, rootDir) {
  const name = path.basename(dirPath);
  const relativePath = path.relative(rootDir, dirPath);

  const entry = {
    name,
    path: relativePath || '/',
    type: 'directory',
    children: [],
  };

  let items;
  try {
    items = fs.readdirSync(dirPath).map(name => {
      const fullPath = path.join(dirPath, name);
      const isDir = fs.statSync(fullPath).isDirectory();
      return { name, isDir };
    }).sort((a, b) => {
      if (a.isDir && !b.isDir) return -1;
      if (!a.isDir && b.isDir) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (e) {
    return entry;
  }

  for (const item of items) {
    if (item.name.startsWith('.')) continue;
    const fullPath = path.join(dirPath, item.name);

    if (item.isDir) {
      const subtree = buildTree(fullPath, rootDir);
      if (subtree.children.length > 0) {
        entry.children.push(subtree);
      }
    } else {
      const ext = path.extname(item.name).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        entry.children.push({
          name: item.name,
          path: path.relative(rootDir, fullPath),
          type: 'file',
          ext,
        });
      }
    }
  }

  return entry;
}

function getFileTree(rootDir) {
  return buildTree(rootDir, rootDir);
}

function findFirstFile(tree) {
  // First pass: prefer .md
  for (const child of tree.children) {
    if (child.type === 'file' && child.ext === '.md') return child.path;
    if (child.type === 'directory') {
      const found = findFirstFile(child);
      if (found) return found;
    }
  }
  // Second pass: any supported file
  for (const child of tree.children) {
    if (child.type === 'file') return child.path;
    if (child.type === 'directory') {
      const found = findFirstFile(child);
      if (found) return found;
    }
  }
  return null;
}

module.exports = { getFileTree, findFirstFile, SUPPORTED_EXTENSIONS };