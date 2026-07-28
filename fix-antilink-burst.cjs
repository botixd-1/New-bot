const fs = require("fs");
const path = "commands/grupos/antilink.js";
let content = fs.readFileSync(path, "utf8");

// 1) Agregar el guard de concurrencia justo antes del export default
const oldExport = `export default {`;

const newExport = `const activeKickGuard = new Map();
const KICK_GUARD_TTL_MS = 8000;

function isKickGuardActive(key) {
  const expiresAt = activeKickGuard.get(key);
  if (!expiresAt) return false;
  if (Date.now() > expiresAt) {
    activeKickGuard.delete(key);
    return false;
  }
  return true;
}

function setKickGuard(key, ttl = KICK_GUARD_TTL_MS) {
  activeKickGuard.set(key, Date.now() + ttl);
}

export default {`;

if (!content.includes(oldExport)) {
  console.error("❌ No se encontró 'export default {'.");
  process.exit(1);
}
content = content.replace(oldExport, newExport);

// 2) Usar el guard en onMessage para que solo el primer link de la rafaga procese warn/kick
const oldBlock = `    const sender = msg.sender || msg.key?.participant;
    if (!sender) return;
    const mentionJid = getParticipantMentionJid(groupMetadata || {}, null, sender);

    await deleteMessageForModeration(sock, from, msg.key);

    const currentWarns = getWarnCount(from, sender) + 1;
    setWarnCount(from, sender, currentWarns);`;

const newBlock = `    const sender = msg.sender || msg.key?.participant;
    if (!sender) return;
    const mentionJid = getParticipantMentionJid(groupMetadata || {}, null, sender);

    const guardKey = \`\${from}|\${sender}\`;
    const alreadyHandling = isKickGuardActive(guardKey);
    if (!alreadyHandling) {
      setKickGuard(guardKey);
    }

    await deleteMessageForModeration(sock, from, msg.key);

    if (alreadyHandling) {
      return;
    }

    const currentWarns = getWarnCount(from, sender) + 1;
    setWarnCount(from, sender, currentWarns);`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró el bloque de sender/delete a modificar.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ antilink.js: ahora evita avisos/expulsiones duplicadas cuando llegan varios links a la vez.");
