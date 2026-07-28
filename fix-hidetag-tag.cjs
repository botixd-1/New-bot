const fs = require("fs");
const path = "commands/grupos/hidetag.js";
let content = fs.readFileSync(path, "utf8");

const oldLine = `  command: ["hidetag"],`;
const newLine = `  command: ["hidetag", "tag"],`;

if (!content.includes(oldLine)) {
  console.error("❌ No se encontró la línea del command.");
  process.exit(1);
}
content = content.replace(oldLine, newLine);

fs.writeFileSync(path, content, "utf8");
console.log("✅ hidetag.js: ahora tambien responde a .tag");
