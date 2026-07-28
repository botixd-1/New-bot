const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldImports = `import fsp from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import * as baileys from "@dvyer/baileys";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const { downloadContentFromMessage } = baileys;`;

const newImports = `import fsp from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import * as baileys from "@dvyer/baileys";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";
import { createScheduledJsonStore } from "../../lib/json-store.js";

const { downloadContentFromMessage } = baileys;

const savedListsFile = path.join(process.cwd(), "database", "vdl-saved-lists.json");
const savedListsStore = createScheduledJsonStore(savedListsFile, () => ({ chats: {} }));

function getSavedListUrl(chatId) {
  return savedListsStore.state.chats?.[chatId] || "";
}

function setSavedListUrl(chatId, url) {
  if (!savedListsStore.state.chats) savedListsStore.state.chats = {};
  savedListsStore.state.chats[chatId] = url;
  savedListsStore.scheduleSave();
}`;

if (!content.includes(oldImports)) {
  console.error("❌ No se encontraron los imports originales.");
  process.exit(1);
}
content = content.replace(oldImports, newImports);

const oldListBlock = `    if (first.toLowerCase() === "lista" || first.toLowerCase() === "list") {
      const playlistUrl = String(args[1] || "").trim();
      if (!playlistUrl || !isValidUrl(playlistUrl)) {
        return sock.sendMessage(
          from,
          { text: "Uso: .vdl lista <enlace de la playlist>", ...global.channelInfo },
          quoted
        );
      }
      return handleList(sock, from, quoted, playlistUrl);
    }`;

const newListBlock = `    if (first.toLowerCase() === "lista" || first.toLowerCase() === "list") {
      const givenUrl = String(args[1] || "").trim();

      if (givenUrl) {
        if (!isValidUrl(givenUrl)) {
          return sock.sendMessage(
            from,
            { text: "Uso: .vdl lista <enlace de la playlist>", ...global.channelInfo },
            quoted
          );
        }
        setSavedListUrl(from, givenUrl);
        return handleList(sock, from, quoted, givenUrl);
      }

      const savedUrl = getSavedListUrl(from);
      if (!savedUrl) {
        return sock.sendMessage(
          from,
          {
            text:
              "No hay ninguna lista guardada en este chat.\\n" +
              "Usa: .vdl lista <enlace> (la próxima vez solo con .vdl lista basta).",
            ...global.channelInfo,
          },
          quoted
        );
      }
      return handleList(sock, from, quoted, savedUrl);
    }

    if (first.toLowerCase() === "setlista") {
      const newUrl = String(args[1] || "").trim();
      if (!newUrl || !isValidUrl(newUrl)) {
        return sock.sendMessage(
          from,
          { text: "Uso: .vdl setlista <enlace de la playlist>", ...global.channelInfo },
          quoted
        );
      }
      setSavedListUrl(from, newUrl);
      return sock.sendMessage(
        from,
        { text: "✅ Lista guardada para este chat. Ahora puedes usar: .vdl lista", ...global.channelInfo },
        quoted
      );
    }`;

if (!content.includes(oldListBlock)) {
  console.error("❌ No se encontró el bloque de modo lista.");
  process.exit(1);
}
content = content.replace(oldListBlock, newListBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: ahora puedes usar .vdl lista (sin link) y guardar con .vdl setlista <link>.");
