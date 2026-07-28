const fs = require("fs");
const path = "commands/grupos/antiarab.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const realNumberSource =
        metadataParticipant?.phoneNumber ||
        metadataParticipant?.pn ||
        metadataParticipant?.phone_number ||
        participant;
      const number = normalizeParticipantNumber(realNumberSource);`;

const newBlock = `    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      console.log(\`[ANTIARAB_DEBUG2] enabled=\${config.enabled} participant=\${participant} metadataParticipant=\${JSON.stringify(metadataParticipant)}\`);
      const realNumberSource =
        metadataParticipant?.phoneNumber ||
        metadataParticipant?.pn ||
        metadataParticipant?.phone_number ||
        participant;
      const number = normalizeParticipantNumber(realNumberSource);
      console.log(\`[ANTIARAB_DEBUG2] realNumberSource=\${realNumberSource} number=\${number} matchPrefix=\${config.prefixes.find((p) => number.startsWith(p)) || "ninguno"}\`);`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró el bloque a modificar.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ Debug2 agregado.");
