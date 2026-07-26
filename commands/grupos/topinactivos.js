import {
  getParticipantMentionJid,
} from "../../lib/group-compat.js";
import {
  getGroupUserActivity,
  recordUserActivity,
} from "../../lib/group-activity-tracker.js";

const PAGE_SIZE = 100;

function cleanText(value = "") {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function resolveSenderId(msg = {}) {
  const candidates = [
    msg?.senderPhone,
    msg?.key?.participantPn,
    msg?.key?.senderPn,
    msg?.sender,
    msg?.key?.participant,
  ]
    .map((value) => cleanText(value))
    .filter(Boolean);

  for (const value of candidates) {
    if (value.includes("@s.whatsapp.net")) return value;
  }

  return candidates[0] || "";
}

function normalizeUserId(value = "") {
  const raw = cleanText(value).toLowerCase();
  if (!raw) return "";
  const [user] = raw.split("@");
  return user.split(":")[0];
}

function resolveParticipantRealId(participant = {}) {
  const rawId = String(participant?.id || participant?.jid || "").trim();
  const realSource =
    (participant?.jid && !String(participant.jid).endsWith("@lid")
      ? participant.jid
      : "") ||
    participant?.phoneNumber ||
    participant?.pn ||
    participant?.phone_number ||
    rawId;
  return normalizeUserId(realSource);
}

export default {
  command: ["topinactivos", "inactivos"],
  category: "grupo",
  description: "Muestra el top de usuarios menos activos del grupo",
  groupOnly: true,
  adminOnly: true,

  onMessage: async ({ from, esGrupo, msg }) => {
    if (!esGrupo) return;
    if (msg?.key?.fromMe) return;

    const sender = resolveSenderId(msg);
    if (!sender) return;

    recordUserActivity(from, normalizeUserId(sender));
  },

  run: async ({ sock, msg, from, args = [] }) => {
    const page = Math.max(1, parseInt(args[0], 10) || 1);
    const meta = await sock.groupMetadata(from);
    const participants = Array.isArray(meta?.participants) ? meta.participants : [];
    const botId = normalizeUserId(sock?.user?.id || "");
    const activity = getGroupUserActivity(from);

    const rows = participants
      .filter((p) => normalizeUserId(p?.id || p?.jid || "") !== botId)
      .map((p) => {
        const key = resolveParticipantRealId(p);
        const data = activity[key];
        const mentionJid = getParticipantMentionJid(meta, p, p?.id);
        return {
          mentionJid,
          messages: Number(data?.messages || 0),
        };
      });

    rows.sort((a, b) => a.messages - b.messages);

    const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    const pageRows = rows.slice(start, start + PAGE_SIZE);

    const lines = pageRows.map((row, index) => {
      const rank = start + index + 1;
      const userTag = row.mentionJid ? `@${String(row.mentionJid).split("@")[0]}` : "@desconocido";
      return `#${rank}: ${userTag} » ${row.messages} mensajes`;
    });

    const mentions = pageRows.map((row) => row.mentionJid).filter(Boolean);

    const text =
      `✦ Top de usuarios inactivos ✦\n` +
      `» Pagina: ${safePage} de ${totalPages}\n` +
      `» Total miembros: ${rows.length}\n\n` +
      (lines.length ? lines.join("\n") : "Sin datos todavia.");

    return sock.sendMessage(
      from,
      { text, mentions, ...global.channelInfo },
      { quoted: msg }
    );
  },
};
