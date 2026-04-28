const fs = require("fs");
const path = require("path");

const nextDir = path.resolve(__dirname, "..", ".next");

function removeEntry(targetPath) {
  try {
    fs.rmSync(targetPath, { recursive: true, force: true });
  } catch (error) {
    if (error && error.code !== "ENOENT") {
      console.warn(`[clean-next] Skipped ${targetPath}: ${error.message}`);
    }
  }
}

removeEntry(path.join(nextDir, "trace"));
removeEntry(path.join(nextDir, "cache"));
