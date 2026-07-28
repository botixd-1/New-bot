const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldLimits = `const DOWNLOAD_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_DURATION_SECONDS = 20 * 60;
const AS_DOCUMENT_BYTES = 35 * 1024 * 1024;
const MAX_FILE_BYTES = 500 * 1024 * 1024;
const MIN_FILE_BYTES = 10 * 1024;`;

const newLimits = `const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_DURATION_SECONDS = 3 * 60 * 60;
const AS_DOCUMENT_BYTES = 35 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const MIN_FILE_BYTES = 10 * 1024;`;

if (!content.includes(oldLimits)) {
  console.error("❌ No se encontró el bloque de límites.");
  process.exit(1);
}
content = content.replace(oldLimits, newLimits);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: límite subido a 2GB y duración máxima a 3 horas (antes 500MB / 20min).");
