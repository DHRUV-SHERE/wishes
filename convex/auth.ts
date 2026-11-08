import { mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  SESSION_MS,
  checkPassword,
  getUser,
  hashPassword,
  randomHex,
  safeEqual,
  sha256,
} from "./lib";

const MAX_FAILS = 5;
const LOCK_MS = 10 * 60 * 1000;
const BAD = "Wrong username or password";

export const login = mutation({
  args: { username: v.string(), password: v.string() },
  handler: async (ctx, { username, password }) => {
    const uname = username.trim().toLowerCase();
    const u = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", uname))
      .unique();

    if (!u) {
      await hashPassword(password, "no-such-user"); // keep timing similar
      return { ok: false as const, error: BAD };
    }
    const now = Date.now();
    if (u.lockedUntil && u.lockedUntil > now) {
      return { ok: false as const, error: "Too many wrong attempts. Try again in a few minutes." };
    }
    const hash = await hashPassword(password, u.salt);
    if (!safeEqual(hash, u.passwordHash)) {
      const fails = u.failedLogins + 1;
      await ctx.db.patch(u._id, {
        failedLogins: fails >= MAX_FAILS ? 0 : fails,
        lockedUntil: fails >= MAX_FAILS ? now + LOCK_MS : undefined,
      });
      return { ok: false as const, error: BAD };
    }
    if (u.disabled) {
      return { ok: false as const, error: "This account is disabled. Contact the administrator." };
    }

    // drop this user's expired sessions, then open a new one
    const old = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", u._id))
      .collect();
    for (const s of old) if (s.expiresAt < now) await ctx.db.delete(s._id);

    const token = randomHex(32);
    await ctx.db.insert("sessions", {
      tokenHash: await sha256(token),
      userId: u._id,
      createdAt: now,
      expiresAt: now + SESSION_MS,
    });
    await ctx.db.patch(u._id, { lastLoginAt: now, failedLogins: 0, lockedUntil: undefined });
    return { ok: true as const, token };
  },
});

// null when the token is missing, expired, or the account is disabled/deleted
export const me = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const u = await getUser(ctx, token);
    if (!u) return null;
    return { id: u._id, username: u.username, name: u.name ?? null };
  },
});

export const logout = mutation({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const tokenHash = await sha256(token);
    const s = await ctx.db
      .query("sessions")
      .withIndex("by_hash", (q) => q.eq("tokenHash", tokenHash))
      .unique();
    if (s) await ctx.db.delete(s._id);
  },
});

export const changePassword = mutation({
  args: { token: v.string(), oldPassword: v.string(), newPassword: v.string() },
  handler: async (ctx, { token, oldPassword, newPassword }) => {
    const u = await getUser(ctx, token);
    if (!u) throw new ConvexError("Not signed in");
    const hash = await hashPassword(oldPassword, u.salt);
    if (!safeEqual(hash, u.passwordHash)) throw new ConvexError("Current password is wrong");
    checkPassword(newPassword);
    const salt = randomHex(16);
    await ctx.db.patch(u._id, { salt, passwordHash: await hashPassword(newPassword, salt) });

    // sign out every other device
    const keep = await sha256(token);
    const all = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", u._id))
      .collect();
    for (const s of all) if (s.tokenHash !== keep) await ctx.db.delete(s._id);
  },
});
