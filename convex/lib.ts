import { ConvexError } from "convex/values";
import { QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// ---------- crypto helpers (Web Crypto, available in the Convex runtime) ----------
const enc = new TextEncoder();

function toHex(buf: ArrayBuffer | Uint8Array) {
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function randomHex(bytes = 32) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return toHex(a);
}

export async function sha256(text: string) {
  return toHex(await crypto.subtle.digest("SHA-256", enc.encode(text)));
}

export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: enc.encode(salt), iterations: 100_000 },
    key,
    256,
  );
  return toHex(bits);
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// ---------- platform (root) guard ----------
// The platform admin signs in with the ADMIN_KEY set via `npx convex env set ADMIN_KEY <passcode>`
export function isPlatformKey(adminKey: string) {
  const expected = process.env.ADMIN_KEY;
  return !!expected && safeEqual(adminKey, expected);
}

export function assertPlatform(adminKey: string) {
  if (!process.env.ADMIN_KEY) throw new ConvexError("ADMIN_KEY is not set on the Convex deployment");
  if (!isPlatformKey(adminKey)) throw new ConvexError("Unauthorized");
}

// ---------- user sessions ----------
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;

export async function getUser(ctx: Pick<QueryCtx, "db">, token: string): Promise<Doc<"users"> | null> {
  if (!token) return null;
  const tokenHash = await sha256(token);
  const s = await ctx.db
    .query("sessions")
    .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
    .unique();
  if (!s || s.expiresAt < Date.now()) return null;
  const u = await ctx.db.get(s.userId);
  if (!u || u.disabled) return null;
  return u;
}

export async function requireUser(ctx: Pick<QueryCtx, "db">, token: string) {
  const u = await getUser(ctx, token);
  if (!u) throw new ConvexError("Not signed in");
  return u;
}

// ---------- usernames / passwords ----------
export function cleanUsername(raw: string) {
  const u = raw.trim().toLowerCase();
  if (!/^[a-z0-9._-]{3,32}$/.test(u)) {
    throw new ConvexError("Username must be 3-32 characters: letters, numbers, . _ -");
  }
  return u;
}

export function checkPassword(p: string) {
  if (p.length < 8) throw new ConvexError("Password must be at least 8 characters");
  if (p.length > 128) throw new ConvexError("Password is too long");
}

// ---------- AI settings ----------
export const DEFAULT_MODELS = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

export async function loadSettings(ctx: Pick<QueryCtx, "db">) {
  const row = await ctx.db
    .query("settings")
    .withIndex("by_key", (q) => q.eq("key", "main"))
    .unique();
  const models = row?.models?.length ? row.models : DEFAULT_MODELS;
  const envKey = process.env.GROQ_API_KEY;
  return {
    row,
    groqKey: row?.groqKey || envKey || undefined,
    keySource: row?.groqKey ? ("platform" as const) : envKey ? ("env" as const) : ("none" as const),
    aiEnabled: row?.aiEnabled ?? true,
    models,
    defaultModel: row?.defaultModel && models.includes(row.defaultModel) ? row.defaultModel : models[0],
  };
}

// Day boundary in India time (UTC+5:30), used for daily AI limits and charts
const IST_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export function dayStart(ts: number) {
  return Math.floor((ts + IST_MS) / DAY_MS) * DAY_MS - IST_MS;
}
export function dayLabel(ts: number) {
  return new Date(ts + IST_MS).toISOString().slice(0, 10);
}
