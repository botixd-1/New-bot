const fs = require("fs");
const path = "commands/grupos/kick.js";
let content = fs.readFileSync(path, "utf8");

const oldLine = `      const { participant, jid: targetJid, candidates } = resolveGroupTarget(
        metadata,
        msg || m || {},
        args
      );`;

const newLine = `      const { participant, jid: targetJid, candidates } = resolveGroupTarget(
        metadata,
        msg || m || {},
        args
      );
      console.log(\`[KICK_SINGLE_DEBUG] candidates=\${JSON.stringify(candidates)} targetJid=\${targetJid} participant=\${JSON.stringify(participant)}\`);`;

if (!content.includes(oldLine)) {
  console.error("❌ No se encontró el bloque a modificar.");
  process.exit(1);
}
content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content, "utf8");
console.log("✅ kick.js: debug del modo single (responder mensaje) agregado.");
