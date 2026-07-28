const fs = require("fs");

// ── 1) Arreglar extractTargetCandidates en group-compat.js ──
const compatPath = "lib/group-compat.js";
let compatContent = fs.readFileSync(compatPath, "utf8");

const oldExtract = `export function extractTargetCandidates(message = {}, args = []) {
  const contextInfo = getContextInfo(message?.message || message || {});
  const mentioned = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid
    : [];
  const values = [];
  const push = (value = "") => {
    for (const candidate of extractValueCandidates(value)) {
      values.push(candidate);
    }
  };

  for (const value of mentioned) {
    push(value);
  }
  push(contextInfo?.participant);
  push(contextInfo?.participantAlt || contextInfo?.participantPn);
  push(contextInfo?.participantLid);
  push(message?.quoted?.sender);
  push(message?.quoted?.senderPhone);
  push(message?.quoted?.senderLid);
  push(message?.quoted?.key?.participant);
  push(message?.quoted?.key?.participantAlt);
  push(message?.quoted?.key?.participantPn);
  push(message?.quoted?.key?.participantLid);

  const firstArg = String((Array.isArray(args) ? args[0] : args) || "").trim();
  if (firstArg) {
    values.push(firstArg);
  }

  return uniqueValues(values);
}`;

const newExtract = `export function extractTargetCandidates(message = {}, args = []) {
  const contextInfo = getContextInfo(message?.message || message || {});
  const mentioned = Array.isArray(contextInfo?.mentionedJid)
    ? contextInfo.mentionedJid
    : [];

  const invokerDigits = normalizeJidDigits(
    message?.sender || message?.key?.participant || ""
  );

  const mentionedValues = [];
  for (const value of mentioned) {
    for (const candidate of extractValueCandidates(value)) {
      mentionedValues.push(candidate);
    }
  }

  const otherValues = [];
  const pushOther = (value = "") => {
    for (const candidate of extractValueCandidates(value)) {
      if (invokerDigits && normalizeJidDigits(candidate) === invokerDigits) {
        continue;
      }
      otherValues.push(candidate);
    }
  };

  pushOther(contextInfo?.participant);
  pushOther(contextInfo?.participantAlt || contextInfo?.participantPn);
  pushOther(contextInfo?.participantLid);
  pushOther(message?.quoted?.sender);
  pushOther(message?.quoted?.senderPhone);
  pushOther(message?.quoted?.senderLid);
  pushOther(message?.quoted?.key?.participant);
  pushOther(message?.quoted?.key?.participantAlt);
  pushOther(message?.quoted?.key?.participantPn);
  pushOther(message?.quoted?.key?.participantLid);

  const values = [...mentionedValues, ...otherValues];

  const firstArg = String((Array.isArray(args) ? args[0] : args) || "").trim();
  if (firstArg) {
    values.push(firstArg);
  }

  return uniqueValues(values);
}`;

if (!compatContent.includes(oldExtract)) {
  console.error("❌ No se encontró extractTargetCandidates en group-compat.js.");
  process.exit(1);
}
compatContent = compatContent.replace(oldExtract, newExtract);
fs.writeFileSync(compatPath, compatContent, "utf8");
console.log("✅ group-compat.js: extractTargetCandidates ya no confunde al emisor del comando con el objetivo.");

// ── 2) Quitar los logs de debug de kick.js ──
const kickPath = "commands/grupos/kick.js";
let kickContent = fs.readFileSync(kickPath, "utf8");

const debug1 = `
  console.log(\`[KICK_DEBUG] targetJid=\${targetJid} matchedParticipant=\${JSON.stringify(participant)}\`);`;
if (kickContent.includes(debug1)) {
  kickContent = kickContent.replace(debug1, "");
}

const debug2 = `
      console.log(\`[KICK_SINGLE_DEBUG] candidates=\${JSON.stringify(candidates)} targetJid=\${targetJid} participant=\${JSON.stringify(participant)}\`);`;
if (kickContent.includes(debug2)) {
  kickContent = kickContent.replace(debug2, "");
}

fs.writeFileSync(kickPath, kickContent, "utf8");
console.log("✅ kick.js: logs de debug eliminados.");
