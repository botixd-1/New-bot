import fs from "fs";
import path from "path";
import { stylizeMono, stylizeSignature, stylizeSubtitle, stylizeWord } from "../../lib/unicode-style.js";

let menuImageCache = null;
let menuImageCacheKey = "";

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function formatUptime(seconds = 0) {
  const total = Math.max(0, Math.floor(Number(seconds || 0)));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);

  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m`;
}

function getPrimaryPrefix(settings) {
  if (Array.isArray(settings?.prefix)) {
    return settings.prefix.find((value) => cleanText(value)) || ".";
  }

  return cleanText(settings?.prefix || ".") || ".";
}

function getPrefixLabel(settings) {
  if (Array.isArray(settings?.prefix)) {
    const values = settings.prefix.map((value) => cleanText(value)).filter(Boolean);
    return values.length ? values.join(" | ") : ".";
  }

  return cleanText(settings?.prefix || ".") || ".";
}

function getGithubLink(settings) {
  const fallback = "https://github.com/botixd-1/New-bot";
  const raw = cleanText(
    settings?.githubUrl || settings?.repoUrl || settings?.repository || fallback
  );
  return raw || fallback;
}

function normalizeCategoryKey(value = "") {
  const key = cleanText(value).toLowerCase();

  const aliases = {
    descarga: "descargas",
    download: "descargas",
    downloads: "descargas",

    busquedas: "busqueda",
    buscar: "busqueda",
    search: "busqueda",

    grupo: "grupos",
    group: "grupos",
    groups: "grupos",

    herramienta: "herramientas",
    tool: "herramientas",
    tools: "herramientas",

    game: "juegos",
    games: "juegos",

    economy: "economia",
    banco: "economia",

    ia: "ia",
    ai: "ia",

    system: "sistema",

    owner: "owner",
    dueño: "owner",
    dueno: "owner",

    admin: "admin",

    "free streaming accounts": "free_streaming_accounts",
    freestreamingaccounts: "free_streaming_accounts",
    "generador de cuentas": "free_streaming_accounts",
    generadordecuentas: "free_streaming_accounts",
    "cuentas streaming gratis": "free_streaming_accounts",
    "cuentas streamig gratis": "free_streaming_accounts",
    "streaming gratis": "free_streaming_accounts",
  };

  return aliases[key] || key || "otros";
}

function normalizeCategoryLabel(value = "") {
  const key = normalizeCategoryKey(value);

  const labels = {
    menu: "MENÚ",
    descargas: "DESCARGAS",
    free_streaming_accounts: "FREE STREAMING ACCOUNTS",
    busqueda: "BÚSQUEDA",
    freefire: "FREE FIRE",
    juegos: "JUEGOS",
    herramientas: "HERRAMIENTAS",
    grupos: "GRUPOS",
    subbots: "SUBBOTS",
    economia: "ECONOMÍA",
    sistema: "SISTEMA",
    ia: "IA",
    media: "MULTIMEDIA",
    filtros: "FILTROS",
    interacciones: "INTERACCIONES",
    anime: "ANIME",
    admin: "ADMIN",
    owner: "OWNER",
    vip: "VIP",
    otros: "OTROS",
  };

  return labels[key] || cleanText(value).replace(/_/g, " ").toUpperCase();
}

function getCategoryIcon(category = "") {
  const key = normalizeCategoryKey(category);

  const icons = {
    menu: "📜",
    descargas: "📥",
    free_streaming_accounts: "📺",
    busqueda: "🔎",
    freefire: "🔥",
    juegos: "🎮",
    herramientas: "🧰",
    grupos: "🛡️",
    subbots: "🤖",
    economia: "💰",
    sistema: "⚙️",
    ia: "🧠",
    media: "🖼️",
    filtros: "🎨",
    interacciones: "🤝",
    anime: "🌸",
    admin: "👑",
    owner: "🛠️",
    vip: "💎",
    otros: "✦",
  };

  return icons[key] || "✦";
}

function getCategorySortIndex(category = "") {
  const order = [
    "menu",
    "descargas",
    "free_streaming_accounts",
    "busqueda",
    "freefire",
    "juegos",
    "herramientas",
    "grupos",
    "subbots",
    "economia",
    "sistema",
    "ia",
    "media",
    "filtros",
    "interacciones",
    "anime",
    "admin",
    "owner",
    "vip",
    "otros",
  ];

  const index = order.indexOf(normalizeCategoryKey(category));
  return index === -1 ? Number.MAX_SAFE_INTEGER : index;
}

function getSubbotSlot(botId = "") {
  const match = cleanText(botId).toLowerCase().match(/^subbot(\d{1,2})$/);
  return match?.[1] ? Number.parseInt(match[1], 10) : 0;
}

function getMenuContext({ settings, botId = "", botLabel = "" }) {
  const normalizedBotId = cleanText(botId).toLowerCase();

  if (!normalizedBotId || normalizedBotId === "main") {
    return {
      title: "JM Bot",
      subtitle: "MENÚ PRINCIPAL",
      botLine: settings?.botName || "JM Bot",
    };
  }

  const slot = getSubbotSlot(normalizedBotId);

  const subbotName =
    (slot >= 1 && Array.isArray(settings?.subbots) && settings.subbots[slot - 1]?.name) ||
    cleanText(botLabel) ||
    `JM Bot Subbot ${slot || 1}`;

  return {
    title: `JM Bot SUBBOT ${slot || 1}`,
    subtitle: "MENÚ SUBBOT",
    botLine: subbotName,
  };
}

function resolveMenuImagePath() {
  const base = path.join(process.cwd(), "imagenes", "menu");

  const candidates = [
    `${base}.png`,
    `${base}.jpg`,
    `${base}.jpeg`,
    `${base}.webp`,
  ];

  return candidates.find((filePath) => fs.existsSync(filePath)) || "";
}

function resolveImagePathFromBase(base = "") {
  const normalizedBase = cleanText(base);
  if (!normalizedBase) return "";

  const candidates = [
    `${normalizedBase}.png`,
    `${normalizedBase}.jpg`,
    `${normalizedBase}.jpeg`,
    `${normalizedBase}.webp`,
  ];

  return candidates.find((filePath) => fs.existsSync(filePath)) || "";
}

function resolveCategoryImagePath(category = "") {
  const key = normalizeCategoryKey(category);
  const imageDir = path.join(process.cwd(), "imagenes");

  const baseByCategory = {
    grupos: path.join(imageDir, "menu-grupo"),
    sistema: path.join(imageDir, "menu-sistema"),
    herramientas: path.join(imageDir, "menu-sistema"),
    juegos: path.join(imageDir, "juegos"),
    descargas: path.join(imageDir, "menu-descarga"),
    free_streaming_accounts: path.join(imageDir, "menu-generador"),
  };

  const primaryBase = baseByCategory[key];
  const primaryPath = resolveImagePathFromBase(primaryBase);
  if (primaryPath) return primaryPath;

  return resolveMenuImagePath();
}

function getCategoryImageBuffer(category = "") {
  const imagePath = resolveCategoryImagePath(category);
  if (!imagePath) return null;

  try {
    return fs.readFileSync(imagePath);
  } catch {
    return null;
  }
}

function getMenuImageBuffer() {
  const imagePath = resolveMenuImagePath();
  if (!imagePath) return null;

  try {
    const stat = fs.statSync(imagePath);
    const cacheKey = `${imagePath}:${stat.mtimeMs}:${stat.size}`;

    if (menuImageCache && menuImageCacheKey === cacheKey) {
      return menuImageCache;
    }

    const buffer = fs.readFileSync(imagePath);

    menuImageCache = buffer;
    menuImageCacheKey = cacheKey;

    return buffer;
  } catch {
    return null;
  }
}

function getCommandNames(cmd) {
  const commandRaw = cmd?.command || cmd?.commands || cmd?.cmd;

  if (Array.isArray(commandRaw)) {
    return commandRaw
      .map((value) => cleanText(value).toLowerCase())
      .filter(Boolean);
  }

  const single = cleanText(commandRaw).toLowerCase();
  return single ? [single] : [];
}

function getMainCommand(cmd) {
  const names = getCommandNames(cmd);
  return names[0] || "";
}

function getCommandAliases(cmd) {
  const names = getCommandNames(cmd);
  return names.length > 1 ? names.slice(1) : [];
}

function getCommandCategory(cmd) {
  return normalizeCategoryKey(cmd?.categoria || cmd?.category || "otros");
}

function isHiddenCommand(cmd) {
  return Boolean(cmd?.hidden || cmd?.hide || cmd?.oculto);
}

function getCommandDescription(cmd) {
  return cleanText(cmd?.description || cmd?.desc || cmd?.help || "");
}

function getCommandAccessLabel(cmd) {
  if (cmd?.ownerOnly) return "OWNER";
  if (cmd?.adminOnly) return "ADMIN";
  return "PUBLICO";
}

function getPluginKey(cmd, fallback = "") {
  return (
    cleanText(cmd?.__pluginKey) ||
    cleanText(cmd?.__sourceFile) ||
    cleanText(cmd?.name) ||
    cleanText(fallback)
  );
}

function collectCommandData(comandos) {
  const categories = {};
  const seenPlugins = new Set();

  for (const cmd of new Set(comandos.values())) {
    if (!cmd || isHiddenCommand(cmd)) continue;

    const main = getMainCommand(cmd);
    if (!main) continue;

    const pluginKey = getPluginKey(cmd, main).toLowerCase();
    if (!pluginKey || seenPlugins.has(pluginKey)) continue;
    seenPlugins.add(pluginKey);

    const category = getCommandCategory(cmd);

    if (!categories[category]) {
      categories[category] = new Map();
    }

    if (Array.isArray(cmd.menuEntries) && cmd.menuEntries.length) {
      for (const entry of cmd.menuEntries) {
        const entryName = cleanText(entry?.name || "");
        if (!entryName) continue;
        categories[category].set(entryName, {
          name: entryName,
          description: cleanText(entry?.description || getCommandDescription(cmd)),
          pluginKey: `${pluginKey}:${entryName}`,
          aliases: Array.isArray(entry?.aliases) ? entry.aliases : [],
          access: entry?.access || getCommandAccessLabel(cmd),
        });
      }
      continue;
    }

    categories[category].set(main, {
      name: main,
      description: getCommandDescription(cmd),
      pluginKey,
      aliases: getCommandAliases(cmd),
      access: getCommandAccessLabel(cmd),
    });
  }

  const cleanCategories = {};

  for (const [category, map] of Object.entries(categories)) {
    cleanCategories[category] = Array.from(map.values()).sort((a, b) =>
      String(a.name || "").localeCompare(String(b.name || ""))
    );
  }

  return cleanCategories;
}

function getCategoryDescription(category = "", count = 0) {
  const key = normalizeCategoryKey(category);

  const descriptions = {
    menu: "Panel principal del bot",
    descargas: "Audio, video y descargas",
    free_streaming_accounts: "Free streaming accounts and shared access",
    busqueda: "Busqueda y resultados rapidos",
    freefire: "Utilidades para Free Fire",
    juegos: "Diversion y minijuegos",
    herramientas: "Herramientas y utilidades",
    grupos: "Ajustes y control de grupos",
    subbots: "Gestion de subbots",
    economia: "Sistema economico del bot",
    sistema: "Estado, update y control",
    ia: "Funciones de inteligencia artificial",
    media: "Imagen, stickers y multimedia",
    anime: "Comandos de anime",
    admin: "Comandos administrativos",
    owner: "Funciones exclusivas owner",
    vip: "Funciones premium o vip",
    otros: "Otros comandos disponibles",
  };

  const base = descriptions[key] || "Categoria del bot";
  return `${base} · ${count} comandos reales`;
}

function chunkRows(rows, size = 10) {
  const list = Array.isArray(rows) ? rows : [];
  const chunkSize = Math.max(1, Number(size || 10));
  const chunks = [];

  for (let index = 0; index < list.length; index += chunkSize) {
    chunks.push(list.slice(index, index + chunkSize));
  }

  return chunks;
}

function getCategoryHighlight(commands = [], primaryPrefix = ".") {
  const items = Array.isArray(commands) ? commands : [];
  const accessCounts = {
    PUBLICO: items.filter((item) => item.access === "PUBLICO").length,
    ADMIN: items.filter((item) => item.access === "ADMIN").length,
    OWNER: items.filter((item) => item.access === "OWNER").length,
  };

  const mainAccess =
    Object.entries(accessCounts)
      .sort((a, b) => b[1] - a[1])
      .find(([, count]) => count > 0)?.[0] || "PUBLICO";

  return {
    accessCounts,
    mainAccess,
    quick: items.slice(0, 3).map((item) => `${primaryPrefix}${item.name}`),
  };
}


const DIVIDER = "─".repeat(20);

function buildTopPanel({ settings, uptime, totalCategories, totalCommands, prefixLabel, botLine }) {
  return [
    `> ${stylizeWord("JM BOT")} — MENÚ PRINCIPAL`,
    DIVIDER,
    "",
    `> Bot: ${botLine || settings?.botName || "JM Bot"}`,
    `> Owner: ${settings?.ownerName || "Owner"}`,
    `> Prefijo: ${prefixLabel}`,
    `> Online: ${uptime}`,
    `> Categorías: ${totalCategories} · Comandos: ${totalCommands}`,
    `> Atajo: ${getPrimaryPrefix(settings)}speedtest rapido`,
  ].join("\n");
}

function buildCategoryIndex(categoryNames, categories) {
  const list = categoryNames
    .map((category, index) => {
      const icon = getCategoryIcon(category);
      const label = normalizeCategoryLabel(category);
      const count = categories[category]?.length || 0;
      const slot = String(index + 1).padStart(2, "0");
      return `> ${slot}. ${icon} ${label} (${count})`;
    })
    .join("\n");

  return [`> CATEGORÍAS`, DIVIDER, "", list].join("\n");
}

function buildCategoryBlock(category, commands, primaryPrefix) {
  const icon = getCategoryIcon(category);
  const title = normalizeCategoryLabel(category);
  const maxPreview = 6;

  const lines = [`> ${icon} ${title} — ${commands.length} comandos`, DIVIDER, ""];

  const commandLines = commands
    .slice(0, maxPreview)
    .map((item) => `> ✦ ${primaryPrefix}${item.name}`);
  lines.push(...commandLines);

  if (commands.length > maxPreview) {
    lines.push(`> … y ${commands.length - maxPreview} más`);
  }

  return lines.join("\n");
}

function buildFooter(primaryPrefix) {
  return [
    DIVIDER,
    `> ${primaryPrefix}menu <categoria> · ${primaryPrefix}status · ${primaryPrefix}menugrupo`,
  ].join("\n");
}

function makeSingleCaption(fullCaption, primaryPrefix) {
  const maxLength = 3900;

  if (fullCaption.length <= maxLength) {
    return fullCaption;
  }

  return (
    `${fullCaption.slice(0, 3800)}\n\n` +
    "> ⚠️ Menú recortado.\n" +
    `> Usa ${primaryPrefix}menu para ver lo principal.`
  );
}

async function react(sock, msg, emoji) {
  try {
    if (!msg?.key) return;

    await sock.sendMessage(msg.key.remoteJid, {
      react: {
        text: emoji,
        key: msg.key,
      },
    });
  } catch {}
}

function buildCategoryRows(categoryNames, categories, primaryPrefix) {
  return categoryNames.map((category) => {
    const icon = getCategoryIcon(category);
    const label = normalizeCategoryLabel(category);
    const items = categories[category] || [];
    const count = items.length;
    const preview = items
      .slice(0, 3)
      .map((item) => `${primaryPrefix}${item.name}`)
      .join(" • ");

    return {
      header: icon,
      title: label,
      description: `${count} cmds${preview ? ` · ${preview}` : ""}`.slice(0, 72),
      id: `${primaryPrefix}menu ${category}`,
    };
  });
}

function buildCategorySections(categoryNames, categories, primaryPrefix) {
  const rowByCategory = new Map(
    buildCategoryRows(categoryNames, categories, primaryPrefix).map((row) => [
      normalizeCategoryKey(row?.id?.replace(`${primaryPrefix}menu`, "").trim()),
      row,
    ])
  );

  const pick = (key) => rowByCategory.get(normalizeCategoryKey(key));
  const sections = [];

  const mainRows = [pick("menu"), pick("descargas"), pick("grupos")].filter(Boolean);
  if (mainRows.length) {
    sections.push({ title: "MENU PRINCIPAL", rows: mainRows });
  }

  sections.push({
    title: "ACCESOS RAPIDOS",
    rows: [
      { header: "⚡", title: "Speedtest visual", description: "Mide la red del host.", id: `${primaryPrefix}speedtest rapido` },
      { header: "📊", title: "Estado del bot", description: "Status y recursos.", id: `${primaryPrefix}status` },
      { header: "🛡️", title: "Panel de grupos", description: "Moderacion y control.", id: `${primaryPrefix}menugrupo` },
    ],
  });

  const gameRows = [pick("juegos"), pick("freefire"), pick("economia")].filter(Boolean);
  if (gameRows.length) sections.push({ title: "ENTRETENIMIENTO", rows: gameRows });

  const toolRows = [pick("ia"), pick("herramientas"), pick("media"), pick("filtros"), pick("interacciones"), pick("anime")].filter(Boolean);
  if (toolRows.length) sections.push({ title: "IA Y TOOLS", rows: toolRows });

  const adminRows = [pick("sistema"), pick("subbots"), pick("admin"), pick("owner"), pick("vip")].filter(Boolean);
  if (adminRows.length) sections.push({ title: "ADMINISTRACION", rows: adminRows });

  if (!sections.length) {
    return [{ title: "Categorias del bot", rows: buildCategoryRows(categoryNames, categories, primaryPrefix) }];
  }

  return sections;
}

function buildMenuButtons(primaryPrefix, categoryNames, categories) {
  const sections = buildCategorySections(categoryNames, categories, primaryPrefix);

  const flowButton = {
    buttonId: "menu_action_select",
    buttonText: { displayText: "ABRIR MENU" },
    type: 4,
    nativeFlowInfo: {
      name: "single_select",
      paramsJson: JSON.stringify({ title: "JM Bot", sections }),
    },
  };

  const quickButtons = [
    { buttonId: `${primaryPrefix}speedtest rapido`, buttonText: { displayText: "SPEEDTEST" }, type: 1 },
    { buttonId: `${primaryPrefix}menugrupo`, buttonText: { displayText: "GRUPOS" }, type: 1 },
  ];

  return [flowButton, ...quickButtons];
}

function buildMenuLandingText(menuContext, settings, uptime, totalCategories, totalCommands, prefixLabel, msg) {
  const invokerName = cleanText(msg?.pushName || msg?.senderPhone || msg?.sender || "usuario");
  return [
    `│ 👋 Hola, *${invokerName}*`,
    "│ Pulsa *JM Bot* para desplegar categorias.",
    "  ─────────────────",
    `│ 👤 Vista: *${menuContext.subtitle}*`,
    `│ 🧷 Prefijos: *${prefixLabel}*`,
    `│ 🤖 Bot: *${menuContext.title}*`,
    `│ 👑 Owner: *${settings?.ownerName || "Owner"}*`,
    `│ ⏱️ Runtime: *${uptime}*`,
    `│ 🗂️ Categorías: *${totalCategories}*`,
    `│ ⚙️ Comandos: *${totalCommands}*`,
    `│ ⚡ Red: *${getPrimaryPrefix(settings)}speedtest rapido*`,
    "╰─────────────────╯",
  ].join("\n");
}

function buildCategoryMenuText(category, commands, primaryPrefix, settings = {}) {
  const icon = getCategoryIcon(category);
  const label = normalizeCategoryLabel(category);
  const count = commands.length;

  const lines = [`> ${icon} ${label} — ${count} comandos`, DIVIDER, ""];

  for (const item of commands) {
    const aliasText = item.aliases?.length ? ` — alias: ${item.aliases.slice(0, 3).join(", ")}` : "";
    lines.push(`> ✦ ${primaryPrefix}${stylizeWord(item.name)} [${item.access}]`);
    lines.push(`    ${item.description || "Comando disponible del bot."}${aliasText}`);
    lines.push("");
  }

  if (lines[lines.length - 1] === "") lines.pop();

  return [lines.join("\n"), "", buildFooter(primaryPrefix)].join("\n");
}

async function sendInteractiveMenu(sock, from, quoted, payload, fallbackText) {
  try {
    return await sock.sendMessage(from, { ...payload, ...global.channelInfo }, quoted);
  } catch {
    return await sock.sendMessage(from, { text: fallbackText, ...global.channelInfo }, quoted);
  }
}

export default {
  command: ["menu", "help", "comandos", "menucat"],
  categoria: "menu",
  description: "Muestra el menú principal del bot.",

  run: async ({ sock, msg, from, settings, comandos, botId, botLabel, args = [] }) => {
    try {
      await react(sock, msg, "📜");

      if (!comandos) {
        await react(sock, msg, "❌");
        return await sock.sendMessage(
          from,
          { text: "❌ No se encontró la lista de comandos.", ...global.channelInfo },
          { quoted: msg }
        );
      }

      const imageBuffer = getMenuImageBuffer();
      const uptime = formatUptime(process.uptime());
      const primaryPrefix = getPrimaryPrefix(settings);
      const prefixLabel = getPrefixLabel(settings);
      const menuContext = getMenuContext({ settings, botId, botLabel });
      const categories = collectCommandData(comandos);
      const requestedCategory = normalizeCategoryKey(args.join(" "));

      const categoryNames = Object.keys(categories).sort((a, b) => {
        const byOrder = getCategorySortIndex(a) - getCategorySortIndex(b);
        if (byOrder !== 0) return byOrder;
        return String(a).localeCompare(String(b));
      });

      const totalCommands = categoryNames.reduce(
        (sum, category) => sum + categories[category].length,
        0
      );

      if (requestedCategory && requestedCategory !== "menu" && categories[requestedCategory]) {
        const commandList = categories[requestedCategory];
        const categoryText = buildCategoryMenuText(requestedCategory, commandList, primaryPrefix, settings);
        const categoryImageBuffer = getCategoryImageBuffer(requestedCategory);

        if (categoryImageBuffer) {
          await sock.sendMessage(
            from,
            { image: categoryImageBuffer, caption: makeSingleCaption(categoryText, primaryPrefix), ...global.channelInfo },
            { quoted: msg }
          );
        } else {
          await sock.sendMessage(
            from,
            { text: makeSingleCaption(categoryText, primaryPrefix), ...global.channelInfo },
            { quoted: msg }
          );
        }

        await react(sock, msg, "✅");
        return;
      }

      const topPanel = buildTopPanel({
        settings,
        uptime,
        totalCategories: categoryNames.length,
        totalCommands,
        prefixLabel,
        botLine: menuContext.botLine,
      });

      const textParts = [
        topPanel,
        buildCategoryIndex(categoryNames, categories),
        ...categoryNames.map((category) => buildCategoryBlock(category, categories[category], primaryPrefix)),
        buildFooter(primaryPrefix),
      ];

      const fullCaption = textParts.join("\n\n").trim();
      const finalCaption = makeSingleCaption(fullCaption, primaryPrefix);
      const landingText = buildMenuLandingText(menuContext, settings, uptime, categoryNames.length, totalCommands, prefixLabel, msg);
      const buttons = buildMenuButtons(primaryPrefix, categoryNames, categories);

      try {
        const payload = {
          buttons,
          headerType: 1,
          ...global.channelInfo,
        };

        if (imageBuffer) {
          payload.image = imageBuffer;
          payload.caption = landingText;
          payload.headerType = 4;
        } else {
          payload.text = landingText;
        }

        await sock.sendMessage(from, payload, { quoted: msg });
      } catch {
        await sendInteractiveMenu(
          sock,
          from,
          { quoted: msg },
          {
            text: landingText,
            title: menuContext.title,
            subtitle: menuContext.subtitle,
            footer: `© ${settings?.ownerName || "JM Bot"}`,
            interactiveButtons: [
              {
                name: "single_select",
                buttonParamsJson: JSON.stringify({
                  title: "SELECT MENU",
                  sections: buildCategorySections(categoryNames, categories, primaryPrefix),
                }),
              },
            ],
          },
          finalCaption
        );
      }

      await react(sock, msg, "✅");
    } catch (error) {
      console.error("MENU ERROR:", error);
      await react(sock, msg, "❌");
      await sock.sendMessage(
        from,
        { text: `❌ No se pudo mostrar el menú.\n${String(error?.message || "Error desconocido")}`, ...global.channelInfo },
        { quoted: msg }
      );
    }
  },
};
