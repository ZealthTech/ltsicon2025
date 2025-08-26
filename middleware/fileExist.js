const fs = require("fs/promises");
const path = require("path");

async function fileExists(webPath, rootPath = path.resolve(__dirname, "../")) {
  if (!webPath) return false;
  console.log("webpaapa", webPath);
  const normalized = webPath.startsWith("/") ? webPath.slice(1) : webPath;
  const fullPath = path.join(rootPath, normalized);
  console.log("fullllll", fullPath);
  try {
    await fs.access(fullPath);
    return true;
  } catch {
    return false;
  }
}

module.exports = { fileExists };
