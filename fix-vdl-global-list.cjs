const fs = require("fs");
const path = "commands/descargas/vdl.js";
let content = fs.readFileSync(path, "utf8");

const oldFns = `function getSavedListUrl(chatId) {
  return savedListsStore.state.chats?.[chatId] || "";
}

function setSavedListUrl(chatId, url) {
  if (!savedListsStore.state.chats) savedListsStore.state.chats = {};
  savedListsStore.state.chats[chatId] = url;
  savedListsStore.scheduleSave();
}`;

const newFns = `const GLOBAL_LIST_KEY = "global";

function getSavedListUrl() {
  return savedListsStore.state.chats?.[GLOBAL_LIST_KEY] || "";
}

function setSavedListUrl(url) {
  if (!savedListsStore.state.chats) savedListsStore.state.chats = {};
  savedListsStore.state.chats[GLOBAL_LIST_KEY] = url;
  savedListsStore.scheduleSave();
}`;

if (!content.includes(oldFns)) {
  console.error("❌ No se encontraron las funciones getSavedListUrl/setSavedListUrl.");
  process.exit(1);
}
content = content.replace(oldFns, newFns);

content = content.replaceAll("setSavedListUrl(from, givenUrl)", "setSavedListUrl(givenUrl)");
content = content.replaceAll("getSavedListUrl(from)", "getSavedListUrl()");
content = content.replaceAll("setSavedListUrl(from, newUrl)", "setSavedListUrl(newUrl)");

fs.writeFileSync(path, content, "utf8");
console.log("✅ vdl.js: la lista guardada ahora es global, compartida en todos los chats.");
