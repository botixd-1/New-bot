const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `  try {
    await tryDownload(url, referer, outputPath, ["-c", "copy", "-bsf:a", "aac_adtstoasc"]);
  } catch {
    await deleteSafe(outputPath);

    try {
      await tryDownload(url, referer, outputPath, [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
      ]);
    } catch {
      await deleteSafe(outputPath);`;

const newBlock = `  try {
    await tryDownload(url, referer, outputPath, ["-c", "copy", "-bsf:a", "aac_adtstoasc"]);
  } catch (err1) {
    console.error(\`[VDL_DEBUG] Fallo intento 1 (remux):\`, err1?.stderr || err1?.message || err1);
    await deleteSafe(outputPath);

    try {
      await tryDownload(url, referer, outputPath, [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
      ]);
    } catch (err2) {
      console.error(\`[VDL_DEBUG] Fallo intento 2 (transcode):\`, err2?.stderr || err2?.message || err2);
      await deleteSafe(outputPath);`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró el bloque a modificar.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: debug de errores de ffmpeg agregado.");
