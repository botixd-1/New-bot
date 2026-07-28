const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `      return downloadAndSendVideo(sock, from, quoted, selected.url);`;
const newBlock = `      const attachedImage = await resolveAttachedImage(msg);
      return downloadAndSendVideo(
        sock,
        from,
        quoted,
        selected.url,
        "",
        "",
        selected.title,
        attachedImage
      );`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró la llamada de descarga por número.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: al elegir por número, ahora usa el nombre que tiene en la lista.");
