import fs from "fs";
import path from "path";
import pino from "pino";
import { downloadMediaMessage } from "@dvyer/baileys";
import {
  findGroupParticipant,
  getParticipantDisplayTag,
  getParticipantMentionJid,
} from "../../lib/group-compat.js";
import { consumeModerationDelete } from "../../lib/moderation-delete.js";

const logger = pino({ level: "silent" });

const DB_DIR = path.join(process.cwd(), "database");
const FILE = path.join(DB_DIR, "antidelete.json");

// Limite de tamaño para reenviar archivos borrados (ajustable)
const MAX_MEDIA_BYTES = 8 * 1024 * 1024; // 8 MB

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

function readStore() {
  try {
    if (!fs.existsSync(FILE)) return {};
    const parsed = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function saveStore(store) {
  fs.writeFileSync(FILE, JSON.stringify(store, null, 2));
}

function isEnabled(groupId) {
  const store = readStore();
  return store[String(groupId || "")] === true;
}

function getTextFromDeletedMessage(message) {
  if (!message) return "";

  return String(
    message?.text ||
      message?.body ||
      message?.message?.conversation ||
      message?.message?.extendedTextMessage?.text ||
      message?.message?.imageMessage?.caption ||
      message?.message?.videoMessage?.caption ||
      ""
  ).trim();
}

function getMediaInfo(message) {
  const m = message?.message || {};
  if (m.imageMessage) return { type: "imagen", node: m.imageMessage, kind: "image" };
  if (m.videoMessage) return { type: "video", node: m.videoMessage, kind: "video" };
  if (m.audioMessage) return { type: "audio", node: m.audioMessage, kind: "audio" };
  if (m.documentMessage) return { type: "documento", node: m.documentMessage, kind: "document" };
  if (m.stickerMessage) return { type: "sticker", node: m.stickerMessage, kind: "sticker" };
  return null;
}

function getFileLength(node) {
  try {
    const raw = node?.fileLength;
    if (raw == null) return 0;
    if (typeof raw === "number") return raw;
    if (typeof raw === "string") return Number(raw) || 0;
    if (typeof raw.toNumber === "function") return raw.toNumber();
    return Number(raw) || 0;
  } catch {
    return 0;
  }
}

function formatBytes(bytes = 0) {
  if (!bytes) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let i = 0;
  let val = bytes;
  while (val >= 1024 && i < units.length - 1) {
    val /= 1024;
    i++;
  }
  return `${val.toFixed(1)} ${units[i]}`;
}

export default {
  name: "antidelete",
  command: ["antidelete"],
  category: "grupo",
  groupOnly: true,
  adminOnly: true,
  description: "Reenvia mensajes borrados en grupos (texto y archivos pequeños)",

  async run({ sock, msg, from, args = [] }) {
    const quoted = msg?.key ? { quoted: msg } : undefined;
    const store = readStore();
    const action = String(args[0] || "status").trim().toLowerCase();

    if (!args.length || action === "status") {
      return sock.sendMessage(
        from,
        {
          text:
            `*ANTIDELETE*\n\n` +
            `Estado: *${store[from] === true ? "ON" : "OFF"}*\n` +
            `Limite de reenvio: *${formatBytes(MAX_MEDIA_BYTES)}*\n\n` +
            `.antidelete on\n` +
            `.antidelete off`,
          ...global.channelInfo,
        },
        quoted
      );
    }

    if (action === "on") {
      store[from] = true;
      saveStore(store);
      return sock.sendMessage(
        from,
        { text: "Antidelete activado para este grupo.", ...global.channelInfo },
        quoted
      );
    }

    if (action === "off") {
      delete store[from];
      saveStore(store);
      return sock.sendMessage(
        from,
        { text: "Antidelete desactivado para este grupo.", ...global.channelInfo },
        quoted
      );
    }

    return sock.sendMessage(
      from,
      { text: "Usa .antidelete on o .antidelete off", ...global.channelInfo },
      quoted
    );
  },

  async onMessageDelete({ sock, from, isGroup, deleteKey, deletedMessage }) {
    if (!isGroup) return;
    if (consumeModerationDelete(from, deleteKey)) return;
    if (!isEnabled(from)) return;
    if (!deleteKey) return;

    const sender =
      deleteKey.participant ||
      deletedMessage?.sender ||
      deletedMessage?.senderLid ||
      deletedMessage?.senderPhone ||
      deleteKey.remoteJid ||
      "";
    let metadata = null;
    try {
      metadata = await sock.groupMetadata(from);
    } catch {}
    const participant = findGroupParticipant(metadata || {}, [sender]);
    const mentionJid = getParticipantMentionJid(metadata || {}, participant, sender);
    const userTag = getParticipantDisplayTag(participant, sender);
    const recoveredText = getTextFromDeletedMessage(deletedMessage);
    const mentions = mentionJid ? [mentionJid] : [];

    let body =
      `*ANTIDELETE*\n\n` +
      `Usuario: ${userTag}\n` +
      `Accion: elimino un mensaje`;

    // ── Caso 1: era texto ──
    if (recoveredText) {
      body += `\n\nContenido recuperado:\n${recoveredText}`;
      return sock.sendMessage(from, { text: body, mentions });
    }

    const mediaInfo = getMediaInfo(deletedMessage);

    // ── Caso 2: sin texto ni media reconocida ──
    if (!mediaInfo) {
      body += `\n\nNo pude recuperar el contenido exacto.`;
      return sock.sendMessage(from, { text: body, mentions });
    }

    const size = getFileLength(mediaInfo.node);
    body += `\n\nTipo: ${mediaInfo.type}${size ? ` (${formatBytes(size)})` : ""}`;

    // ── Caso 3: media demasiado pesada, no se reenvía ──
    if (size && size > MAX_MEDIA_BYTES) {
      body += `\n⚠️ Muy pesado para reenviar (limite ${formatBytes(MAX_MEDIA_BYTES)}).`;
      return sock.sendMessage(from, { text: body, mentions });
    }

    // ── Caso 4: intenta descargar y reenviar el archivo real ──
    try {
      const buffer = await downloadMediaMessage(
        { key: deleteKey, message: deletedMessage?.message },
        "buffer",
        {},
        { logger, reuploadRequest: sock.updateMediaMessage }
      );

      if (mediaInfo.kind === "image") {
        await sock.sendMessage(from, { image: buffer, caption: body, mentions });
      } else if (mediaInfo.kind === "video") {
        await sock.sendMessage(from, {
          video: buffer,
          caption: body,
          mentions,
          mimetype: mediaInfo.node.mimetype || "video/mp4",
        });
      } else if (mediaInfo.kind === "audio") {
        await sock.sendMessage(from, { text: body, mentions });
        await sock.sendMessage(from, {
          audio: buffer,
          mimetype: mediaInfo.node.mimetype || "audio/mpeg",
          ptt: Boolean(mediaInfo.node.ptt),
        });
      } else if (mediaInfo.kind === "document") {
        await sock.sendMessage(from, {
          document: buffer,
          mimetype: mediaInfo.node.mimetype || "application/octet-stream",
          fileName: mediaInfo.node.fileName || "archivo",
          caption: body,
          mentions,
        });
      } else if (mediaInfo.kind === "sticker") {
        await sock.sendMessage(from, { text: body, mentions });
        await sock.sendMessage(from, { sticker: buffer });
      }
    } catch (err) {
      body += `\n⚠️ No pude recuperar el archivo (${err?.message || "error desconocido"}).`;
      await sock.sendMessage(from, { text: body, mentions });
    }
  },
};
