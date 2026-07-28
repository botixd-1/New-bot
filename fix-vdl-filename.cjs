const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const debugBlock1 = `  } catch (err1) {
    console.error(\`[VDL_DEBUG] Fallo intento 1 (remux):\`, err1?.stderr || err1?.message || err1);
    await deleteSafe(outputPath);`;
const cleanBlock1 = `  } catch {
    await deleteSafe(outputPath);`;

if (content.includes(debugBlock1)) {
  content = content.replace(debugBlock1, cleanBlock1);
}

const debugBlock2 = `    } catch (err2) {
      console.error(\`[VDL_DEBUG] Fallo intento 2 (transcode):\`, err2?.stderr || err2?.message || err2);
      await deleteSafe(outputPath);`;
const cleanBlock2 = `    } catch {
      await deleteSafe(outputPath);`;

if (content.includes(debugBlock2)) {
  content = content.replace(debugBlock2, cleanBlock2);
}

const anchor = `async function downloadAndSendVideo(sock, from, quoted, url, referer = "", cookie = "") {`;

const helperFns = `function sanitizeFileName(name = "") {
  const cleaned = String(name || "").replace(/[\\\\/:*?"<>|]/g, "_").trim();
  return cleaned || "video";
}

function ensureMp4Extension(name = "video") {
  const safe = sanitizeFileName(name);
  if (/\\.(mp4|m4v)$/i.test(safe)) return safe;
  return safe.replace(/\\.[a-z0-9]{1,5}$/i, "") + ".mp4";
}

async function resolveFileName(url, referer = "", cookie = "") {
  try {
    const response = await axios.head(url, {
      timeout: 8000,
      maxRedirects: 5,
      headers: {
        "User-Agent": UA,
        ...(referer ? { Referer: referer } : {}),
        ...(cookie ? { Cookie: cookie } : {}),
      },
    });
    const disposition = response.headers?.["content-disposition"];
    if (disposition) {
      const match = /filename\\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(disposition);
      if (match?.[1]) {
        return ensureMp4Extension(decodeURIComponent(match[1]));
      }
    }
  } catch {}

  try {
    const parsed = new URL(url);
    const last = decodeURIComponent(
      parsed.pathname.split("/").filter(Boolean).pop() || ""
    );
    if (last) return ensureMp4Extension(last);
  } catch {}

  return "video.mp4";
}

${anchor}`;

if (!content.includes(anchor)) {
  console.error("❌ No se encontró downloadAndSendVideo para insertar el helper.");
  process.exit(1);
}
content = content.replace(anchor, helperFns);

const oldPayloadBlock = `  try {
    const asDocument = stat.size > AS_DOCUMENT_BYTES;

    const payload = asDocument
      ? {
          document: { url: outputPath },
          mimetype: "video/mp4",
          fileName: "video.mp4",
          ...global.channelInfo,
        }
      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          ...global.channelInfo,
        };

    await sock.sendMessage(from, payload, quoted);
  } finally {
    await deleteSafe(outputPath);
  }
}`;

const newPayloadBlock = `  try {
    const asDocument = stat.size > AS_DOCUMENT_BYTES;
    const fileName = await resolveFileName(url, referer, cookie);

    const payload = asDocument
      ? {
          document: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        }
      : {
          video: { url: outputPath },
          mimetype: "video/mp4",
          fileName,
          ...global.channelInfo,
        };

    await sock.sendMessage(from, payload, quoted);
  } finally {
    await deleteSafe(outputPath);
  }
}`;

if (!content.includes(oldPayloadBlock)) {
  console.error("❌ No se encontró el bloque final de envío del payload.");
  process.exit(1);
}
content = content.replace(oldPayloadBlock, newPayloadBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: logs de debug eliminados y ahora detecta el nombre real del archivo.");
