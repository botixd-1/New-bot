const fs = require("fs");
const path = "index.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `function recordFatalRuntimeError(kind, payload) {
  if (isTransientRuntimeError(payload)) {
    console.warn(
      \`[FATAL_GUARD] \${kind} transitorio detectado. No reinicio global.\`,
      payload
    );
    return;
  }

  const now = Date.now();
  fatalRuntimeErrors.push(now);

  while (
    fatalRuntimeErrors.length &&
    now - Number(fatalRuntimeErrors[0] || 0) > FATAL_ERROR_WINDOW_MS
  ) {
    fatalRuntimeErrors.shift();
  }

  if (fatalRuntimeErrors.length < FATAL_ERROR_THRESHOLD) {
    return;
  }

  fatalRuntimeErrors.length = 0;
  console.error(
    \`[FATAL_GUARD] Demasiados \${kind} en poco tiempo. Reiniciando proceso...\`,
    payload
  );
  scheduleProcessRestart(2000);
}`;

const newBlock = `function recordFatalRuntimeError(kind, payload) {
  if (isTransientRuntimeError(payload)) {
    console.warn(
      \`[FATAL_GUARD] \${kind} transitorio detectado. No reinicio global.\`,
      payload
    );
    return;
  }

  const now = Date.now();
  fatalRuntimeErrors.push(now);

  while (
    fatalRuntimeErrors.length &&
    now - Number(fatalRuntimeErrors[0] || 0) > FATAL_ERROR_WINDOW_MS
  ) {
    fatalRuntimeErrors.shift();
  }

  console.error(
    \`[FATAL_GUARD] (\${fatalRuntimeErrors.length}/\${FATAL_ERROR_THRESHOLD}) \${kind} contado a las \${new Date(now).toISOString()}:\`,
    payload?.stack || payload?.message || payload
  );

  if (fatalRuntimeErrors.length < FATAL_ERROR_THRESHOLD) {
    return;
  }

  fatalRuntimeErrors.length = 0;
  console.error(
    \`[FATAL_GUARD] Demasiados \${kind} en poco tiempo. Reiniciando proceso...\`,
    payload
  );
  scheduleProcessRestart(2000);
}`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró recordFatalRuntimeError.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ index.js: recordFatalRuntimeError ahora loguea cada error contado con hora y detalle.");
