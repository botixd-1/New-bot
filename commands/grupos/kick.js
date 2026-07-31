import {
  findGroupParticipant,
  getParticipantActionCandidates,
  getParticipantDisplayTag,
  getParticipantMentionJid,
  resolveGroupTarget,
  runGroupParticipantAction,
  isParticipantAdmin,
  isParticipantSuperAdmin,
} from "../../lib/group-compat.js";

function getMentionedJids(message = {}) {
  const contextInfo =
    message?.message?.extendedTextMessage?.contextInfo ||
    message?.message?.imageMessage?.contextInfo ||
    message?.message?.videoMessage?.contextInfo ||
    message?.contextInfo ||
    {};
  return Array.isArray(contextInfo?.mentionedJid) ? contextInfo.mentionedJid : [];
}

async function kickOne({ sock, from, metadata, botCandidates, targetJid }) {
  const participant = findGroupParticipant(metadata, [targetJid]);

  if (botCandidates.includes(targetJid)) {
    return { targetJid, ok: false, reason: "No puedo expulsarme a mí mismo." };
  }

  if (!participant) {
    return { targetJid, ok: false, reason: "Usuario no encontrado en este grupo." };
  }

  if (isParticipantSuperAdmin(participant)) {
    return { targetJid, ok: false, reason: "Es el creador del grupo." };
  }

  if (isParticipantAdmin(participant)) {
    return { targetJid, ok: false, reason: "Es administrador del grupo." };
  }

  const candidates = getParticipantActionCandidates(metadata, participant, [targetJid]);

  const removeResult = await runGroupParticipantAction(
    sock,
    from,
    metadata,
    participant,
    candidates,
    "remove"
  );

  if (!removeResult.ok) {
    return { targetJid, ok: false, reason: "No se pudo expulsar (verifica permisos del bot)." };
  }

  return { targetJid, ok: true, participant };
}

export default {
  command: ["kick"],
  groupOnly: true,
  adminOnly: true,
  category: "grupo",
  description: "Quita a un usuario del grupo.",

  async run({ sock, from, msg, args, m }) {
    try {
      const metadata = await sock.groupMetadata(from);
      const mentionedJids = getMentionedJids(msg || m || {});

      const botParticipant = findGroupParticipant(metadata, [sock?.user?.id]);
      const botCandidates = getParticipantActionCandidates(
        metadata,
        botParticipant,
        [sock?.user?.id]
      );

      // ── Modo múltiple: 2 o más usuarios mencionados ──
      if (mentionedJids.length > 1) {
        const results = [];

        for (const targetJid of mentionedJids) {
          const result = await kickOne({ sock, from, metadata, botCandidates, targetJid });
          results.push(result);
        }

        const okResults = results.filter((r) => r.ok);
        const failResults = results.filter((r) => !r.ok);

        const lines = [`✅ *Expulsión múltiple completada.*`, ""];

        if (okResults.length) {
          lines.push(`👤 Expulsados (${okResults.length}):`);
          for (const r of okResults) {
            lines.push(`• ${getParticipantDisplayTag(r.participant, r.targetJid)}`);
          }
        }

        if (failResults.length) {
          lines.push("");
          lines.push(`⚠️ No expulsados (${failResults.length}):`);
          for (const r of failResults) {
            lines.push(`• @${String(r.targetJid).split("@")[0]} — ${r.reason}`);
          }
        }

        return await sock.sendMessage(from, {
          text: lines.join("\n"),
          mentions: mentionedJids,
          ...global.channelInfo,
        });
      }

      // ── Modo single (comportamiento original) ──
      const { participant, jid: targetJid, candidates } = resolveGroupTarget(
        metadata,
        msg || m || {},
        args
      );

      if (!targetJid) {
        return await sock.sendMessage(
          from,
          {
            text:
`⚠️ *¿A quién expulso?*

✅ *Formas de usarlo:*
• Responde al mensaje del usuario y escribe: *.kick*
• Menciona al usuario: *.kick @usuario*
• Menciona a varios: *.kick @usuario1 @usuario2 @usuario3*`,
            ...global.channelInfo
          }
        );
      }

      if (botCandidates.includes(targetJid)) {
        return await sock.sendMessage(from, {
          text: "🤖 *No puedo expulsarme a mí mismo.*",
          ...global.channelInfo
        });
      }

      if (!participant) {
        return await sock.sendMessage(from, {
          text: "❌ *Usuario no encontrado en este grupo.*",
          ...global.channelInfo
        });
      }

      if (isParticipantSuperAdmin(participant)) {
        return await sock.sendMessage(from, {
          text: "👑 *No puedes expulsar al creador del grupo.*",
          ...global.channelInfo
        });
      }

      if (isParticipantAdmin(participant)) {
        return await sock.sendMessage(from, {
          text: "🛡️ *No puedes expulsar a otro administrador.*",
          ...global.channelInfo
        });
      }

      const removeResult = await runGroupParticipantAction(
        sock,
        from,
        metadata,
        participant,
        candidates,
        "remove"
      );

      if (!removeResult.ok) {
        throw removeResult.error || new Error("No pude expulsar al usuario.");
      }

      await sock.sendMessage(from, {
        text:
`✅ *Expulsado correctamente.*

👤 Usuario: ${getParticipantDisplayTag(participant, targetJid)}`,
        mentions: [removeResult.jid],
      });

    } catch (e) {
      await sock.sendMessage(from, {
        text:
`❌ *No pude expulsarlo.*

✅ Verifica:
• Que el bot sea *administrador*
• Que yo tenga permisos suficientes`,
        ...global.channelInfo
      });
    }
  }
};
