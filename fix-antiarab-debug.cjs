const fs = require("fs");
const path = "commands/grupos/antiarab.js";
let content = fs.readFileSync(path, "utf8");

const oldLine = `    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const number = normalizeParticipantNumber(participant);
      if (!number || number === botNumber || ownerNumbers.includes(number)) continue;
      if (!config.prefixes.some((prefix) => number.startsWith(prefix))) continue;`;

const newLine = `    console.log(\`[ANTIARAB_DEBUG] action=\${update.action} participants=\${JSON.stringify(update.participants)} prefixes=\${JSON.stringify(config.prefixes)}\`);

    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const number = normalizeParticipantNumber(participant);
      console.log(\`[ANTIARAB_DEBUG] participant=\${participant} number=\${number} botNumber=\${botNumber} matchPrefix=\${config.prefixes.find((p) => number.startsWith(p)) || "ninguno"}\`);
      if (!number || number === botNumber || ownerNumbers.includes(number)) continue;
      if (!config.prefixes.some((prefix) => number.startsWith(prefix))) continue;`;

if (!content.includes(oldLine)) {
  console.error("❌ No se encontró el bloque del loop de participantes.");
  process.exit(1);
}
content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content, "utf8");
console.log("✅ antiarab.js: agregado log temporal de diagnóstico.");
