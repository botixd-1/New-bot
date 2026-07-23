const fs = require("fs");
const path = "commands/menu/menu.js";
let content = fs.readFileSync(path, "utf8");

// 1) Quitar los headers repetidos "(2/5) — N comandos" para que quepan más comandos por mensaje
const oldFn = `function buildCategoryMenuText(category, commands, primaryPrefix, settings = {}) {
  const icon = getCategoryIcon(category);
  const label = normalizeCategoryLabel(category);
  const count = commands.length;
  const commandBlocks = chunkRows(commands, 10).map((chunk, index) => {
    const pageLabel = commands.length > 10 ? \` (\${index + 1}/\${Math.ceil(commands.length / 10)})\` : "";
    const lines = [\`> \${icon} \${label}\${pageLabel} — \${count} comandos\`, DIVIDER, ""];

    for (const [itemIndex, item] of chunk.entries()) {
      const aliasText = item.aliases?.length ? \` — alias: \${item.aliases.slice(0, 3).join(", ")}\` : "";
      lines.push(\`> ✦ \${primaryPrefix}\${stylizeWord(item.name)} [\${item.access}]\`);
      lines.push(\`    \${item.description || "Comando disponible del bot."}\${aliasText}\`);
      lines.push("");
    }

    if (lines[lines.length - 1] === "") lines.pop();

    return lines.join("\\n");
  });

  return [...commandBlocks, "", buildFooter(primaryPrefix)].join("\\n");
}`;

const newFn = `function buildCategoryMenuText(category, commands, primaryPrefix, settings = {}) {
  const icon = getCategoryIcon(category);
  const label = normalizeCategoryLabel(category);
  const count = commands.length;
  const lines = [\`> \${icon} \${label} — \${count} comandos\`, DIVIDER, ""];

  for (const item of commands) {
    const aliasText = item.aliases?.length ? \` — alias: \${item.aliases.slice(0, 3).join(", ")}\` : "";
    lines.push(\`> ✦ \${primaryPrefix}\${stylizeWord(item.name)} [\${item.access}]\`);
    lines.push(\`    \${item.description || "Comando disponible del bot."}\${aliasText}\`);
    lines.push("");
  }

  if (lines[lines.length - 1] === "") lines.pop();

  return [lines.join("\\n"), "", buildFooter(primaryPrefix)].join("\\n");
}`;

if (!content.includes(oldFn)) {
  console.error("❌ No se encontró buildCategoryMenuText (puede que ya esté parcheado).");
  process.exit(1);
}
content = content.replace(oldFn, newFn);

// 2) Menú principal en formato caja, con menos líneas
const oldLanding = `function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel) {
  return [
    \`> \${stylizeWord("JM BOT")}\`,
    DIVIDER,
    "",
    \`> Hola, \${menuContext.botLine || settings?.botName || "usuario"}\`,
    "> Pulsa ABRIR MENU para ver categorias.",
    "",
    \`> Owner: \${settings?.ownerName || "Owner"}\`,
    \`> Prefijo: \${prefixLabel}\`,
    \`> Runtime: \${uptime}\`,
    \`> Categorías: \${totalCategories} · Comandos: \${totalCommands}\`,
  ].join("\\n");
}`;

const newLanding = `function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel) {
  const ownerName = settings?.ownerName || "Owner";
  const botName = menuContext.botLine || settings?.botName || "JM Bot";
  const primaryPrefix = getPrimaryPrefix(settings);

  return [
    "╭─────────────────╮",
    \`│   \${stylizeSignature("JM Bot")}  │\`,
    "├─────────────────",
    \`│ 👋 Hola, *\${stylizeWord("Now loading. . .")}*\`,
    \`│ Pulsa *\${stylizeSubtitle("JM Bot menu")}* para desplegar categorias.\`,
    "├─────────────────",
    \`│ 👤 Vista: *\${menuContext.subtitle}*\`,
    \`│ 🧷 Prefijos: *\${prefixLabel}*\`,
    \`│ 🤖 Bot: *\${botName}*\`,
    \`│ 👑 Owner: *\${ownerName}*\`,
    \`│ ⏱️ Runtime: *\${uptime}*\`,
    \`│ 🗂️ Categorías: *\${totalCategories}*\`,
    \`│ ⚙️ Comandos: *\${totalCommands}*\`,
    \`│ ⚡ Red: *\${primaryPrefix}speedtest rapido*\`,
    "╰─────────────────╯",
    \`> © \${ownerName}\`,
  ].join("\\n");
}`;

if (!content.includes(oldLanding)) {
  console.error("❌ No se encontró buildMenuLandingText (puede que ya esté parcheado).");
  process.exit(1);
}
content = content.replace(oldLanding, newLanding);

fs.writeFileSync(path, content, "utf8");
console.log("✅ menu.js actualizado: menú principal en caja + categorías sin headers repetidos.");
