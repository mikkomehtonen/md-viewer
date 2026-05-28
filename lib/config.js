const fs = require('fs');
const path = require('path');

function loadConfig() {
  const configPath = path.join(process.cwd(), 'config.json');

  let config = {
    rootDir: process.cwd(),
    port: 3000,
  };

  if (fs.existsSync(configPath)) {
    try {
      const fileConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      config = { ...config, ...fileConfig };
    } catch (e) {
      console.error(`Failed to parse config.json: ${e.message}`);
      process.exit(1);
    }
  }

  // Resolve rootDir to an absolute path
  if (!path.isAbsolute(config.rootDir)) {
    config.rootDir = path.resolve(process.cwd(), config.rootDir);
  }

  return config;
}

module.exports = { loadConfig };