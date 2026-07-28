const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldHelper = `async function resolveQuotedThumbnail(msg) {
  try {
    const quotedMessage = unwrapMessage(msg?.quoted?.message || {});
    const imageMessage = quotedMessage?.imageMessage;
    if (!imageMessage) return null;

    const stream = await downloadContentFromMessage(imageMessage, "image");
    return await streamToBuffer(stream);
  } catch {
    return null;
  }
}`;

const newHelper = `async function resolveAttachedImage(msg) {
  try {
    const ownMessage = unwrapMessage(msg?.message || {});
    const quotedMessage = unwrapMessage(msg?.quoted?.message || {});
    const imageMessage = ownMessage?.imageMessage || quotedMessage?.imageMessage;
    if (!imageMessage) return null;

    const stream = await downloadContentFromMessage(imageMessage, "image");
    return await streamToBuffer(stream);
  } catch {
    return null;
  }
}`;

if (!content.includes(oldHelper)) {
  console.error("❌ No se encontró resolveQuotedThumbnail.");
  process.exit(1);
}
content = content.replace(oldHelper, newHelper);

const oldSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "", thumbnail = null) {`;
const newSig = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "", customName = "", attachedImage = null) {`;

if (!content.includes(oldSig)) {
  console.error("❌ No se encontró la firma de downloadAndSendVideo.");
  process.exit(1);
}
content = content.replace(oldSig, newSig);

const oldPayload = `      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          jpegThumbnail: thumbnail || undefined,
          ...global.channelInfo,
        };

    await sock.sendMessage(from, payload, quoted);
  } finally {
    await deleteSafe(outputPath);
  }
}`;

const newPayload = `      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        };

    await sock.sendMessage(from, payload, quoted);

    if (attachedImage) {
      try {
        await sock.sendMessage(from, {
          image: attachedImage,
          ...global.channelInfo,
        });
      } catch {}
    }
  } finally {
    await deleteSafe(outputPath);
  }
}`;

if (!content.includes(oldPayload)) {
  console.error("❌ No se encontró el bloque final del payload de video.");
  process.exit(1);
}
content = content.replace(oldPayload, newPayload);

const oldRunCall = `    const thumbnail = await resolveQuotedThumbnail(msg);
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName, thumbnail);`;

const newRunCall = `    const attachedImage = await resolveAttachedImage(msg);
    return downloadAndSendVideo(sock, from, quoted, first, referer, cookie, customName, attachedImage);`;

if (!content.includes(oldRunCall)) {
  console.error("❌ No se encontró la llamada final en run().");
  process.exit(1);
}
content = content.replace(oldRunCall, newRunCall);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: la imagen ahora se manda como mensaje aparte justo después del video (sin responder), no como miniatura.");
