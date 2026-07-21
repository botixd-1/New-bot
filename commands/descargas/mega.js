import fs from "fs";
import path from "path";
import os from "os";
import { File } from "megajs";
import { chargeDownloadRequest, refundDownloadCharge } from "../economia/download-access.js";
import { sanitizeProviderMessage } from "./_errorMessages.js";
import { buildDownloadCard, buildUsageCard } from "./_downloadUi.js";

const COOLDOWN_TIME = 0;
const MAX_FILE_BYTES = 2 * 1024 * 1024 * 1024;
const TMP_DIR = path.join(os.tmpdir(), "dvyer-mega");

const cooldowns = new Map();

if (!fs.existsSync(TMP_DIR)) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
}

function safeFileName(name) {
  return (
    String(name || "mega-file")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 140) || "mega-file"
  );
}

function normalizeFileName(name, fallback = "mega-file") {
  const raw = String(name || "").trim();
  const extMatch = raw.match(/(\.[a-z0-9]{1,10})$/i);
  const ext = extMatch ? extMatch[1] : "";
  const base = safeFileName(raw.replace(/\.[^.]+$/i, "") || fallback);
  return `${base}${ext}`;
}

function mimeFromFileName(fileName) {
  const lower = String(fileName || "").toLowerCase();
  if (lower.endsWith(".apk")) return "application/vnd.android.package-archive";
  if (lower.endsWith(".xapk")) return "application/xapk-package-archive";
  if (lower.endsWith(".mp3")) return "audio/mpeg";
  if (lower.endsWith(".mp4")) return "video/mp4";
  if (lower.endsWith(".zip")) return "application/zip";
  if (lower.endsWith(".rar")) return "application/vnd.rar";
  if (lower.endsWith(".7z")) return "application/x-7z-compressed";
  if (lower.endsWith(".txt")) return "text/plain";
  if (lower.endsWith(".pdf")) return "application/pdf";
  if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
  if (lower.endsWith(".png")) return "image/png";
  if (lower.endsWith(".bin")) return "application/octet-stream";
  return "application/octet-stream";
}

function getCooldownRemaining(untilMs) {
  return Math.max(0, Math.ceil((untilMs - Date.now()) / 1000));
}

function extractTextFromMessage(message) {
  return (
    message?.text ||
    message?.caption ||
    message?.body ||
    message?.message?.conversation ||
    message?.message?.extendedTextMessage?.text ||
    message?.message?.imageMessage?.caption ||
    message?.message?.videoMessage?.caption ||
    message?.message?.documentMessage?.caption ||
    message?.conversation ||
    message?.extendedTextMessage?.text ||
    message?.imageMessage?.caption ||
    message?.videoMessage?.caption ||
    message?.documentMessage?.caption ||
    ""
  );
}

function getQuotedMessage(ctx, msg) {
  return (
    ctx?.quoted ||
    msg?.quoted ||
    msg?.message?.extendedTextMessage?.contextInfo?.quotedMessage ||
    null
  );
}

function resolveUserInput(ctx) {
  const msg = ctx.m || ctx.msg || null;
  const argsText = Array.isArray(ctx.args) ? ctx.args.join(" ").trim() : "";
  const quotedMessage = getQuotedMessage(ctx, msg);
  const quotedText = extractTextFromMessage(quotedMessage);
  return argsText || quotedText || "";
}

function extractMegaUrl(text) {
  const match = String(text || "").match(
    /https?:\/\/(?:www\.)?(?:mega\.nz|mega\.co\.nz)\/[^\s]+/i
  );
  return match ? match[0].trim() : "";
}

function deleteFileSafe(filePath) {
  try {
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {}
}

function humanBytes(bytes) {
  const size = Number(bytes || 0);
  if (!size || size < 1) return null;

  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = size;
  let index = 0;

  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }

  return `${value >= 100 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
}

async function requestMegaMeta(fileUrl) {
  const file = File.fromURL(fileUrl);
  file.api.userAgent =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122 Safari/537.36";

  await file.loadAttributes();

  if (file?.directory || file?.children) {
    throw new Error("Ese enlace es una carpeta, no un archivo. Envía el link directo de un archivo.");
  }

  const rawName = file.name || `mega-${Date.now()}`;

  return {
    file,
    title: safeFileName(rawName),
    fileName: normalizeFileName(rawName),
    fileSizeBytes: Number(file.size || 0) || null,
    fileSize: humanBytes(file.size || 0),
  };
}

async function downloadMegaFile(file, outputPath) {
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  if (file.size && file.size > MAX_FILE_BYTES) {
    throw new Error("El archivo es demasiado grande para enviarlo por WhatsApp.");
  }

  await new Promise((resolve, reject) => {
    let downloaded = 0;
    const stream = file.download();
    const writer = fs.createWriteStream(outputPath);

    stream.on("data", (chunk) => {
      downloaded += chunk.length;
      if (downloaded > MAX_FILE_BYTES) {
        stream.destroy(new Error("El archivo es demasiado grande para enviarlo por WhatsApp."));
      }
    });

    stream.on("error", (err) => {
      writer.destroy();
      reject(err);
    });
    writer.on("error", reject);
    writer.on("finish", resolve);

    stream.pipe(writer);
  }).catch((error) => {
    deleteFileSafe(outputPath);
    throw error;
  });

  if (!fs.existsSync(outputPath)) {
    throw new Error("No se pudo guardar el archivo.");
  }

  const size = fs.statSync(outputPath).size;
  if (!size || size < 1) {
    deleteFileSafe(outputPath);
    throw new Error("El archivo descargado es invalido.");
  }

  if (size > MAX_FILE_BYTES) {
    deleteFileSafe(outputPath);
    throw new Error("El archivo es demasiado grande para enviarlo por WhatsApp.");
  }

  return {
    tempPath: outputPath,
    size,
  };
}

async function sendMegaDocument(sock, from, quoted, payload) {
  const { filePath, fileName, title, fileSize, fileSizeBytes, size } = payload;
  const lines = ["MEGA (descarga directa)", "", `Archivo: ${title}`];
  if (fileSize) {
    lines.push(`Tamano: ${fileSize}`);
  } else {
    const prettySize = humanBytes(fileSizeBytes || size);
    if (prettySize) lines.push(`Tamano: ${prettySize}`);
  }

  await sock.sendMessage(
    from,
    {
      document: { url: filePath },
      mimetype: mimeFromFileName(fileName),
      fileName,
      caption: lines.join("\n"),
      ...global.channelInfo,
    },
    quoted
  );
}

export default {
  command: ["mega", "megadl"],
  category: "descarga",

  run: async (ctx) => {
    const { sock, from } = ctx;
    const msg = ctx.m || ctx.msg || null;
    const quoted = msg?.key ? { quoted: msg } : undefined;
    const userId = `${from}:mega`;

    let tempPath = null;
    let downloadCharge = null;

    if (COOLDOWN_TIME > 0) {
      const until = cooldowns.get(userId);
      if (until && until > Date.now()) {
        return sock.sendMessage(from, {
          text: buildDownloadCard("⏳ *MEGA*", [
            { lines: [`Espera ${getCooldownRemaining(until)}s para volver a usar este comando.`] },
          ]),
          ...global.channelInfo,
        });
      }

      cooldowns.set(userId, Date.now() + COOLDOWN_TIME);
    }

    try {
      const rawInput = resolveUserInput(ctx);
      const fileUrl = extractMegaUrl(rawInput);

      if (!fileUrl) {
        cooldowns.delete(userId);
        return sock.sendMessage(
          from,
          {
            text: buildUsageCard({
              title: "☁️ *MEGA*",
              summary: [
                "Descarga archivos públicos de MEGA.",
                "Por ahora solo sirve para enlaces de archivo, no carpetas.",
              ],
              examples: [
                ".mega <link público de MEGA>",
                "También puedes responder a un mensaje que tenga el link.",
              ],
            }),
            ...global.channelInfo,
          },
          quoted
        );
      }

      downloadCharge = await chargeDownloadRequest(ctx, {
        feature: "mega",
        fileUrl,
      });
      if (!downloadCharge.ok) {
        cooldowns.delete(userId);
        return;
      }

      await sock.sendMessage(
        from,
        {
          text: buildDownloadCard("☁️ *MEGA*", [
            {
              lines: ["Preparando archivo para descarga directa de MEGA..."],
            },
          ]),
          ...global.channelInfo,
        },
        quoted
      );

      const info = await requestMegaMeta(fileUrl);
      tempPath = path.join(TMP_DIR, `${Date.now()}-${info.fileName}`);

      const downloaded = await downloadMegaFile(info.file, tempPath);

      await sendMegaDocument(sock, from, quoted, {
        filePath: downloaded.tempPath,
        fileName: info.fileName,
        title: info.title,
        fileSize: info.fileSize,
        fileSizeBytes: info.fileSizeBytes,
        size: downloaded.size,
      });
    } catch (error) {
      console.error("MEGA ERROR:", error?.message || error);
      refundDownloadCharge(ctx, downloadCharge, {
        feature: "mega",
        error: String(error?.message || error || "unknown_error"),
      });
      cooldowns.delete(userId);

      const rawMsg = String(error?.message || "");
      const isQuota = /quota|limit|over ?bandwidth|EOVERQUOTA/i.test(rawMsg);

      await sock.sendMessage(
        from,
        {
          text: buildDownloadCard("❌ *MEGA*", [
            {
              lines: [
                isQuota
                  ? "MEGA limitó la descarga por cuota de ancho de banda de la IP del servidor. Intenta más tarde."
                  : sanitizeProviderMessage(error, {
                      kind: "file",
                      fallback: "No se pudo procesar el archivo de MEGA.",
                    }),
              ],
            },
          ]),
          ...global.channelInfo,
        },
        quoted
      );
    } finally {
      deleteFileSafe(tempPath);
    }
  },
};
