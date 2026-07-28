const fs = require("fs");
const path = "commands/grupos/topinactivos.js";
let content = fs.readFileSync(path, "utf8");

const oldLine = `      \`❀ Top de usuarios inactivos ❀\\n\` +`;
const newLine = `      \`✦ Top de usuarios inactivos ✦\\n\` +`;

if (!content.includes(oldLine)) {
  console.error("❌ No se encontró la línea del título.");
  process.exit(1);
}
content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content, "utf8");
console.log("✅ topinactivos.js: título actualizado con ✦");
