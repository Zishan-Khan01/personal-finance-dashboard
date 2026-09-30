import { randomBytes, scrypt as scryptCallback, timingSafeEqual, createHmac } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const TOKEN_TTL_SECONDS = 60 * 60 * 24 * 7;

function secret() {
  if (!process.env.AUTH_TOKEN_SECRET) {
    throw new Error("AUTH_TOKEN_SECRET is required");
  }
  return process.env.AUTH_TOKEN_SECRET;
}

function encode(value) {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

function sign(value) {
  return createHmac("sha256", secret()).update(value).digest("base64url");
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = await scrypt(password, salt, 64);
  return `${salt}:${Buffer.from(hash).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const candidate = Buffer.from(await scrypt(password, salt, 64));
  const expected = Buffer.from(hash, "hex");
  return candidate.length === expected.length && timingSafeEqual(candidate, expected);
}

export function createAccessToken(userId) {
  const payload = encode({ sub: userId, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS });
  return `${payload}.${sign(payload)}`;
}

export function readAccessToken(token) {
  const [payload, signature] = token.split(".");
  const expectedSignature = payload ? sign(payload) : "";
  if (!payload || !signature || signature.length !== expectedSignature.length || !timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))) {
    return null;
  }

  try {
    const value = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return value.sub && value.exp > Math.floor(Date.now() / 1000) ? value : null;
  } catch {
    return null;
  }
}
