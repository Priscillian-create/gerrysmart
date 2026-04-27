const fs = require("fs");
const path = require("path");

const ENV_FILES = [".env.local", ".env"];

function parseLine(line) {
  const trimmed = line.trim();

  if (!trimmed || trimmed.startsWith("#")) {
    return null;
  }

  const separatorIndex = trimmed.indexOf("=");

  if (separatorIndex === -1) {
    return null;
  }

  const key = trimmed.slice(0, separatorIndex).trim();
  let value = trimmed.slice(separatorIndex + 1).trim();

  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return { key, value };
}

function loadEnv() {
  const rootDir = path.resolve(__dirname, "..");

  for (const fileName of ENV_FILES) {
    const filePath = path.join(rootDir, fileName);

    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");

    for (const line of content.split(/\r?\n/)) {
      const entry = parseLine(line);

      if (!entry || process.env[entry.key]) {
        continue;
      }

      process.env[entry.key] = entry.value;
    }

    return filePath;
  }

  return null;
}

module.exports = { loadEnv };
