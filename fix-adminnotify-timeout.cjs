const fs = require("fs");
const path = "commands/grupos/adminnotify.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `    let metadata = null;
    try {
      metadata = await sock.groupMetadata(update.id);
    } catch {}`;

const newBlock = `    let metadata = null;
    try {
      metadata = await Promise.race([
        sock.groupMetadata(update.id),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("groupMetadata timeout")), 6000)
        ),
      ]);
    } catch {}`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró el bloque de sock.groupMetadata.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ adminnotify.js: groupMetadata ahora tiene límite de 6s, ya no puede colgar el hook 20s.");
