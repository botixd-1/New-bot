import fs from "fs";
import path from "path";
import axios from "axios";
import { pipeline } from "stream/promises";
import { randomUUID } from "crypto";

const EVOGB_BASE = "https://api.evogb.org/sfw/interaction";
const EVOGB_KEY = "DravenMJ";
const TMP_DIR = path.join(process.cwd(), "tmp", "interact-gifs");

// ── Alias en español/inglés -> acción real que acepta la API ──
// Para agregar una acción nueva, solo añade una línea aquí.
const ACTION_MAP = {
  abrazar: "hug", abrazo: "hug", hug: "hug",
  kiss: "kiss", beso: "kiss", besar: "kiss",
  matar: "kill", kill: "kill", asesinar: "kill",
  golpear: "punch", puñetazo: "punch", punch: "punch",
  pelear: "slap", slap: "slap", bofetada: "slap",
  matrimonio: "handhold", tomar: "handhold", handhold: "handhold",
  pat: "pat", palmadita: "pat", acariciar: "pat",
  bonk: "bonk",
  morder: "bite", bite: "bite",
  lamer: "lick", lick: "lick",
  mimar: "cuddle", cuddle: "cuddle", acurrucar: "cuddle", snuggle: "snuggle",
  chocar: "highfive", highfive: "highfive",
  llorar: "cry", cry: "cry",
  ruborizarse: "blush", blush: "blush",
  bailar: "dance", dance: "dance",
  guino: "wink", wink: "wink",
  saludar: "wave", wave: "wave", awoo: "wave",
  feliz: "happy", happy: "happy",
  presumir: "smug", smug: "smug",
  cringe: "cringe",
  sonreir: "smile", smile: "smile",
  comer: "eat", eat: "eat",
  banar: "bath", bath: "bath",
  dormir: "sleep", sleep: "sleep",
  cantar: "sing", sing: "sing",
  correr: "run", run: "run",
  seducir: "seduce", seduce: "seduce",
  amor: "love", love: "love",
  triste: "sad", sad: "sad",
  asustado: "scared", scared: "scared",
  timido: "shy", shy: "shy",
  aplaudir: "clap", clap: "clap",
  cafe: "coffee", coffee: "coffee",
  gritar: "scream", scream: "scream",
  empujar: "push", push: "push",
  saltar: "jump", jump: "jump",
  molestar: "bully", bully: "bully",
  pensar: "think", think: "think",
  caminar: "walk", walk: "walk",
  fumar: "smoke", smoke: "smoke",
};

function ensureTmp() {
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
}

function deleteFileSafe(fp) {
  try {
    if (fp && fs.existsSync(fp)) fs.unlinkSync(fp);
  } catch {}
}

// ── Pide a la API la URL del mp4 para una acción ──
async function fetchGifUrl(action) {
  const { data } = await axios.get(EVOGB_BASE, {
    params: { type: action, key: EVOGB_KEY },
    timeout: 15000,
  });

  if (!data?.status || !data?.result) {
    throw new Error("La API no devolvió un gif para esta acción.");
  }

  return data.result;
}

// ── Descarga el mp4 a disco ──
async function downloadMp4(url, destPath) {
  const response = await axios.get(url, {
    responseType: "stream",
    timeout: 30000,
  });

  await pipeline(response.data, fs.createWriteStream(destPath));

  const stat = fs.statSync(destPath);
  if (stat.size < 1024) {
    throw new Error("El gif descargado está vacío o incompleto.");
  }
}

// ── Encuentra a quién va dirigida la acción (mención o cita) ──
function resolveTargetJid(msg) {
  const ctxInfo = msg.message?.extendedTextMessage?.contextInfo;
  const mentioned = ctxInfo?.mentionedJid;
  if (Array.isArray(mentioned) && mentioned.length) return mentioned[0];

  const quotedParticipant = ctxInfo?.participant;
  if (quotedParticipant) return quotedParticipant;

  return null;
}

function jidToMentionText(jid) {
  return `@${String(jid || "").split("@")[0]}`;
}

export default {
  command: ["interacciones", ...Object.keys(ACTION_MAP)],
  category: "media",
  description: "Envía un gif de interacción (abrazar, besar, golpear, etc.)",

  run: async ({ sock, msg, from, commandName }) => {
    let mp4Path = null;

    try {
      ensureTmp();

      const action = ACTION_MAP[String(commandName || "").toLowerCase()];
      if (!action) {
        return sock.sendMessage(
          from,
          { text: "❌ Acción no reconocida.", ...global.channelInfo },
          { quoted: msg }
        );
      }

      const senderJid = msg.key.participant || msg.key.remoteJid;
      const targetJid = resolveTargetJid(msg);

      const caption = targetJid
        ? `${jidToMentionText(senderJid)} le hizo *${commandName}* a ${jidToMentionText(targetJid)}`
        : `${jidToMentionText(senderJid)} usó *${commandName}*`;

      const mentions = [senderJid, targetJid].filter(Boolean);

      const gifUrl = await fetchGifUrl(action);

      mp4Path = path.join(TMP_DIR, `${action}-${Date.now()}-${randomUUID().slice(0, 8)}.mp4`);
      await downloadMp4(gifUrl, mp4Path);

      await sock.sendMessage(
        from,
        {
          video: { url: mp4Path },
          gifPlayback: true,
          mimetype: "video/mp4",
          caption,
          mentions,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    } catch (error) {
      console.error("INTERACT ERROR:", error?.message || error);

      return sock.sendMessage(
        from,
        {
          text: `❌ No se pudo enviar el gif.\n💡 ${error?.message || "Error inesperado"}`,
          ...global.channelInfo,
        },
        { quoted: msg }
      );
    } finally {
      deleteFileSafe(mp4Path);
    }
  },
};
