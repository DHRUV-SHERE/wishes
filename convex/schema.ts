import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  recipients: defineTable({
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
    .index("by_createdAt", ["createdAt"]),

  // the sender's own saved messages, reusable for anyone
  templates: defineTable({
    title: v.string(),
    text: v.string(),
    lang: v.string(),
    createdAt: v.number(),
  }).index("by_createdAt", ["createdAt"]),

  events: defineTable({
    recipientId: v.id("recipients"),
    type: v.string(), // opened | viewed | replied
    at: v.number(),
    device: v.optional(v.string()),
    browser: v.optional(v.string()),
    country: v.optional(v.string()),
  }).index("by_recipient", ["recipientId", "at"]),
});
