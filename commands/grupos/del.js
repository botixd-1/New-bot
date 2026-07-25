import { deleteMessageForModeration } from "../../lib/moderation-delete.js";

export default {
  name: "del",
  command: ["del", "eliminar", "borrar"],
  category: "grupo",
  groupOnly: true,
  adminOnly: true,
  description: "Elimina el mensaje al que respondes",

  async run({ sock, msg, from }) {
    const quoted = msg?.key ? { quoted: msg } : undefined;

    if (!msg?.quoted?.key?.id) {
      return sock.sendMessage(
        from,
        {
          text: "Responde al mensaje que quieres eliminar con *.del*.",
          ...global.channelInfo,
        },
        quoted
      );
    }

    const deleted = await deleteMessageForModeration(sock, from, msg.quoted.key);

    if (!deleted) {
      return sock.sendMessage(
        from,
        {
          text: "No pude eliminar ese mensaje. Verifica que el bot sea administrador.",
          ...global.channelInfo,
        },
        quoted
      );
    }
  },
};
