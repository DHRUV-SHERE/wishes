"use client";

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

export default function MessagePicker({
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
