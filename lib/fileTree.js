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
    items = fs.readdirSync(dirPath).sort((a, b) => {
      const aIsDir = fs.statSync(path.join(dirPath, a)).isDirectory();
      const bIsDir = fs.statSync(path.join(dirPath, b)).isDirectory();
      if (aIsDir && !bIsDir) return -1;
      if (!aIsDir && bIsDir) return 1;
      return a.localeCompare(b);
    });
  } catch (e) {
    return entry;
  }

  for (const item of items) {
    const fullPath = path.join(dirPath, item);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch (e) {
      continue;
    }

    if (stat.isDirectory()) {
      const subtree = buildTree(fullPath, rootDir);
      if (subtree.children.length > 0) {
        entry.children.push(subtree);
      }
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      if (SUPPORTED_EXTENSIONS.includes(ext)) {
        entry.children.push({
          name: item,
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

function findFirstFile(tree, ext = '.md') {
  for (const child of tree.children) {
    if (child.type === 'file' && child.ext === ext) {
      return child.path;
    }
    if (child.type === 'directory') {
      const found = findFirstFile(child, ext);
      if (found) return found;
    }
  }
  // Fall back to any supported file
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