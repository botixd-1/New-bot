import path from "path";
import { createScheduledJsonStore } from "./json-store.js";

const FILE = path.join(process.cwd(), "database", "group-user-activity.json");

const store = createScheduledJsonStore(FILE, () => ({
  trackedSince: new Date().toISOString(),
  groups: {},
}));

function ensureGroupUsers(groupId) {
  const groups = store.state.groups || (store.state.groups = {});
  if (!groups[groupId]) {
    groups[groupId] = { users: {} };
  }
  if (!groups[groupId].users) {
    groups[groupId].users = {};
  }
  return groups[groupId].users;
}

export function recordUserActivity(groupId, userId) {
  const key = String(groupId || "").trim();
  const id = String(userId || "").trim();
  if (!key || !id) return;

  const users = ensureGroupUsers(key);
  if (!users[id]) {
    users[id] = { messages: 0, lastSeenAt: 0 };
  }

  users[id].messages = Number(users[id].messages || 0) + 1;
  users[id].lastSeenAt = Date.now();
  store.scheduleSave();
}

export function getGroupUserActivity(groupId) {
  const key = String(groupId || "").trim();
  return store.state.groups?.[key]?.users || {};
}
