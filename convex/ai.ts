import { action, internalMutation, internalQuery, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { dayStart, getUser, isPlatformKey, loadSettings } from "./lib";

const GROQ = "https://api.groq.com/openai/v1";

const LANG_NAME: Record<string, string> = {
  en: "English",
  hi: "Hindi (Devanagari script)",
  gu: "Gujarati (Gujarati script)",
};
const FESTIVAL_NAME: Record<string, string> = {
  diwali: "Diwali",
  besatuvarsh: "Besatu Varsh (Gujarati New Year, the day after Diwali)",
  newyear: "the English New Year",
};
const TONES: Record<string, string> = {
  warm: "warm and heartfelt",
  formal: "polite and respectful, suitable for elders and business contacts",
  short: "very short and crisp (one or two sentences)",
  fun: "cheerful and lightly playful",
};

// ---------- what the dashboard needs to know before showing the AI button ----------
async function userState(ctx: Parameters<typeof getUser>[0], token: string) {
  const user = await getUser(ctx, token);
  if (!user) return null;
  const s = await loadSettings(ctx);

  const start = dayStart(Date.now());
  const today = await ctx.db
    .query("aiUsage")
    .withIndex("by_user", (q) => q.eq("userId", user._id).gte("at", start))
    .collect();
  const usedToday = today.filter((r) => r.ok && r.kind === "generate").length;
  const limit = user.aiDailyLimit;

  let state: "ready" | "off" | "nokey" | "user_off" | "limit" = "ready";
  if (!s.aiEnabled) state = "off";
  else if (!s.groqKey) state = "nokey";
  else if (!user.aiEnabled) state = "user_off";
  else if (limit !== undefined && usedToday >= limit) state = "limit";

  return { user, s, state, usedToday, limit };
}

export const status = query({
  args: { token: v.string() },
  handler: async (ctx, { token }) => {
    const st = await userState(ctx, token);
    if (!st) return null;
    return {
      state: st.state,
      models: st.s.models,
      defaultModel: st.s.defaultModel,
      usedToday: st.usedToday,
      dailyLimit: st.limit ?? null,
    };
  },
});

export const prepare = internalQuery({
  args: { token: v.string(), model: v.optional(v.string()) },
  handler: async (ctx, { token, model }) => {
    const st = await userState(ctx, token);
    if (!st) return { ok: false as const, error: "Please sign in again." };
    const msg: Record<string, string> = {
      off: "AI writing is switched off right now.",
      nokey: "AI writing is not set up yet. Ask the administrator.",
      user_off: "AI writing is not enabled for your account.",
      limit: `You have used today's AI limit (${st.limit}). It resets at midnight.`,
    };
    if (st.state !== "ready" || !st.s.groqKey) {
      return { ok: false as const, error: msg[st.state] ?? "AI is unavailable." };
    }
    const chosen = model && st.s.models.includes(model) ? model : st.s.defaultModel;
    return {
      ok: true as const,
      userId: st.user._id,
      username: st.user.username,
      key: st.s.groqKey,
      model: chosen,
    };
  },
});

export const record = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    username: v.string(),
    kind: v.string(),
    model: v.string(),
    ok: v.boolean(),
    promptTokens: v.number(),
    completionTokens: v.number(),
    totalTokens: v.number(),
    latencyMs: v.number(),
    status: v.optional(v.number()),
    error: v.optional(v.string()),
  },
  handler: async (ctx, a) => {
    await ctx.db.insert("aiUsage", { ...a, error: a.error?.slice(0, 500), at: Date.now() });
  },
});

// ---------- one chat completion against Groq ----------
type GroqResult =
  | { ok: true; text: string; promptTokens: number; completionTokens: number; totalTokens: number; latencyMs: number }
  | { ok: false; error: string; status?: number; latencyMs: number };

async function callGroq(
  key: string,
  model: string,
  messages: { role: string; content: string }[],
  maxTokens: number,
): Promise<GroqResult> {
  const t0 = Date.now();
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 25_000);
  try {
    const res = await fetch(`${GROQ}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: maxTokens }),
      signal: ctl.signal,
    });
    const latencyMs = Date.now() - t0;
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      const detail = body?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: String(detail), status: res.status, latencyMs };
    }
    const text: string = body?.choices?.[0]?.message?.content ?? "";
    if (!text.trim()) return { ok: false, error: "Groq returned an empty reply", status: res.status, latencyMs };
    const u = body?.usage ?? {};
    return {
      ok: true,
      text,
      promptTokens: u.prompt_tokens ?? 0,
      completionTokens: u.completion_tokens ?? 0,
      totalTokens: u.total_tokens ?? (u.prompt_tokens ?? 0) + (u.completion_tokens ?? 0),
      latencyMs,
    };
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return {
      ok: false,
      error: aborted ? "Groq timed out after 25s" : e instanceof Error ? e.message : "Network error",
      latencyMs: Date.now() - t0,
    };
  } finally {
    clearTimeout(timer);
  }
}

function friendly(status: number | undefined) {
  if (status === 401 || status === 403) return "AI is not configured correctly. Please tell the administrator.";
  if (status === 429) return "AI is busy right now. Try again in a minute.";
  if (status === 404 || status === 400) return "The AI model is not available. Please tell the administrator.";
  return "AI could not write a message. Please try again.";
}

function cleanReply(raw: string) {
  let t = raw.trim();
  t = t.replace(/^```[a-z]*\n?|```$/g, "").trim();
  t = t.replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
  t = t.replace(/\[name\]|<name>|\{\{\s*name\s*\}\}/gi, "{name}");
  return t.slice(0, 600);
}

// ---------- user: write a message with AI ----------
export const generate = action({
  args: {
    token: v.string(),
    festival: v.string(),
    lang: v.string(),
    tone: v.string(),
    withFamily: v.boolean(),
    hint: v.optional(v.string()),
    model: v.optional(v.string()),
  },
  handler: async (
    ctx,
    { token, festival, lang, tone, withFamily, hint, model },
  ): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
    const prep = await ctx.runQuery(internal.ai.prepare, { token, model });
    if (!prep.ok) return { ok: false, error: prep.error };

    const system =
      `You write short festival greeting messages that people send on WhatsApp. ` +
      `Write in ${LANG_NAME[lang] ?? "English"}. Tone: ${TONES[tone] ?? TONES.warm}. ` +
      `Maximum 3 sentences and 350 characters. Use the literal placeholder {name} exactly once where the ` +
      `recipient's name should appear. ${withFamily ? "The greeting is for the person and their family. " : ""}` +
      `Do not use hashtags, markdown, quotation marks or more than one emoji. ` +
      `Reply with the message only, nothing else.`;
    const userMsg =
      `Festival: ${FESTIVAL_NAME[festival] ?? "a festival"}.` +
      (hint?.trim() ? ` Extra instruction from the sender: ${hint.trim().slice(0, 200)}` : "");

    const r = await callGroq(prep.key, prep.model, [
      { role: "system", content: system },
      { role: "user", content: userMsg },
    ], 700);

    await ctx.runMutation(internal.ai.record, {
      userId: prep.userId as Id<"users">,
      username: prep.username,
      kind: "generate",
      model: prep.model,
      ok: r.ok,
      promptTokens: r.ok ? r.promptTokens : 0,
      completionTokens: r.ok ? r.completionTokens : 0,
      totalTokens: r.ok ? r.totalTokens : 0,
      latencyMs: r.latencyMs,
      status: r.ok ? undefined : r.status,
      error: r.ok ? undefined : r.error,
    });

    if (!r.ok) return { ok: false, error: friendly(r.status) };
    const text = cleanReply(r.text);
    if (!text) return { ok: false, error: "AI could not write a message. Please try again." };
    return { ok: true, text };
  },
});

// ---------- platform: test a key / list models ----------
export const testKey = action({
  args: { adminKey: v.string(), key: v.optional(v.string()), model: v.optional(v.string()) },
  handler: async (ctx, { adminKey, key, model }): Promise<{ ok: boolean; message: string }> => {
    if (!isPlatformKey(adminKey)) throw new Error("Unauthorized");
    const cfg = await ctx.runQuery(internal.ai.keyAndModel, {});
    const useKey = key?.trim() || cfg.key;
    const useModel = model?.trim() || cfg.model;
    if (!useKey) return { ok: false, message: "No Groq key to test. Paste one first." };

    const r = await callGroq(useKey, useModel, [{ role: "user", content: "Reply with the single word: ok" }], 10);
    await ctx.runMutation(internal.ai.record, {
      username: "(platform test)",
      kind: "test",
      model: useModel,
      ok: r.ok,
      promptTokens: r.ok ? r.promptTokens : 0,
      completionTokens: r.ok ? r.completionTokens : 0,
      totalTokens: r.ok ? r.totalTokens : 0,
      latencyMs: r.latencyMs,
      status: r.ok ? undefined : r.status,
      error: r.ok ? undefined : r.error,
    });
    return r.ok
      ? { ok: true, message: `Key works. ${useModel} answered in ${r.latencyMs} ms.` }
      : { ok: false, message: `Failed${r.status ? ` (${r.status})` : ""}: ${r.error}` };
  },
});

export const keyAndModel = internalQuery({
  args: {},
  handler: async (ctx) => {
    const s = await loadSettings(ctx);
    return { key: s.groqKey, model: s.defaultModel };
  },
});

export const fetchModels = action({
  args: { adminKey: v.string(), key: v.optional(v.string()) },
  handler: async (ctx, { adminKey, key }): Promise<{ ok: boolean; models: string[]; message?: string }> => {
    if (!isPlatformKey(adminKey)) throw new Error("Unauthorized");
    const cfg = await ctx.runQuery(internal.ai.keyAndModel, {});
    const useKey = key?.trim() || cfg.key;
    if (!useKey) return { ok: false, models: [], message: "No Groq key set yet." };
    try {
      const res = await fetch(`${GROQ}/models`, { headers: { Authorization: `Bearer ${useKey}` } });
      const body = await res.json().catch(() => null);
      if (!res.ok) return { ok: false, models: [], message: body?.error?.message ?? `HTTP ${res.status}` };
      const ids: string[] = (body?.data ?? [])
        .map((m: { id: string }) => m.id)
        .filter((id: string) => !/whisper|guard|tts|orpheus|embed|playai/i.test(id))
        .sort();
      return { ok: true, models: ids };
    } catch (e) {
      return { ok: false, models: [], message: e instanceof Error ? e.message : "Network error" };
    }
  },
});
