const fs = require("fs");
const path = "commands/grupos/antifake.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `      const number = normalizeJidDigits(participant);
      if (!number || isAllowed(number, config) || ownerNumbers.includes(number) || number === botNumber) {`;

const newBlock = `      const realNumberSource =
        (metadataParticipant?.jid && !String(metadataParticipant.jid).endsWith("@lid")
          ? metadataParticipant.jid
          : "") ||
        metadataParticipant?.phoneNumber ||
        metadataParticipant?.pn ||
        metadataParticipant?.phone_number ||
        participant;
      const number = normalizeJidDigits(realNumberSource);
      if (!number || isAllowed(number, config) || ownerNumbers.includes(number) || number === botNumber) {`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró el bloque a modificar.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ antifake.js: ahora resuelve el numero real desde @lid antes de comparar prefijos. Ya no expulsara por error.");
