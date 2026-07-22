import fs from "fs";
import path from "path";
import pino from "pino";
import { downloadMediaMessage } from "@dvyer/baileys";

const logger = pino({ level: "silent" });
const IMAGE_DIR = path.join(process.cwd(), "imagenes");

// ── Alias del comando -> nombre real del archivo que se guarda ──
// Para agregar una imagen nueva, solo añade una línea aquí.
const IMAGE_TARGETS = {
  menu: "menu.png",
  grupos: "menu-grupo.png",
  grupo: "menu-grupo.png",
  sistema: "menu-sistema.png",
  herramientas: "menu-sistema.png",
  descargas: "menu-descarga.png",
  descarga: "menu-descarga.png",
  generador: "menu-generador.png",
  streaming: "menu-generador.png",
  juegos: "juegos.png",
  subbotcodigo: "subbotcodigo.png",
  qr: "subbotcodigo.png",
  subbotsactivos: "subbotsactivos.png",
  subbots: "subbotsactivos.png",
  staff: "staff-soporte.png",
  soporte: "staff-soporte.png",
  comunidad: "comunidad.png",
  topdolares: "topdolares.png",
  ranking: "topdolares.png",
  banco: "banco.png",
  busqueda: "busqueda-cover.png",
  ttsearch: "busqueda-cover.png",
};

// ── Extensiones viejas a limpiar cuando se reemplaza una imagen ──
const OLD_EXTENSIONS = [".jpg", ".jpeg", ".webp"];

function ensureImageDir() {
  if (!fs.existsSync(IMAGE_DIR)) fs.mkdirSync(IMAGE_DIR, { recursive: true });
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

function removeOldVariants(baseFileName) {
  const base = baseFileName.replace(/\.png$/i, "");
  for (const ext of OLD_EXTENSIONS) {
    const oldPath = path.join(IMAGE_DIR, `${base}${ext}`);
    try {
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    } catch {}
  }
}

export default {
  command: ["setimagen", "setimg"],
  category: "sistema",
  description: "Cambia una imagen del bot respondiendo a una foto",
  ownerOnly: true,

  run: async ({ sock, msg, from, args = [] }) => {
    try {
      ensureImageDir();

      const key = String(args[0] || "").toLowerCase().trim();
      const targetFile = IMAGE_TARGETS[key];

      if (!targetFile) {
        const list = [...new Set(Object.values(IMAGE_TARGETS))]
          .map((f) => `• ${f.replace(/\.png$/i, "")}`)
          .join("\n");

        return sock.sendMessage(
          from,
          {
            text:
              `⚙️ Usa: .setimagen <nombre>, respondiendo a una imagen.\n\n` +
              `Nombres disponibles:\n${list}`,
            ...global.channelInfo,
          },
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
            text: `⚙️ Responde a una *imagen* con .setimagen ${key} para reemplazarla.`,
            ...global.channelInfo,
          },
          { quoted: msg }
        );
      }

      const buff = await downloadMediaMessage(
        targetMsg,
        "buffer",
        {},
        { logger, reuploadRequest: sock.updateMediaMessage }
      );

      const destPath = path.join(IMAGE_DIR, targetFile);
      fs.writeFileSync(destPath, buff);
      removeOldVariants(targetFile);

      return sock.sendMessage(
        from,
        {
          text: `✅ Imagen actualizada: *${targetFile}*`,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error("SETIMAGEN ERROR:", error?.message || error);

      return sock.sendMessage(
        from,
        {
          text: `❌ No se pudo actualizar la imagen.\n💡 ${error?.message || "Error inesperado"}`,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    }
  },
};
