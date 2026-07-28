const fs = require("fs");
const path = "commands/grupos/antiarab.js";
let content = fs.readFileSync(path, "utf8");

// 1) Quitar los logs de debug que agregamos antes
const oldDebug = `    console.log(\`[ANTIARAB_DEBUG] action=\${update.action} participants=\${JSON.stringify(update.participants)} prefixes=\${JSON.stringify(config.prefixes)}\`);

    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const number = normalizeParticipantNumber(participant);
      console.log(\`[ANTIARAB_DEBUG] participant=\${participant} number=\${number} botNumber=\${botNumber} matchPrefix=\${config.prefixes.find((p) => number.startsWith(p)) || "ninguno"}\`);
      if (!number || number === botNumber || ownerNumbers.includes(number)) continue;
      if (!config.prefixes.some((prefix) => number.startsWith(prefix))) continue;`;

// 2) Resolver el número real cuando el participante viene como @lid
const newBlock = `    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const realNumberSource =
        metadataParticipant?.phoneNumber ||
        metadataParticipant?.pn ||
        metadataParticipant?.phone_number ||
        participant;
      const number = normalizeParticipantNumber(realNumberSource);
      if (!number || number === botNumber || ownerNumbers.includes(number)) continue;
      if (!config.prefixes.some((prefix) => number.startsWith(prefix))) continue;`;

if (!content.includes(oldDebug)) {
  console.error("❌ No se encontró el bloque de debug a reemplazar.");
  process.exit(1);
}
content = content.replace(oldDebug, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ antiarab.js: ahora resuelve el numero real desde metadata cuando el participante llega como @lid, y se quitó el debug log.");
