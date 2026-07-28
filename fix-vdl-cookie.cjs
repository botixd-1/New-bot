const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldHeaders = `function buildHeadersArg(referer = "") {
  let headers = \`User-Agent: \${UA}\\r\\n\`;
  if (referer) {
    headers += \`Referer: \${referer}\\r\\n\`;
  }
  return headers;
}`;

const newHeaders = `function buildHeadersArg(referer = "", cookie = "") {
  let headers = \`User-Agent: \${UA}\\r\\n\`;
  if (referer) {
    headers += \`Referer: \${referer}\\r\\n\`;
  }
  if (cookie) {
    headers += \`Cookie: \${cookie}\\r\\n\`;
  }
  return headers;
}`;

if (!content.includes(oldHeaders)) {
  console.error("❌ No se encontró buildHeadersArg.");
  process.exit(1);
}
content = content.replace(oldHeaders, newHeaders);

const oldTry = `async function tryDownload(url, referer, outputPath, extraArgs = []) {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-headers",
      buildHeadersArg(referer),`;

const newTry = `async function tryDownload(url, referer, cookie, outputPath, extraArgs = []) {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-headers",
      buildHeadersArg(referer, cookie),`;

if (!content.includes(oldTry)) {
  console.error("❌ No se encontró tryDownload.");
  process.exit(1);
}
content = content.replace(oldTry, newTry);

const oldSend = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "") {`;
const newSend = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "") {`;

if (!content.includes(oldSend)) {
  console.error("❌ No se encontró downloadAndSendVideo.");
  process.exit(1);
}
content = content.replace(oldSend, newSend);

const oldCall1 = `    await tryDownload(url, referer, outputPath, ["-c", "copy", "-bsf:a", "aac_adtstoasc"]);`;
const newCall1 = `    await tryDownload(url, referer, cookie, outputPath, ["-c", "copy", "-bsf:a", "aac_adtstoasc"]);`;

if (!content.includes(oldCall1)) {
  console.error("❌ No se encontró la primera llamada a tryDownload.");
  process.exit(1);
}
content = content.replace(oldCall1, newCall1);

const oldCall2 = `      await tryDownload(url, referer, outputPath, [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
      ]);`;

const newCall2 = `      await tryDownload(url, referer, cookie, outputPath, [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
      ]);`;

if (!content.includes(oldCall2)) {
  console.error("❌ No se encontró la segunda llamada a tryDownload.");
  process.exit(1);
}
content = content.replace(oldCall2, newCall2);

const oldRunCall = `    const referer = String(args[1] || "").trim();
    return downloadAndSendVideo(sock, from, quoted, first, referer);`;

const newRunCall = `    const referer = String(args[1] || "").trim();
    const cookie = String(args.slice(2).join(" ") || "").trim();
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie);`;

if (!content.includes(oldRunCall)) {
  console.error("❌ No se encontró la llamada final en run().");
  process.exit(1);
}
content = content.replace(oldRunCall, newRunCall);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: soporte de cookie agregado correctamente.");
