const crypto = require("node:crypto");
const fs = require("node:fs/promises");
const path = require("node:path");

const DEFAULT_STORAGE_ROOT = path.resolve(__dirname, "../../storage/private");

function storageRoot() {
  return path.resolve(process.env.LOCAL_STORAGE_PATH || DEFAULT_STORAGE_ROOT);
}

function resolveStorageKey(storageKey) {
  const root = storageRoot();
  const resolved = path.resolve(root, storageKey);
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    throw new Error("Invalid storage key");
  }
  return resolved;
}

async function savePrivateFile({ buffer, extension, kind, userId }) {
  const safeKind = String(kind).replace(/[^a-z0-9_-]/gi, "");
  const safeUserId = String(userId).replace(/[^a-z0-9_-]/gi, "");
  const safeExtension = String(extension).replace(/[^a-z0-9]/gi, "").toLowerCase();
  const storageKey = path.join(
    safeUserId,
    safeKind,
    `${Date.now()}-${crypto.randomUUID()}.${safeExtension}`,
  );
  const absolutePath = resolveStorageKey(storageKey);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true, mode: 0o700 });
  await fs.writeFile(absolutePath, buffer, { flag: "wx", mode: 0o600 });
  return storageKey;
}

async function readPrivateFile(storageKey) {
  return fs.readFile(resolveStorageKey(storageKey));
}

async function deletePrivateFile(storageKey) {
  if (!storageKey) return;
  try {
    await fs.unlink(resolveStorageKey(storageKey));
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

module.exports = {
  deletePrivateFile,
  readPrivateFile,
  resolveStorageKey,
  savePrivateFile,
  storageRoot,
};
