const fs = require("fs");
const path = "commands/grupos/antilink.js";
let content = fs.readFileSync(path, "utf8");

// 1) Quitar la constante fija MAX_WARNS = 3
const oldConst = `const MAX_WARNS = 3;\n`;
if (!content.includes(oldConst)) {
  console.error("❌ No se encontró 'const MAX_WARNS = 3;'.");
  process.exit(1);
}
content = content.replace(oldConst, "");

// 2) Agregar maxWarns (1-3, default 3) a normalizeConfig
const oldNormalize = `    blockYoutubeLinks: source.blockYoutubeLinks === true,
    blockOtherLinks: source.blockOtherLinks === true,
    whitelist: Array.isArray(source.whitelist)`;

const newNormalize = `    blockYoutubeLinks: source.blockYoutubeLinks === true,
    blockOtherLinks: source.blockOtherLinks === true,
    maxWarns: (() => {
      const n = Number(source.maxWarns);
      if (!Number.isFinite(n)) return 3;
      return Math.min(3, Math.max(1, Math.round(n)));
    })(),
    whitelist: Array.isArray(source.whitelist)`;

if (!content.includes(oldNormalize)) {
  console.error("❌ No se encontró el bloque de normalizeConfig para agregar maxWarns.");
  process.exit(1);
}
content = content.replace(oldNormalize, newNormalize);

// 3) Reemplazar todos los usos de MAX_WARNS por config.maxWarns
content = content.replace(/\bMAX_WARNS\b/g, "config.maxWarns");

// 4) Agregar el subcomando ".antilink warns <1-3>" (mismo estilo que "mode")
const oldMode = `    if (action === "mode") {
      const mode = String(args[1] || "").trim().toLowerCase();
      if (!["delete", "kick"].includes(mode)) {
        return sock.sendMessage(
          from,
          {
            text: "Usa: .antilink mode delete o .antilink mode kick",
            ...global.channelInfo,
          },
          quoted
        );
      }

      config.mode = mode;
      saveStore();
      return sock.sendMessage(
        from,
        {
          text: \`Modo anti-link actualizado a *\${mode.toUpperCase()}*.\`,
          ...global.channelInfo,
        },
        quoted
      );
    }

    if (action === "allow") {`;

const newMode = `    if (action === "mode") {
      const mode = String(args[1] || "").trim().toLowerCase();
      if (!["delete", "kick"].includes(mode)) {
        return sock.sendMessage(
          from,
          {
            text: "Usa: .antilink mode delete o .antilink mode kick",
            ...global.channelInfo,
          },
          quoted
        );
      }

      config.mode = mode;
      saveStore();
      return sock.sendMessage(
        from,
        {
          text: \`Modo anti-link actualizado a *\${mode.toUpperCase()}*.\`,
          ...global.channelInfo,
        },
        quoted
      );
    }

    if (action === "warns" || action === "avisos") {
      const n = Number(args[1]);
      if (!Number.isFinite(n) || n < 1 || n > 3) {
        return sock.sendMessage(
          from,
          {
            text: "Usa: .antilink warns 1  |  .antilink warns 2  |  .antilink warns 3",
            ...global.channelInfo,
          },
          quoted
        );
      }

      config.maxWarns = Math.round(n);
      saveStore();
      return sock.sendMessage(
        from,
        {
          text: \`✅ Avisos antes de expulsar actualizado a *\${config.maxWarns}*.\`,
          ...global.channelInfo,
        },
        quoted
      );
    }

    if (action === "allow") {`;

if (!content.includes(oldMode)) {
  console.error("❌ No se encontró el bloque del subcomando 'mode'.");
  process.exit(1);
}
content = content.replace(oldMode, newMode);

fs.writeFileSync(path, content, "utf8");
console.log("✅ antilink.js actualizado: MAX_WARNS ahora es configurable por grupo (1-3) con '.antilink warns <n>'.");
