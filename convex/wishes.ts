import { mutation, query, MutationCtx } from "./_generated/server";
import { v } from "convex/values";

// ---------- admin guard ----------
// Single-admin protection: set the passcode with `npx convex env set ADMIN_KEY <passcode>`
function assertAdmin(adminKey: string) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) throw new Error("ADMIN_KEY is not set on the Convex deployment");
  if (adminKey !== expected) throw new Error("Unauthorized");
}

const FESTIVALS = ["diwali", "besatuvarsh", "newyear"];
const LANGS = ["en", "hi", "gu"];

const ALPHABET = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
function randomSlug(len = 9) {
  let s = "";
  for (let i = 0; i < len; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

async function uniqueSlug(ctx: MutationCtx) {
  for (let i = 0; i < 8; i++) {
    const slug = randomSlug();
    const hit = await ctx.db
      .query("recipients")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!hit) return slug;
  }
  throw new Error("Could not generate a unique slug");
}

const recipientInput = {
  name: v.string(),
  phone: v.optional(v.string()),
  festival: v.string(),
  lang: v.string(),
  withFamily: v.boolean(),
  fromName: v.string(),
  note: v.optional(v.string()),
  messageIdx: v.optional(v.number()),
  customMessage: v.optional(v.string()),
};

type RecipientFields = {
  name: string;
  phone?: string;
  festival: string;
  lang: string;
  withFamily: boolean;
  fromName: string;
  note?: string;
  messageIdx?: number;
  customMessage?: string;
};

// "{name}" in a custom message becomes the recipient's name
function cleanMessage(text: string | undefined, name: string) {
  const t = text?.trim();
  if (!t) return undefined;
  return t.slice(0, 600).split("{name}").join(name);
}

async function insertRecipient(ctx: MutationCtx, a: RecipientFields) {
  const name = a.name.trim();
  if (!name) throw new Error("Name is required");
  if (name.length > 80) throw new Error("Name is too long");
  if (!FESTIVALS.includes(a.festival)) throw new Error("Unknown festival");
  if (!LANGS.includes(a.lang)) throw new Error("Unknown language");
  const slug = await uniqueSlug(ctx);
  await ctx.db.insert("recipients", {
    name,
    slug,
    phone: a.phone?.replace(/[^\d+]/g, "") || undefined,
    festival: a.festival,
    lang: a.lang,
    withFamily: a.withFamily,
    fromName: a.fromName.trim().slice(0, 60),
    note: a.note?.trim().slice(0, 300) || undefined,
    messageIdx: a.customMessage?.trim() ? undefined : Math.max(0, Math.min(2, a.messageIdx ?? 0)),
    customMessage: cleanMessage(a.customMessage, name),
    createdAt: Date.now(),
    openCount: 0,
    replyCount: 0,
  });
  return slug;
}

// ---------- admin API ----------
export const create = mutation({
  args: { adminKey: v.string(), ...recipientInput },
  handler: async (ctx, { adminKey, ...rest }) => {
    assertAdmin(adminKey);
    return await insertRecipient(ctx, rest);
  },
});

export const createBulk = mutation({
  args: {
    adminKey: v.string(),
    people: v.array(v.object({ name: v.string(), phone: v.optional(v.string()) })),
    festival: v.string(),
    lang: v.string(),
    withFamily: v.boolean(),
    fromName: v.string(),
    note: v.optional(v.string()),
    messageIdx: v.optional(v.number()),
    customMessage: v.optional(v.string()),
  },
  handler: async (ctx, { adminKey, people, ...rest }) => {
    assertAdmin(adminKey);
    if (people.length > 200) throw new Error("Max 200 names at once");
    let created = 0;
    for (const p of people) {
      if (!p.name.trim()) continue;
      await insertRecipient(ctx, { ...rest, name: p.name, phone: p.phone });
      created++;
    }
    return created;
  },
});

export const update = mutation({
  args: { adminKey: v.string(), id: v.id("recipients"), ...recipientInput },
  handler: async (ctx, { adminKey, id, ...a }) => {
    assertAdmin(adminKey);
    const name = a.name.trim();
    if (!name) throw new Error("Name is required");
    if (!FESTIVALS.includes(a.festival)) throw new Error("Unknown festival");
    if (!LANGS.includes(a.lang)) throw new Error("Unknown language");
    const custom = cleanMessage(a.customMessage, name);
    // undefined removes the field
    await ctx.db.patch(id, {
      name,
      phone: a.phone?.replace(/[^\d+]/g, "") || undefined,
      festival: a.festival,
      lang: a.lang,
      withFamily: a.withFamily,
      fromName: a.fromName.trim().slice(0, 60),
      note: a.note?.trim().slice(0, 300) || undefined,
      messageIdx: custom ? undefined : Math.max(0, Math.min(2, a.messageIdx ?? 0)),
      customMessage: custom,
    });
  },
});

// ---------- saved message library ----------
export const templatesList = query({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertAdmin(adminKey);
    return await ctx.db.query("templates").withIndex("by_createdAt").order("desc").take(100);
  },
});

export const templateCreate = mutation({
  args: { adminKey: v.string(), title: v.string(), text: v.string(), lang: v.string() },
  handler: async (ctx, { adminKey, title, text, lang }) => {
    assertAdmin(adminKey);
    if (!text.trim()) throw new Error("Message is empty");
    if (!LANGS.includes(lang)) throw new Error("Unknown language");
    await ctx.db.insert("templates", {
      title: title.trim().slice(0, 40) || text.trim().slice(0, 30),
      text: text.trim().slice(0, 600),
      lang,
      createdAt: Date.now(),
    });
  },
});

export const templateRemove = mutation({
  args: { adminKey: v.string(), id: v.id("templates") },
  handler: async (ctx, { adminKey, id }) => {
    assertAdmin(adminKey);
    await ctx.db.delete(id);
  },
});

export const list = query({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertAdmin(adminKey);
    return await ctx.db.query("recipients").withIndex("by_createdAt").order("desc").take(500);
  },
});

export const recentEvents = query({
  args: { adminKey: v.string() },
  handler: async (ctx, { adminKey }) => {
    assertAdmin(adminKey);
    const events = await ctx.db.query("events").order("desc").take(15);
    return await Promise.all(
      events.map(async (e) => {
        const r = await ctx.db.get(e.recipientId);
        return { ...e, name: r?.name ?? "(deleted)" };
      }),
    );
  },
});

export const remove = mutation({
  args: { adminKey: v.string(), id: v.id("recipients") },
  handler: async (ctx, { adminKey, id }) => {
    assertAdmin(adminKey);
    const events = await ctx.db
      .query("events")
      .withIndex("by_recipient", (q) => q.eq("recipientId", id))
      .collect();
    for (const e of events) await ctx.db.delete(e._id);
    await ctx.db.delete(id);
  },
});

// ---------- public API (used by the card page) ----------
export const getBySlug = query({
  args: { slug: v.string() },
  handler: async (ctx, { slug }) => {
    const r = await ctx.db
      .query("recipients")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!r) return null;
    return {
      name: r.name,
      festival: r.festival,
      lang: r.lang,
      withFamily: r.withFamily,
      fromName: r.fromName,
      note: r.note ?? null,
      messageIdx: r.messageIdx ?? 0,
      customMessage: r.customMessage ?? null,
    };
  },
});

// Link-preview crawlers and scripts must not count as opens.
const BOT_RE =
  /bot|crawl|spider|preview|facebookexternalhit|whatsapp|telegram|slack|discord|skype|curl|wget|python|headless|lighthouse|embedly|vkshare|pinterest|google-read-aloud|bingpreview/i;

export const track = mutation({
  args: {
    slug: v.string(),
    type: v.union(v.literal("opened"), v.literal("viewed"), v.literal("replied")),
    ua: v.string(),
    country: v.optional(v.string()),
  },
  handler: async (ctx, { slug, type, ua, country }) => {
    if (BOT_RE.test(ua)) return { counted: false };
    const r = await ctx.db
      .query("recipients")
      .withIndex("by_slug", (q) => q.eq("slug", slug))
      .unique();
    if (!r) return { counted: false };

    const now = Date.now();
    const device = /ipad|tablet/i.test(ua)
      ? "tablet"
      : /mobi|android|iphone/i.test(ua)
        ? "mobile"
        : "desktop";
    const browser = /edg\//i.test(ua)
      ? "Edge"
      : /chrome|crios/i.test(ua)
        ? "Chrome"
        : /firefox|fxios/i.test(ua)
          ? "Firefox"
          : /safari/i.test(ua)
            ? "Safari"
            : "Other";

    await ctx.db.insert("events", { recipientId: r._id, type, at: now, device, browser, country });

    if (type === "opened") {
      await ctx.db.patch(r._id, {
        openCount: r.openCount + 1,
        firstOpenedAt: r.firstOpenedAt ?? now,
        lastOpenedAt: now,
      });
    } else if (type === "viewed") {
      if (!r.viewedAt) await ctx.db.patch(r._id, { viewedAt: now });
    } else {
      await ctx.db.patch(r._id, { replyCount: r.replyCount + 1, lastReplyAt: now });
    }
    return { counted: true };
  },
});
