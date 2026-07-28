const fs = require("fs");
const path = "index.js";
let content = fs.readFileSync(path, "utf8");

const oldBlock = `function createStoreForBot(botId) {
  if (typeof makeInMemoryStore !== "function") return null;

  const store = makeInMemoryStore({ logger });
  const storeFile = path.join(TMP_DIR, \`baileys_store_\${botId}.json\`);

  try {
    if (store?.readFromFile && fs.existsSync(storeFile)) {
      store.readFromFile(storeFile);
    }
  } catch {}

  if (store?.writeToFile) {
    const timer = setInterval(() => {
      try {
        store.writeToFile(storeFile);
      } catch {}
    }, 10000);

    timer.unref?.();
    store.__writeTimer = timer;
  }

  return store;
}`;

const newBlock = `const MAX_STORE_MESSAGES_PER_CHAT = 50;

function trimStoreMessages(store) {
  if (!store?.messages) return;
  for (const jid of Object.keys(store.messages)) {
    const list = store.messages[jid];
    if (!list?.array || list.array.length <= MAX_STORE_MESSAGES_PER_CHAT) continue;
    const toRemove = list.array.slice(0, list.array.length - MAX_STORE_MESSAGES_PER_CHAT);
    for (const item of toRemove) {
      try {
        list.remove(item);
      } catch {}
    }
  }
}

function createStoreForBot(botId) {
  if (typeof makeInMemoryStore !== "function") return null;

  const store = makeInMemoryStore({ logger });
  const storeFile = path.join(TMP_DIR, \`baileys_store_\${botId}.json\`);

  try {
    if (store?.readFromFile && fs.existsSync(storeFile)) {
      store.readFromFile(storeFile);
    }
  } catch {}

  try {
    trimStoreMessages(store);
  } catch {}

  if (store?.writeToFile) {
    const timer = setInterval(() => {
      try {
        trimStoreMessages(store);
        store.writeToFile(storeFile);
      } catch {}
    }, 10000);

    timer.unref?.();
    store.__writeTimer = timer;
  }

  return store;
}`;

if (!content.includes(oldBlock)) {
  console.error("❌ No se encontró createStoreForBot.");
  process.exit(1);
}
content = content.replace(oldBlock, newBlock);

fs.writeFileSync(path, content, "utf8");
console.log("✅ index.js: el store ahora limita cada chat a 50 mensajes en memoria (antes guardaba todo para siempre).");
