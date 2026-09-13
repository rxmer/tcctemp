import { Mutex } from "async-mutex";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import { join } from "path";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { proto } from "@whiskeysockets/baileys/WAProto/index.js";
import { initAuthCreds } from "@whiskeysockets/baileys/lib/Utils/auth-utils.js";
import { BufferJSON } from "@whiskeysockets/baileys/lib/Utils/generics.js";
import { logger } from "../config/logger.js";

const MAGIC = "encv1:";

const fileLocks = new Map();
function getFileLock(filePath) {
  let mutex = fileLocks.get(filePath);
  if (!mutex) {
    mutex = new Mutex();
    fileLocks.set(filePath, mutex);
  }
  return mutex;
}

function deriveKey(password) {
  return createHash("sha256").update(password).digest();
}

function encrypt(value, key) {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(Buffer.from(value, "utf8")), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${MAGIC}${Buffer.concat([iv, tag, ciphertext]).toString("base64")}`;
}

function decrypt(payload, key) {
  const raw = Buffer.from(payload, "base64");
  const iv = raw.subarray(0, 12);
  const tag = raw.subarray(12, 28);
  const ciphertext = raw.subarray(28);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

export const useEncryptedMultiFileAuthState = async (folder, password) => {
  const key = password ? deriveKey(password) : null;

  const writeData = async (data, file) => {
    const filePath = join(folder, fixFileName(file));
    const mutex = getFileLock(filePath);
    return mutex.acquire().then(async (release) => {
      try {
        const serialized = JSON.stringify(data, BufferJSON.replacer);
        const payload = key ? encrypt(serialized, key) : serialized;
        await writeFile(filePath, payload);
      } finally {
        release();
      }
    });
  };

  const readData = async (file) => {
    const filePath = join(folder, fixFileName(file));
    const mutex = getFileLock(filePath);
    return mutex.acquire().then(async (release) => {
      try {
        let raw;
        try {
          raw = await readFile(filePath, { encoding: "utf-8" });
        } catch (error) {
          if (error.code === "ENOENT") return null;
          throw error;
        }
        if (raw.startsWith(MAGIC)) {
          if (!key) {
            logger.warn({ file }, "Auth criptografada encontrada sem BAILEYS_AUTH_PASSWORD definida");
            return null;
          }
          const serialized = decrypt(raw.slice(MAGIC.length), key);
          return JSON.parse(serialized, BufferJSON.reviver);
        }
        return JSON.parse(raw, BufferJSON.reviver);
      } catch (error) {
        logger.error({ err: error, file }, "Falha ao ler estado de autenticação do Baileys");
        return null;
      } finally {
        release();
      }
    });
  };

  const removeData = async (file) => {
    try {
      const filePath = join(folder, fixFileName(file));
      const mutex = getFileLock(filePath);
      return mutex.acquire().then(async (release) => {
        try {
          await unlink(filePath);
        } catch {
          // arquivo não existe
        } finally {
          release();
        }
      });
    } catch {
      // nada a fazer
    }
  };

  const folderInfo = await stat(folder).catch(() => {});
  if (folderInfo) {
    if (!folderInfo.isDirectory()) {
      throw new Error(`encontrado algo que não é uma pasta em ${folder}, exclua ou use outro diretório`);
    }
  } else {
    await mkdir(folder, { recursive: true });
  }

  const creds = (await readData("creds.json")) || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await readData(`${type}-${id}.json`);
              if (type === "app-state-sync-key" && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tasks = [];
          for (const category in data) {
            for (const id in data[category]) {
              const value = data[category][id];
              const file = `${category}-${id}.json`;
              tasks.push(value ? writeData(value, file) : removeData(file));
            }
          }
          await Promise.all(tasks);
        },
      },
    },
    saveCreds: async () => {
      return writeData(creds, "creds.json");
    },
  };
};

function fixFileName(file) {
  return file?.replace(/\//g, "__")?.replace(/:/g, "-");
}