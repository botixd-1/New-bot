const fs = require("fs");
const path = "commands/menu/menu.js";
let content = fs.readFileSync(path, "utf8");

const oldTitle = `\`│   \${stylizeSignature("JM Bot")}  │\`,`;
const newTitle = `"│   JM Bot  │",`;

if (!content.includes(oldTitle)) {
  console.error("❌ No se encontró la línea del título (stylizeSignature).");
  process.exit(1);
}
content = content.replace(oldTitle, newTitle);

fs.writeFileSync(path, content, "utf8");
console.log("✅ Título corregido: ahora dice 'JM Bot' sin texto extra.");
