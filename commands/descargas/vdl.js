import fsp from "fs/promises";
import path from "path";
import os from "os";
import axios from "axios";
import * as baileys from "@dvyer/baileys";
import { randomUUID } from "crypto";
import { execFile } from "child_process";
import { promisify } from "util";

const { downloadContentFromMessage } = baileys;

const execFileAsync = promisify(execFile);

const TMP_DIR = path.join(os.tmpdir(), "dvyer-vdl");
const DOWNLOAD_TIMEOUT_MS = 30 * 60 * 1000;
const MAX_DURATION_SECONDS = 3 * 60 * 60;
const AS_DOCUMENT_BYTES = 35 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const MIN_FILE_BYTES = 10 * 1024;

const PLAYLIST_FETCH_TIMEOUT_MS = 15_000;
const MAX_PLAYLIST_BYTES = 2 * 1024 * 1024;
const MAX_LIST_ITEMS_SHOWN = 100;
const LIST_TTL_MS = 15 * 60 * 1000;

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36";

const pendingLists = new Map();

function isValidUrl(value = "") {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function buildHeadersArg(referer = "", cookie = "") {
  let headers = `User-Agent: ${UA}\r\n`;
  if (referer) {
    headers += `Referer: ${referer}\r\n`;
  }
  if (cookie) {
    headers += `Cookie: ${cookie}\r\n`;
  }
  return headers;
}

function parseM3uPlaylist(text = "") {
  const lines = String(text || "").split(/\r?\n/).map((line) => line.trim());
  const items = [];
  let pendingTitle = "";

  for (const line of lines) {
    if (!line) continue;

    if (line.startsWith("#EXTINF")) {
      const commaIdx = line.indexOf(",");
      pendingTitle = commaIdx >= 0 ? line.slice(commaIdx + 1).trim() : "";
      continue;
    }

    if (line.startsWith("#")) continue;

    items.push({
      title: pendingTitle || `Item ${items.length + 1}`,
      url: line,
    });
    pendingTitle = "";
  }

  return items;
}

function setPendingList(chatId, items) {
  pendingLists.set(chatId, { items, expiresAt: Date.now() + LIST_TTL_MS });
}

function getPendingList(chatId) {
  const entry = pendingLists.get(chatId);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    pendingLists.delete(chatId);
    return null;
  }
  return entry.items;
}

async function ensureDir() {
  await fsp.mkdir(TMP_DIR, { recursive: true }).catch(() => {});
}

async function deleteSafe(filePath) {
  if (!filePath) return;
  await fsp.unlink(filePath).catch(() => {});
}

async function tryDownload(url, referer, cookie, outputPath, extraArgs = []) {
  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-headers",
      buildHeadersArg(referer, cookie),
      "-t",
      String(MAX_DURATION_SECONDS),
      "-i",
      url,
      ...extraArgs,
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { timeout: DOWNLOAD_TIMEOUT_MS }
  );
}

function sanitizeFileName(name = "") {
  const cleaned = String(name || "").replace(/[\\/:*?"<>|]/g, "_").trim();
  return cleaned || "video";
}

function ensureMp4Extension(name = "video") {
  const safe = sanitizeFileName(name);
  if (/\.(mp4|m4v)$/i.test(safe)) return safe;
  return safe.replace(/\.[a-z0-9]{1,5}$/i, "") + ".mp4";
}

async function resolveFileName(url, referer = "", cookie = "") {
  try {
    const response = await axios.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    const disposition = response.headers?.["content-disposition"];
    if (disposition) {
      const match = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      if (match?.[1]) {
        return ensureMp4Extension(decodeURIComponent(match[1]));
      }
    }
  } catch {}

  try {
    const parsed = new URL(url);
    const last = decodeURIComponent(
      parsed.pathname.split("/").filter(Boolean).pop() || ""
    );
    if (last) return ensureMp4Extension(last);
  } catch {}

  return "video.mp4";
}

function unwrapMessage(message = {}) {
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

async function resolveAttachedImage(msg) {
  try {
    const ownMessage = unwrapMessage(msg?.message || {});
    const quotedMessage = unwrapMessage(msg?.quoted?.message || {});
    const imageMessage = ownMessage?.imageMessage || quotedMessage?.imageMessage;
    if (!imageMessage) return null;

    const stream = await downloadContentFromMessage(imageMessage, "image");
    return await streamToBuffer(stream);
  } catch {
    return null;
  }
}

async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "", attachedImage = null) {
  await ensureDir();
  const id = randomUUID();
  const outputPath = path.join(TMP_DIR, `${id}.mp4`);

  await sock.sendMessage(
    from,
    { text: "⏳ Descargando, puede tardar unos minutos...", ...global.channelInfo },
    quoted
  );

  try {
    await tryDownload(url, referer, cookie, outputPath, ["-c", "copy", "-bsf:a", "aac_adtstoasc"]);
  } catch {
    await deleteSafe(outputPath);

    try {
      await tryDownload(url, referer, cookie, outputPath, [
        "-c:v",
        "libx264",
        "-preset",
        "veryfast",
        "-c:a",
        "aac",
      ]);
    } catch {
      await deleteSafe(outputPath);
      return sock.sendMessage(
        from,
        {
          text:
            "❌ No pude descargar ese enlace. Si el servidor requiere un origen específico, " +
            "intenta: .vdl <link> <referer>",
          ...global.channelInfo,
        },
        quoted
      );
    }
  }

  const stat = await fsp.stat(outputPath).catch(() => null);

  if (!stat?.size || stat.size < MIN_FILE_BYTES) {
    await deleteSafe(outputPath);
    return sock.sendMessage(
      from,
      { text: "❌ El archivo descargado quedó vacío o inválido.", ...global.channelInfo },
      quoted
    );
  }

  if (stat.size > MAX_FILE_BYTES) {
    await deleteSafe(outputPath);
    return sock.sendMessage(
      from,
      { text: "❌ El video es demasiado grande para enviarlo (límite 500MB).", ...global.channelInfo },
      quoted
    );
  }

  try {
    const asDocument = stat.size > AS_DOCUMENT_BYTES;
    const fileName = customName
      ? ensureMp4Extension(customName)
      : await resolveFileName(url, referer, cookie);

    const payload = asDocument
      ? {
          document: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        }
      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        };

    await sock.sendMessage(from, payload, quoted);

    if (attachedImage) {
      try {
        await sock.sendMessage(from, {
          image: attachedImage,
          ...global.channelInfo,
        });
      } catch {}
    }
  } finally {
    await deleteSafe(outputPath);
  }
}

async function handleList(sock, from, quoted, playlistUrl) {
  let text = "";

  try {
    const response = await axios.get(playlistUrl, {
      timeout: PLAYLIST_FETCH_TIMEOUT_MS,
      maxContentLength: MAX_PLAYLIST_BYTES,
      responseType: "text",
      headers: { "User-Agent": UA },
    });
    text = String(response.data || "");
  } catch {
    return sock.sendMessage(
      from,
      { text: "❌ No pude cargar esa lista. Verifica que el enlace sea correcto y accesible.", ...global.channelInfo },
      quoted
    );
  }

  const items = parseM3uPlaylist(text);

  if (!items.length) {
    return sock.sendMessage(
      from,
      { text: "❌ No encontré videos dentro de esa lista.", ...global.channelInfo },
      quoted
    );
  }

  setPendingList(from, items);

  const shown = items.slice(0, MAX_LIST_ITEMS_SHOWN);
  const lines = shown.map((item, index) => `${index + 1}. ${item.title}`);
  const extraNote =
    items.length > MAX_LIST_ITEMS_SHOWN
      ? `\n\n(Mostrando los primeros ${MAX_LIST_ITEMS_SHOWN} de ${items.length})`
      : "";

  return sock.sendMessage(
    from,
    {
      text:
        `📋 *Lista cargada* (${items.length} items)\n\n` +
        lines.join("\n") +
        extraNote +
        `\n\nResponde con *.vdl <numero>* para descargar uno.`,
      ...global.channelInfo,
    },
    quoted
  );
}

export default {
  command: ["vdl", "webdl", "dlvideo"],
  category: "descargas",
  description: "Descarga video desde cualquier link directo (mp4, m3u8, etc) o carga una lista",

  async run({ sock, msg, from, args = [] }) {
    const quoted = msg?.key ? { quoted: msg } : undefined;
    const first = String(args[0] || "").trim();

    if (!first) {
      return sock.sendMessage(
        from,
        {
          text:
            "Uso:\n" +
            "• .vdl <link directo> — descarga (mp4, m3u8, etc)\n" +
            "• .vdl <link> <referer> — si el servidor exige el origen de la página\n" +
            "• .vdl lista <link de playlist .m3u/.m3u8> — carga una lista\n" +
            "• .vdl <numero> — descarga el item elegido de la última lista",
          ...global.channelInfo,
        },
        quoted
      );
    }

    if (first.toLowerCase() === "lista" || first.toLowerCase() === "list") {
      const playlistUrl = String(args[1] || "").trim();
      if (!playlistUrl || !isValidUrl(playlistUrl)) {
        return sock.sendMessage(
          from,
          { text: "Uso: .vdl lista <enlace de la playlist>", ...global.channelInfo },
          quoted
        );
      }
      return handleList(sock, from, quoted, playlistUrl);
    }

    if (/^\d+$/.test(first)) {
      const items = getPendingList(from);
      if (!items) {
        return sock.sendMessage(
          from,
          {
            text: "No hay ninguna lista activa. Primero usa: .vdl lista <enlace>",
            ...global.channelInfo,
          },
          quoted
        );
      }

      const index = parseInt(first, 10) - 1;
      const selected = items[index];

      if (!selected) {
        return sock.sendMessage(
          from,
          { text: `Ese número no existe en la lista (1-${items.length}).`, ...global.channelInfo },
          quoted
        );
      }

      return downloadAndSendVideo(sock, from, quoted, selected.url);
    }

    if (!isValidUrl(first)) {
      return sock.sendMessage(
        from,
        { text: "Ese enlace no es válido.", ...global.channelInfo },
        quoted
      );
    }

    const nameMarkerIndex = args.findIndex((a) => /^nombre:/i.test(a));
    const hasNameMarker = nameMarkerIndex >= 0;
    const customName = hasNameMarker
      ? args
          .slice(nameMarkerIndex)
          .join(" ")
          .replace(/^nombre:/i, "")
          .trim()
      : "";
    const restArgs = hasNameMarker ? args.slice(0, nameMarkerIndex) : args;

    const referer = String(restArgs[1] || "").trim();
    const cookie = String(restArgs.slice(2).join(" ") || "").trim();
    const attachedImage = await resolveAttachedImage(msg);
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName, attachedImage);
  },
};
