const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldImports = `import fsp from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";`;

const newImports = `import fsp from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import * as baileys from "@dvyer/baileys";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const { downloadContentFromMessage } = baileys;`;

if (!content.includes(oldImports)) {
  console.error("❌ No se encontraron los imports originales.");
  process.exit(1);
}
content = content.replace(oldImports, newImports);

const anchor = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "") {`;

const helperFns = `function unwrapMessage(message = {}) {
  let current = message;

  while (current?.ephemeralMessage?.message) {
    current = current.ephemeralMessage.message;
  }

  while (current?.viewOnceMessage?.message) {
    current = current.viewOnceMessage.message;
  }

  return current;
}

async function streamToBuffer(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function resolveQuotedThumbnail(msg) {
  try {
    const quotedMessage = unwrapMessage(msg?.quoted?.message || {});
    const imageMessage = quotedMessage?.imageMessage;
    if (!imageMessage) return null;

    const stream = await downloadContentFromMessage(imageMessage, "image");
    return await streamToBuffer(stream);
  } catch {
    return null;
  }
}

${anchor}`;

if (!content.includes(anchor)) {
  console.error("❌ No se encontró downloadAndSendVideo para insertar los helpers.");
  process.exit(1);
}
content = content.replace(anchor, helperFns);

const oldSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "") {`;
const newSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "", thumbnail = null) {`;

if (!content.includes(oldSig)) {
  console.error("❌ No se encontró la firma de downloadAndSendVideo.");
  process.exit(1);
}
content = content.replace(oldSig, newSig);

const oldPayload = `      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        };`;

const newPayload = `      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          jpegThumbnail: thumbnail || undefined,
          ...global.channelInfo,
        };`;

if (!content.includes(oldPayload)) {
  console.error("❌ No se encontró el payload de video.");
  process.exit(1);
}
content = content.replace(oldPayload, newPayload);

const oldRunCall = `    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName);`;
const newRunCall = `    const thumbnail = await resolveQuotedThumbnail(msg);
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName, thumbnail);`;

if (!content.includes(oldRunCall)) {
  console.error("❌ No se encontró la llamada final en run().");
  process.exit(1);
}
content = content.replace(oldRunCall, newRunCall);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: ahora puedes responder a una imagen junto con .vdl para usarla como miniatura del video.");
