const fs = require("fs");
const path = "commands/grupos/kick.js";
let content = fs.readFileSync(path, "utf8");

const oldLine = `  const participant = findGroupParticipant(metadata, [targetJid]);

  if (botCandidates.includes(targetJid)) {`;

const newLine = `  const participant = findGroupParticipant(metadata, [targetJid]);
  console.log(\`[KICK_DEBUG] targetJid=\${targetJid} matchedParticipant=\${JSON.stringify(participant)}\`);

  if (botCandidates.includes(targetJid)) {`;

if (!content.includes(oldLine)) {
  console.error("❌ No se encontró el bloque a modificar.");
  process.exit(1);
}
content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content, "utf8");
console.log("✅ kick.js: debug temporal agregado.");
