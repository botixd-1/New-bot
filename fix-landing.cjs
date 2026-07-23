const fs = require("fs");
const path = "commands/menu/menu.js";
let content = fs.readFileSync(path, "utf8");

const oldFn = `function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel) {
  return [
    "╭─────────────────╮",
    "│   JM Bot  │",
    "├─────────────────┤",
    \`│ 👋 Hola, *\${menuContext.botLine || settings?.botName || "usuario"}*\`,
    "│ Pulsa *ABRIR MENU* para desplegar categorias.",
    "├─────────────────┤",
    \`│ 👤 Vista: *\${menuContext.subtitle}*\`,
    \`│ 🧷 Prefijos: *\${prefixLabel}*\`,
    \`│ 🤖 Bot: *\${menuContext.title}*\`,
    \`│ 👑 Owner: *\${settings?.ownerName || "Owner"}*\`,
    \`│ ⏱️ Runtime: *\${uptime}*\`,
    \`│ 🗂️ Categorías: *\${totalCategories}*\`,
    \`│ ⚙️ Comandos: *\${totalCommands}*\`,
    \`│ ⚡ Red: *\${getPrimaryPrefix(settings)}speedtest rapido*\`,
    "╰─────────────────╯",
    \`> © \${settings?.ownerName || "JM"}\`,
  ].join("\\n");
}`;

const newFn = `function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel) {
  return [
    "╭─────────────────╮",
    "│   JM Bot  │",
    "├─────────────────┤",
    \`│ 👋 Hola, *\${menuContext.botLine || settings?.botName || "usuario"}*\`,
    "│ Pulsa *JM Bot* para desplegar categorias.",
    "├─────────────────┤",
    \`│ 👤 Vista: *\${menuContext.subtitle}*\`,
    \`│ 🧷 Prefijos: *\${prefixLabel}*\`,
    \`│ 🤖 Bot: *\${menuContext.title}*\`,
    \`│ 👑 Owner: *\${settings?.ownerName || "Owner"}*\`,
    \`│ ⏱️ Runtime: *\${uptime}*\`,
    \`│ 🗂️ Categorías: *\${totalCategories}*\`,
    \`│ ⚙️ Comandos: *\${totalCommands}*\`,
    \`│ ⚡ Red: *\${getPrimaryPrefix(settings)}speedtest rapido*\`,
    "╰─────────────────╯",
    \`> © \${settings?.ownerName || "JM"}\`,
  ].join("\\n");
}`;

if (!content.includes(oldFn)) {
  console.error("❌ No se encontró buildMenuLandingText.");
  process.exit(1);
}
content = content.replace(oldFn, newFn);

// También quita el footer duplicado (el "© JM" que se repite fuera de la caja)
const oldFooter = `        const payload = {
          footer: \`© \${settings?.ownerName || "JM Bot"}\`,
          buttons,
          headerType: 1,
          ...global.channelInfo,
        };`;

const newFooter = `        const payload = {
          buttons,
          headerType: 1,
          ...global.channelInfo,
        };`;

if (content.includes(oldFooter)) {
  content = content.replace(oldFooter, newFooter);
  console.log("✅ Footer duplicado eliminado.");
} else {
  console.log("ℹ️ Footer duplicado ya no estaba (o ya lo quitaste antes) — se dejó igual.");
}

fs.writeFileSync(path, content, "utf8");
console.log("✅ buildMenuLandingText actualizado.");
