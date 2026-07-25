import path from "path";
import { createScheduledJsonStore } from "../../lib/json-store.js";
import {
  findGroupParticipant,
  getParticipantDisplayTag,
  getParticipantMentionJid,
  normalizeJidDigits,
  runGroupParticipantAction,
} from "../../lib/group-compat.js";

const FILE = path.join(process.cwd(), "database", "antiarab.json");
const DEFAULT_PREFIXES = ["212", "213", "216", "218", "20", "964", "966", "971", "973", "974", "968", "967", "962", "963", "965", "961", "970", "92"];
const store = createScheduledJsonStore(FILE, () => ({
  groups: {},
}));

function ensureGroup(groupId) {
  const key = String(groupId || "").trim();
  if (!store.state.groups[key]) {
    store.state.groups[key] = {
      enabled: false,
      prefixes: [...DEFAULT_PREFIXES],
    };
  }
  return store.state.groups[key];
}

function normalizeParticipantNumber(value = "") {
  return normalizeJidDigits(value);
}

export default {
  name: "antiarab",
  command: ["antiarab"],
  category: "grupo",
  description: "Filtra numeros de ciertos prefijos al entrar al grupo",
  groupOnly: true,
  adminOnly: true,

  run: async ({ sock, msg, from, args = [] }) => {
    const action = String(args[0] || "status").trim().toLowerCase();
    const config = ensureGroup(from);

    if (action === "on" || action === "off") {
      config.enabled = action === "on";
      store.scheduleSave();
      return sock.sendMessage(from, { text: `Antiarab: *${config.enabled ? "ENCENDIDO" : "APAGADO"}*`, ...global.channelInfo }, { quoted: msg });
    }

    if (action === "add") {
      const prefix = String(args[1] || "").trim().replace(/\D/g, "");
      if (!prefix || prefix.length < 1 || prefix.length > 4) {
        return sock.sendMessage(
          from,
          { text: "Uso: .antiarab add <prefijo numerico, 1-4 digitos>\nEjemplo: .antiarab add 92", ...global.channelInfo },
          { quoted: msg }
        );
      }
      if (config.prefixes.includes(prefix)) {
        return sock.sendMessage(from, { text: `El prefijo *${prefix}* ya estaba en la lista.`, ...global.channelInfo }, { quoted: msg });
      }
      config.prefixes.push(prefix);
      store.scheduleSave();
      return sock.sendMessage(from, { text: `✅ Prefijo *${prefix}* agregado a la lista de Antiarab.`, ...global.channelInfo }, { quoted: msg });
    }

    if (action === "remove" || action === "del" || action === "delete") {
      const prefix = String(args[1] || "").trim().replace(/\D/g, "");
      if (!prefix) {
        return sock.sendMessage(
          from,
          { text: "Uso: .antiarab remove <prefijo>\nEjemplo: .antiarab remove 92", ...global.channelInfo },
          { quoted: msg }
        );
      }
      if (!config.prefixes.includes(prefix)) {
        return sock.sendMessage(from, { text: `El prefijo *${prefix}* no estaba en la lista.`, ...global.channelInfo }, { quoted: msg });
      }
      config.prefixes = config.prefixes.filter((item) => item !== prefix);
      store.scheduleSave();
      return sock.sendMessage(from, { text: `✅ Prefijo *${prefix}* eliminado de la lista de Antiarab.`, ...global.channelInfo }, { quoted: msg });
    }

    return sock.sendMessage(
      from,
      {
        text:
          `*ANTIARAB*\n\n` +
          `Estado: *${config.enabled ? "ENCENDIDO" : "APAGADO"}*\n` +
          `Prefijos: ${config.prefixes.join(", ")}\n\n` +
          `Uso:\n.antiarab on/off\n.antiarab add <prefijo>\n.antiarab remove <prefijo>`,
        ...global.channelInfo,
      },
      { quoted: msg }
    );
  },

  onGroupUpdate: async ({ sock, update, settings }) => {
    if (!update?.id || update.action !== "add") return;
    const config = ensureGroup(update.id);
    if (!config.enabled) return;
    const botNumber = normalizeJidDigits(sock?.user?.id || "");
    const ownerNumbers = [
      settings?.ownerNumber,
      ...(Array.isArray(settings?.ownerNumbers) ? settings.ownerNumbers : []),
    ]
      .map((item) => normalizeJidDigits(item))
      .filter(Boolean);
    let metadata = null;

    try {
      metadata = await sock.groupMetadata(update.id);
    } catch {}

    for (const participant of update.participants || []) {
      const metadataParticipant = findGroupParticipant(metadata || {}, [participant]);
      const realNumberSource =
        (metadataParticipant?.jid && !String(metadataParticipant.jid).endsWith("@lid")
          ? metadataParticipant.jid
          : "") ||
        metadataParticipant?.phoneNumber ||
        metadataParticipant?.pn ||
        metadataParticipant?.phone_number ||
        participant;
      const number = normalizeParticipantNumber(realNumberSource);
      if (!number || number === botNumber || ownerNumbers.includes(number)) continue;
      if (!config.prefixes.some((prefix) => number.startsWith(prefix))) continue;

      const mentionJid = getParticipantMentionJid(
        metadata || {},
        metadataParticipant,
        participant
      );
      let removed = false;
      try {
        const removeResult = await runGroupParticipantAction(
          sock,
          update.id,
          metadata || {},
          metadataParticipant,
          [participant],
          "remove"
        );
        removed = removeResult.ok;
      } catch {}

      if (!removed) {
        await sock.sendMessage(update.id, {
          text:
            `*ANTIARAB*\n\n` +
            `${getParticipantDisplayTag(metadataParticipant, participant)} coincide con un prefijo bloqueado, ` +
            `pero no pude expulsarlo. Verifica que el bot sea administrador.`,
          mentions: mentionJid ? [mentionJid] : [],
          ...global.channelInfo,
        });
      }
    }
  },
};
