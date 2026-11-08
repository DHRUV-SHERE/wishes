import { MutationCtx, mutation, query } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import {
  assertPlatform,
  checkPassword,
  cleanUsername,
  dayLabel,
  dayStart,
  hashPassword,
  isPlatformKey,
  loadSettings,
  randomHex,
} from "./lib";

// Everything here is for the platform admin only (ADMIN_KEY).

export const verify = query({
  args: { adminKey: v.string() },
  handler: async (_ctx, { adminKey }) => isPlatformKey(adminKey),
});

// ---------- overview + users table ----------
export const overview = query({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertPlatform(adminKey);
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    const since = dayStart(now);

    const rows = await Promise.all(
      users.map(async (u) => {
        const links = await ctx.db
          .query("recipients")
          .withIndex("by_owner", (q) => q.eq("ownerId", u._id))
          .take(5000);
        const usage = await ctx.db
          .query("aiUsage")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .order("desc")
          .take(2000);
        const lastErr = usage.find((x) => !x.ok);
        return {
          id: u._id,
          username: u.username,
          name: u.name ?? null,
          disabled: u.disabled,
          aiEnabled: u.aiEnabled,
          aiDailyLimit: u.aiDailyLimit ?? null,
          createdAt: u.createdAt,
          lastLoginAt: u.lastLoginAt ?? null,
          links: links.length,
          opened: links.filter((r) => r.openCount > 0).length,
          viewed: links.filter((r) => r.viewedAt).length,
          replied: links.filter((r) => r.replyCount > 0).length,
          lastLinkAt: links[0]?.createdAt ?? null,
          aiCalls: usage.filter((x) => x.kind === "generate").length,
          aiToday: usage.filter((x) => x.kind === "generate" && x.ok && x.at >= since).length,
          aiErrors: usage.filter((x) => !x.ok).length,
          aiTokens: usage.reduce((n, x) => n + x.totalTokens, 0),
          lastAiError: lastErr ? { error: lastErr.error ?? "", at: lastErr.at } : null,
        };
      }),
    );

    const legacy = await ctx.db
      .query("recipients")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .take(1001);

    const recent = await ctx.db
      .query("aiUsage")
      .withIndex("by_at", (q) => q.gte("at", now - 24 * 60 * 60 * 1000))
      .collect();

    return {
      users: rows.sort((a, b) => b.createdAt - a.createdAt),
      legacyLinks: legacy.length,
      totals: {
        users: rows.length,
        activeUsers: rows.filter((r) => !r.disabled).length,
        links: rows.reduce((n, r) => n + r.links, 0),
        opened: rows.reduce((n, r) => n + r.opened, 0),
        replied: rows.reduce((n, r) => n + r.replied, 0),
        aiCalls24h: recent.filter((x) => x.kind === "generate").length,
        aiErrors24h: recent.filter((x) => !x.ok).length,
        tokens24h: recent.reduce((n, x) => n + x.totalTokens, 0),
      },
    };
  },
});

export const userLinks = query({
  args: { adminKey: v.string(), userId: v.id("users") },
  handler: async (ctx, { adminKey, userId }) => {
    assertPlatform(adminKey);
    const links = await ctx.db
      .query("recipients")
      .withIndex("by_owner", (q) => q.eq("ownerId", userId))
      .order("desc")
      .take(500);
    // recipient phone numbers are deliberately not exposed here
    return links.map((r) => ({
      id: r._id,
      name: r.name,
      slug: r.slug,
      festival: r.festival,
      lang: r.lang,
      createdAt: r.createdAt,
      openCount: r.openCount,
      lastOpenedAt: r.lastOpenedAt ?? null,
      viewedAt: r.viewedAt ?? null,
      replyCount: r.replyCount,
      custom: !!r.customMessage,
    }));
  },
});

// ---------- user management ----------
export const createUser = mutation({
  args: {
    adminKey: v.string(),
    username: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
    aiEnabled: v.boolean(),
    aiDailyLimit: v.optional(v.number()),
  },
  handler: async (ctx, { adminKey, username, password, name, aiEnabled, aiDailyLimit }) => {
    assertPlatform(adminKey);
    const uname = cleanUsername(username);
    checkPassword(password);
    const taken = await ctx.db
      .query("users")
      .withIndex("by_username", (q) => q.eq("username", uname))
      .unique();
    if (taken) throw new ConvexError("That username is already taken");
    const salt = randomHex(16);
    return await ctx.db.insert("users", {
      username: uname,
      name: name?.trim().slice(0, 60) || undefined,
      passwordHash: await hashPassword(password, salt),
      salt,
      disabled: false,
      aiEnabled,
      aiDailyLimit: aiDailyLimit !== undefined && aiDailyLimit >= 0 ? Math.floor(aiDailyLimit) : undefined,
      createdAt: Date.now(),
      failedLogins: 0,
    });
  },
});

export const updateUser = mutation({
  args: {
    adminKey: v.string(),
    id: v.id("users"),
    name: v.optional(v.string()),
    disabled: v.optional(v.boolean()),
    aiEnabled: v.optional(v.boolean()),
    // -1 means "remove the limit"
    aiDailyLimit: v.optional(v.number()),
  },
  handler: async (ctx, { adminKey, id, name, disabled, aiEnabled, aiDailyLimit }) => {
    assertPlatform(adminKey);
    const u = await ctx.db.get(id);
    if (!u) throw new ConvexError("User not found");
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = name.trim().slice(0, 60) || undefined;
    if (disabled !== undefined) patch.disabled = disabled;
    if (aiEnabled !== undefined) patch.aiEnabled = aiEnabled;
    if (aiDailyLimit !== undefined) patch.aiDailyLimit = aiDailyLimit < 0 ? undefined : Math.floor(aiDailyLimit);
    await ctx.db.patch(id, patch);
    if (disabled) {
      const sessions = await ctx.db
        .query("sessions")
        .withIndex("by_user", (q) => q.eq("userId", id))
        .collect();
      for (const s of sessions) await ctx.db.delete(s._id);
    }
  },
});

export const resetPassword = mutation({
  args: { adminKey: v.string(), id: v.id("users"), password: v.string() },
  handler: async (ctx, { adminKey, id, password }) => {
    assertPlatform(adminKey);
    checkPassword(password);
    const u = await ctx.db.get(id);
    if (!u) throw new ConvexError("User not found");
    const salt = randomHex(16);
    await ctx.db.patch(id, {
      salt,
      passwordHash: await hashPassword(password, salt),
      failedLogins: 0,
      lockedUntil: undefined,
    });
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
  },
});

// deletes the account together with all of its links, events, saved messages and sessions
export const removeUser = mutation({
  args: { adminKey: v.string(), id: v.id("users") },
  handler: async (ctx, { adminKey, id }) => {
    assertPlatform(adminKey);
    const links = await ctx.db
      .query("recipients")
      .withIndex("by_owner", (q) => q.eq("ownerId", id))
      .collect();
    for (const r of links) {
      const events = await ctx.db
        .query("events")
        .withIndex("by_recipient", (q) => q.eq("recipientId", r._id))
        .collect();
      for (const e of events) await ctx.db.delete(e._id);
      await ctx.db.delete(r._id);
    }
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_owner", (q) => q.eq("ownerId", id))
      .collect();
    for (const t of templates) await ctx.db.delete(t._id);
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q) => q.eq("userId", id))
      .collect();
    for (const s of sessions) await ctx.db.delete(s._id);
    await ctx.db.delete(id);
    return { links: links.length };
  },
});

// Wishes made before accounts existed have no owner. Hand them to a user (up to 300 per call).
export const assignLegacy = mutation({
  args: { adminKey: v.string(), userId: v.id("users") },
  handler: async (ctx, { adminKey, userId }) => {
    assertPlatform(adminKey);
    if (!(await ctx.db.get(userId))) throw new ConvexError("User not found");
    const links = await ctx.db
      .query("recipients")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .take(300);
    for (const r of links) {
      await ctx.db.patch(r._id, { ownerId: userId });
      const events = await ctx.db
        .query("events")
        .withIndex("by_recipient", (q) => q.eq("recipientId", r._id))
        .collect();
      for (const e of events) await ctx.db.patch(e._id, { ownerId: userId });
    }
    const templates = await ctx.db
      .query("templates")
      .withIndex("by_owner", (q) => q.eq("ownerId", undefined))
      .take(200);
    for (const t of templates) await ctx.db.patch(t._id, { ownerId: userId });
    return { moved: links.length, more: links.length === 300 };
  },
});

// ---------- Groq / AI settings ----------
export const settings = query({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertPlatform(adminKey);
    const s = await loadSettings(ctx);
    return {
      keySource: s.keySource,
      keyHint: s.groqKey ? `••••${s.groqKey.slice(-4)}` : null, // the key itself never leaves the server
      aiEnabled: s.aiEnabled,
      models: s.models,
      defaultModel: s.defaultModel,
    };
  },
});

async function upsertSettings(ctx: MutationCtx, patch: Record<string, unknown>) {
  const { row } = await loadSettings(ctx);
  if (row) await ctx.db.patch(row._id, { ...patch, updatedAt: Date.now() });
  else await ctx.db.insert("settings", { key: "main", ...patch, updatedAt: Date.now() });
}

export const setGroqKey = mutation({
  args: { adminKey: v.string(), key: v.string() },
  handler: async (ctx, { adminKey, key }) => {
    assertPlatform(adminKey);
    const k = key.trim();
    if (k.length < 20) throw new ConvexError("That does not look like a Groq API key");
    await upsertSettings(ctx, { groqKey: k });
  },
});

export const clearGroqKey = mutation({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertPlatform(adminKey);
    await upsertSettings(ctx, { groqKey: undefined });
  },
});

export const saveAiConfig = mutation({
  args: {
    adminKey: v.string(),
    aiEnabled: v.boolean(),
    models: v.array(v.string()),
    defaultModel: v.string(),
  },
  handler: async (ctx, { adminKey, aiEnabled, models, defaultModel }) => {
    assertPlatform(adminKey);
    const list = [...new Set(models.map((m) => m.trim()).filter(Boolean))].slice(0, 30);
    if (!list.length) throw new ConvexError("Keep at least one model");
    if (!list.includes(defaultModel)) throw new ConvexError("The default model must be in the list");
    await upsertSettings(ctx, { aiEnabled, models: list, defaultModel });
  },
});

// ---------- usage report ----------
export const usage = query({
  args: { adminKey: v.string(), days: v.number() },
  handler: async (ctx, { adminKey, days }) => {
    assertPlatform(adminKey);
    const span = Math.min(Math.max(Math.floor(days), 1), 90);
    const since = dayStart(Date.now()) - (span - 1) * 24 * 60 * 60 * 1000;
    const LIMIT = 5000;
    const rows = await ctx.db
      .query("aiUsage")
      .withIndex("by_at", (q) => q.gte("at", since))
      .order("desc")
      .take(LIMIT);

    type Agg = {
      calls: number;
      ok: number;
      errors: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      latency: number;
      lastAt: number;
      lastError: string | null;
    };
    const blank = (): Agg => ({
      calls: 0, ok: 0, errors: 0, promptTokens: 0, completionTokens: 0, totalTokens: 0, latency: 0, lastAt: 0, lastError: null,
    });
    const add = (a: Agg, r: (typeof rows)[number]) => {
      a.calls++;
      if (r.ok) a.ok++;
      else {
        a.errors++;
        if (!a.lastError) a.lastError = r.error ?? "error"; // rows are newest first
      }
      a.promptTokens += r.promptTokens;
      a.completionTokens += r.completionTokens;
      a.totalTokens += r.totalTokens;
      a.latency += r.latencyMs;
      a.lastAt = Math.max(a.lastAt, r.at);
    };

    const total = blank();
    const byUser = new Map<string, Agg & { username: string }>();
    const byModel = new Map<string, Agg>();
    const byDay = new Map<string, Agg>();
    for (const r of rows) {
      add(total, r);
      const uk = r.userId ?? "platform";
      if (!byUser.has(uk)) byUser.set(uk, { ...blank(), username: r.username });
      add(byUser.get(uk)!, r);
      if (!byModel.has(r.model)) byModel.set(r.model, blank());
      add(byModel.get(r.model)!, r);
      const d = dayLabel(r.at);
      if (!byDay.has(d)) byDay.set(d, blank());
      add(byDay.get(d)!, r);
    }

    const avg = (a: Agg) => (a.calls ? Math.round(a.latency / a.calls) : 0);
    const out = (a: Agg) => ({ ...a, avgLatencyMs: avg(a) });

    return {
      days: span,
      truncated: rows.length === LIMIT,
      total: out(total),
      byUser: [...byUser.entries()]
        .map(([id, a]) => ({ id, username: a.username, ...out(a) }))
        .sort((a, b) => b.totalTokens - a.totalTokens),
      byModel: [...byModel.entries()]
        .map(([model, a]) => ({ model, ...out(a) }))
        .sort((a, b) => b.totalTokens - a.totalTokens),
      byDay: [...byDay.entries()]
        .map(([day, a]) => ({ day, calls: a.calls, errors: a.errors, tokens: a.totalTokens }))
        .sort((a, b) => a.day.localeCompare(b.day)),
      errors: rows
        .filter((r) => !r.ok)
        .slice(0, 50)
        .map((r) => ({
          id: r._id,
          at: r.at,
          username: r.username,
          kind: r.kind,
          model: r.model,
          status: r.status ?? null,
          error: r.error ?? "",
        })),
    };
  },
});
