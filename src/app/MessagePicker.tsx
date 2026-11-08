"use client";

import { useState } from "react";
import { useAction, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc, Id } from "../../convex/_generated/dataModel";
import { Festival, Lang, PALETTES, PRESET_LABELS, TEXT, UI, resolveMessage } from "@/lib/content";

export type Mode = number | "custom";

export function Seg<T extends string | number>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { id: T; label: string }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={`cursor-pointer rounded-full border px-3.5 py-1.5 text-sm transition ${
            value === o.id
              ? "border-orange-600 bg-orange-600 text-white"
              : "border-stone-300 bg-white text-stone-700 hover:border-orange-400"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

const TONES = [
  { id: "warm", label: "Warm" },
  { id: "formal", label: "Formal" },
  { id: "short", label: "Short" },
  { id: "fun", label: "Fun" },
];

const AI_OFF: Record<string, string> = {
  off: "AI writing is switched off right now.",
  nokey: "AI writing is not set up yet.",
  user_off: "AI writing is not enabled for your account.",
  limit: "You have reached today's AI limit.",
};

function AiWriter({
  token,
  festival,
  lang,
  withFamily,
  onText,
}: {
  token: string;
  festival: Festival;
  lang: Lang;
  withFamily: boolean;
  onText: (t: string) => void;
}) {
  const status = useQuery(api.ai.status, { token });
  const generate = useAction(api.ai.generate);
  const [tone, setTone] = useState("warm");
  const [hint, setHint] = useState("");
  const [model, setModel] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  if (!status) return null;
  const ready = status.state === "ready";

  async function run() {
    setBusy(true);
    setErr("");
    try {
      const r = await generate({ token, festival, lang, tone, withFamily, hint: hint || undefined, model: model || undefined });
      if (r.ok) onText(r.text);
      else setErr(r.error);
    } catch {
      setErr("AI could not write a message. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-2 rounded-xl border border-orange-200 bg-orange-50/60 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-orange-900">✨ Write with AI</span>
        <div role="radiogroup" aria-label="Tone" className="flex flex-wrap gap-1">
          {TONES.map((t) => (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={tone === t.id}
              disabled={!ready}
              onClick={() => setTone(t.id)}
              className={`cursor-pointer rounded-full border px-2.5 py-0.5 text-xs disabled:cursor-default disabled:opacity-50 ${
                tone === t.id ? "border-orange-600 bg-orange-600 text-white" : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
        {status.models.length > 1 && (
          <select
            value={model || status.defaultModel}
            onChange={(e) => setModel(e.target.value)}
            disabled={!ready}
            aria-label="AI model"
            className="rounded-lg border border-stone-300 bg-white px-2 py-0.5 text-xs"
          >
            {status.models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        )}
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={hint}
          onChange={(e) => setHint(e.target.value)}
          maxLength={200}
          disabled={!ready}
          placeholder="Optional: who is it for, or what to mention (e.g. my teacher, thank you for guidance)"
          aria-label="What should the AI mention"
          className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm outline-none focus:border-orange-500 disabled:opacity-50"
        />
        <button
          type="button"
          onClick={run}
          disabled={!ready || busy}
          className="cursor-pointer rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-default disabled:opacity-50"
        >
          {busy ? "Writing…" : "Generate"}
        </button>
      </div>
      <p aria-live="polite" className={`text-xs ${err || !ready ? "text-red-700" : "text-stone-500"}`}>
        {err ||
          (!ready
            ? AI_OFF[status.state]
            : `Replaces the text below. Edit it freely afterwards.${
                status.dailyLimit !== null ? ` Today: ${status.usedToday}/${status.dailyLimit} used.` : ""
              }`)}
      </p>
    </div>
  );
}

export default function MessagePicker({
  token,
  festival,
  lang,
  name,
  withFamily,
  mode,
  setMode,
  custom,
  setCustom,
  saveToLib,
  setSaveToLib,
  templates,
  onDeleteTemplate,
}: {
  token: string;
  festival: Festival;
  lang: Lang;
  name: string;
  withFamily: boolean;
  mode: Mode;
  setMode: (m: Mode) => void;
  custom: string;
  setCustom: (s: string) => void;
  saveToLib?: boolean;
  setSaveToLib?: (b: boolean) => void;
  templates?: Doc<"templates">[];
  onDeleteTemplate?: (id: Id<"templates">) => void;
}) {
  const t = TEXT[festival][lang];
  const pal = PALETTES[festival][0];
  const sample = name.trim() || "Rahul";
  const shown =
    mode === "custom"
      ? custom.split("{name}").join(sample).trim() || "…"
      : resolveMessage(festival, lang, mode, null);
  const mine = (templates ?? []).filter((x) => x.lang === lang);

  return (
    <div className="grid gap-4 md:grid-cols-[1fr_300px]">
      <div className="space-y-3">
        <Seg<Mode>
          label="Message"
          value={mode}
          onChange={setMode}
          options={[
            ...PRESET_LABELS.map((l, i) => ({ id: i as Mode, label: l })),
            { id: "custom" as Mode, label: "✍️ Write my own" },
          ]}
        />

        {mode === "custom" && (
          <div className="space-y-2">
            <AiWriter token={token} festival={festival} lang={lang} withFamily={withFamily} onText={setCustom} />
            <textarea
              value={custom}
              onChange={(e) => setCustom(e.target.value)}
              rows={4}
              maxLength={600}
              placeholder={`Write your message. Use {name} to insert their name.\nExample: Dear {name}, wishing you a very happy Diwali…`}
              aria-label="Custom message"
              className="w-full rounded-xl border border-stone-300 px-4 py-3 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              {setSaveToLib ? (
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={!!saveToLib}
                    onChange={(e) => setSaveToLib(e.target.checked)}
                    className="size-4 accent-orange-600"
                  />
                  Save to my messages
                </label>
              ) : (
                <span />
              )}
              <span>{custom.length}/600</span>
            </div>

            {mine.length > 0 && (
              <div>
                <p className="mb-1.5 text-xs font-medium text-stone-600">My saved messages</p>
                <ul className="flex flex-wrap gap-1.5">
                  {mine.map((m) => (
                    <li key={m._id} className="flex items-center rounded-full border border-stone-300 bg-white text-sm">
                      <button
                        type="button"
                        title={m.text}
                        onClick={() => setCustom(m.text)}
                        className="max-w-48 cursor-pointer truncate py-1 pl-3 pr-2 hover:text-orange-700"
                      >
                        {m.title}
                      </button>
                      {onDeleteTemplate && (
                        <button
                          type="button"
                          aria-label={`Delete saved message ${m.title}`}
                          onClick={() => onDeleteTemplate(m._id)}
                          className="cursor-pointer py-1 pl-1 pr-2.5 text-stone-400 hover:text-red-600"
                        >
                          ×
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <div
        className="rounded-2xl p-5 text-center text-sm"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${pal.c1}, ${pal.c2} 55%, ${pal.c3})`,
          color: "#fff6e6",
        }}
        aria-label="Live preview"
      >
        <p className="text-[10px] uppercase tracking-[0.25em]" style={{ color: pal.accent }}>
          {t.year}
        </p>
        <p className={`font-card-${lang} mt-2 text-sm`} style={{ color: pal.accent2 }}>
          {UI[lang].to(sample, withFamily)}
        </p>
        <p className={`font-card-${lang} mt-1 text-xl font-bold`} style={{ color: pal.accent }}>
          {t.title}
        </p>
        <p className={`font-card-${lang} mt-3 leading-relaxed opacity-95`}>{shown}</p>
      </div>
    </div>
  );
}
