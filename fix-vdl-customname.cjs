const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "") {`;
const newSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "") {`;

if (!content.includes(oldSig)) {
  console.error("❌ No se encontró la firma de downloadAndSendVideo.");
  process.exit(1);
}
content = content.replace(oldSig, newSig);

const oldName = `    const fileName = await resolveFileName(url, referer, cookie);`;
const newName = `    const fileName = customName
      ? ensureMp4Extension(customName)
      : await resolveFileName(url, referer, cookie);`;

if (!content.includes(oldName)) {
  console.error("❌ No se encontró la línea de fileName.");
  process.exit(1);
}
content = content.replace(oldName, newName);

const oldRunCall = `    const referer = String(args[1] || "").trim();
    const cookie = String(args.slice(2).join(" ") || "").trim();
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie);`;

const newRunCall = `    const nameMarkerIndex = args.findIndex((a) => /^nombre:/i.test(a));
    const hasNameMarker = nameMarkerIndex >= 0;
    const customName = hasNameMarker
      ? args
          .slice(nameMarkerIndex)
          .join(" ")
          .replace(/^nombre:/i, "")
          .trim()
      : "";
    const restArgs = hasNameMarker ? args.slice(0, nameMarkerIndex) : args;

    const referer = String(restArgs[1] || "").trim();
    const cookie = String(restArgs.slice(2).join(" ") || "").trim();
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName);`;

if (!content.includes(oldRunCall)) {
  console.error("❌ No se encontró la llamada final en run().");
  process.exit(1);
}
content = content.replace(oldRunCall, newRunCall);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: ahora puedes poner nombre:Tu Nombre al final del comando para forzar el nombre del archivo.");
