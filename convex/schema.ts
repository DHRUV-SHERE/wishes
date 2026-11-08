import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ---------- accounts ----------
  users: defineTable({
    username: v.string(), // lowercase, unique
    name: v.optional(v.string()), // display name
    passwordHash: v.string(),
    salt: v.string(),
    disabled: v.boolean(),
    aiEnabled: v.boolean(), // per-user AI switch
    aiDailyLimit: v.optional(v.number()), // max AI generations per day (undefined = unlimited)
    createdAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    failedLogins: v.number(),
    lockedUntil: v.optional(v.number()),
  }).index("by_username", ["username"]),

  sessions: defineTable({
    tokenHash: v.string(), // sha-256 of the token; the token itself is never stored
    userId: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.number(),
  })
    .index("by_hash", ["tokenHash"])
    .index("by_user", ["userId"]),

  // ---------- platform settings (single row, key = "main") ----------
  settings: defineTable({
    key: v.string(),
    groqKey: v.optional(v.string()),
    aiEnabled: v.optional(v.boolean()), // global AI kill switch
    models: v.optional(v.array(v.string())), // models users may pick
    defaultModel: v.optional(v.string()),
    updatedAt: v.number(),
  }).index("by_key", ["key"]),

  // one row per AI call (success or failure)
  aiUsage: defineTable({
    userId: v.optional(v.id("users")), // empty for platform tests
    username: v.string(), // snapshot, survives user deletion
    kind: v.string(), // generate | test
    model: v.string(),
    ok: v.boolean(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    latencyMs: v.number(),
    status: v.optional(v.number()), // http status when failed
    error: v.optional(v.string()),
    at: v.number(),
  })
    .index("by_at", ["at"])
    .index("by_user", ["userId", "at"]),

  // ---------- wishes (every row belongs to one user) ----------
  recipients: defineTable({
    ownerId: v.optional(v.id("users")), // missing = created before accounts existed
    name: v.string(),
    slug: v.string(),
    phone: v.optional(v.string()),
    festival: v.string(), // diwali | besatuvarsh | newyear
    lang: v.string(), // en | hi | gu
    withFamily: v.boolean(),
    fromName: v.string(),
    note: v.optional(v.string()),
    messageIdx: v.optional(v.number()), // which preset message (0-2)
    customMessage: v.optional(v.string()), // replaces the preset when set
    createdAt: v.number(),
    // tracking summary (updated on every event)
    openCount: v.number(), // page loads by real browsers
    firstOpenedAt: v.optional(v.number()),
    lastOpenedAt: v.optional(v.number()),
    viewedAt: v.optional(v.number()), // tapped the card open
    replyCount: v.number(),
    lastReplyAt: v.optional(v.number()),
  })
    .index("by_slug", ["slug"])
    .index("by_createdAt", ["createdAt"])
    .index("by_owner", ["ownerId", "createdAt"]),

  // the sender's own saved messages, reusable for anyone
  templates: defineTable({
    ownerId: v.optional(v.id("users")),
    title: v.string(),
    text: v.string(),
    lang: v.string(),
    createdAt: v.number(),
  })
    .index("by_createdAt", ["createdAt"])
    .index("by_owner", ["ownerId", "createdAt"]),

  events: defineTable({
    ownerId: v.optional(v.id("users")),
    recipientId: v.id("recipients"),
    type: v.string(), // opened | viewed | replied
    at: v.number(),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
  })
    .index("by_recipient", ["recipientId", "at"])
    .index("by_owner", ["ownerId", "at"]),
});
