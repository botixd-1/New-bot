import fs from "fs";
import path from "path";
import axios from "axios";
import FormData from "form-data";
import pino from "pino";
import { downloadMediaMessage } from "@dvyer/baileys";

const logger = pino({ level: "silent" });
const TMP_DIR = path.join(process.cwd(), "tmp");

const EVOGB_API_KEY = "evogb-xu5xP352";
const EVOGB_FILTERS_URL = "https://api.evogb.org/generate/filters";
const EVOGB_UPLOAD_URL = "https://evogb.win/api/upload";

// ── Alias del comando -> nombre real del filtro en la API ──
// Para agregar un filtro nuevo, solo añade una línea aquí.
const FILTER_ALIASES = {
  blur: "blur",
  pixelate: "pixelate",
  pixel: "pixelate",
  gay: "gay",
  glitch: "glitch",
  wave: "wave",
  sticker: "sticker",
  gris: "greyscale",
  grises: "greyscale",
  greyscale: "greyscale",
  invert: "invert",
  invertir: "invert",
  sepia: "sepia",
};

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function randName(ext) {
  return `${Date.now()}_${Math.floor(Math.random() * 99999)}.${ext}`;
}

function buildQuotedWAMessage(msg) {
  const ctx = msg.message?.extendedTextMessage?.contextInfo;
  const quoted = ctx?.quotedMessage;
  if (!quoted) return null;

  return {
    key: {
      remoteJid: msg.key.remoteJid,
      fromMe: false,
      id: ctx.stanzaId,
      participant: ctx.participant,
    },
    message: quoted,
  };
}

function deleteFileSafe(fp) {
  try {
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {}
}

// ── Sube el buffer al CDN de Evogb para obtener una URL pública ──
async function uploadToEvogbCdn(buffer, fileName) {
  const form = new FormData();
  form.append("file", buffer, { filename: fileName });
  form.append("expireValue", "10");
  form.append("expireUnit", "min");

  const { data } = await axios.post(EVOGB_UPLOAD_URL, form, {
    headers: form.getHeaders(),
    timeout: 60000,
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
  });

  if (!data?.success || !data?.url) {
    throw new Error("No se pudo subir la imagen al servidor temporal.");
  }

  return data.url;
}

// ── Pide la imagen filtrada a la API de Evogb ──
async function requestFilteredImage(imageUrl, filterName) {
  const response = await axios.get(EVOGB_FILTERS_URL, {
    params: {
      key: EVOGB_API_KEY,
      method: "url",
      url: imageUrl,
      filterType: filterName,
      level: 10,
      pixelSize: 10,
      amplitude: 10,
      frequency: 10,
      intensity: 10,
      borderSize: 10,
    },
    responseType: "arraybuffer",
    timeout: 60000,
    validateStatus: () => true,
  });

  const contentType = String(response.headers?.["content-type"] || "");

  if (!contentType.startsWith("image/")) {
    let detail = "";
    try {
      detail = JSON.parse(Buffer.from(response.data).toString("utf8"))?.message || "";
    } catch {}
    throw new Error(detail || "No se pudo aplicar el filtro a la imagen.");
  }

  return Buffer.from(response.data);
}

export default {
  command: Object.keys(FILTER_ALIASES),
  category: "media",
  description: "Aplica un filtro (blur, pixelate, gay, glitch, wave, sticker, gris, invertir, sepia) a una imagen",

  run: async ({ sock, msg, from, commandName }) => {
    let tempInPath = null;

    try {
      ensureTmp();

      const filterName = FILTER_ALIASES[String(commandName || "").toLowerCase()];
      if (!filterName) {
        return sock.sendMessage(
          from,
          { text: "❌ Filtro no reconocido.", ...global.channelInfo },
          { quoted: msg }
        );
      }

      const quotedMsg = buildQuotedWAMessage(msg);
      const targetMsg = quotedMsg || msg;

      const hasImage =
        !!targetMsg.message?.imageMessage ||
        !!targetMsg.message?.extendedTextMessage?.contextInfo?.quotedMessage?.imageMessage;

      if (!hasImage) {
        return sock.sendMessage(
          from,
          {
            text: `⚙️ Responde a una *imagen* con .${commandName} para aplicar el filtro.`,
            ...global.channelInfo,
          },
          { quoted: msg }
        );
      }

      await sock.sendMessage(
        from,
        { text: `🎨 Aplicando filtro *${filterName}*...`, ...global.channelInfo },
        { quoted: msg }
      );

      const buff = await downloadMediaMessage(
        targetMsg,
        "buffer",
        {},
        { logger, reuploadRequest: sock.updateMediaMessage }
      );

      tempInPath = path.join(TMP_DIR, randName("jpg"));
      fs.writeFileSync(tempInPath, buff);

      const publicUrl = await uploadToEvogbCdn(buff, path.basename(tempInPath));
      const filteredBuffer = await requestFilteredImage(publicUrl, filterName);

      return sock.sendMessage(
        from,
        {
          image: filteredBuffer,
          caption: `✅ Filtro: *${filterName}*`,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error("FILTERS ERROR:", error?.message || error);

      return sock.sendMessage(
        from,
        {
          text: `❌ No se pudo aplicar el filtro.\n💡 ${error?.message || "Error inesperado"}`,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    } finally {
      deleteFileSafe(tempInPath);
    }
  },
};
