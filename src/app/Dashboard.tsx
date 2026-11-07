"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { FESTIVALS, LANGS, Festival, Lang, shareMessage } from "@/lib/content";

type Filter = "all" | "waiting" | "opened" | "viewed" | "replied";

function ago(ts: number, now: number) {
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

function Seg<T extends string>({
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
          key={o.id}
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

export default function Dashboard({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const list = useQuery(api.wishes.list, { adminKey });
  const events = useQuery(api.wishes.recentEvents, { adminKey });
  const create = useMutation(api.wishes.create);
  const createBulk = useMutation(api.wishes.createBulk);
  const remove = useMutation(api.wishes.remove);

  const [festival, setFestival] = useState<Festival>("diwali");
  const [lang, setLang] = useState<Lang>("gu");
  const [withFamily, setWithFamily] = useState(true);
  const [fromName, setFromName] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [bulk, setBulk] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [last, setLast] = useState<{ link: string; text: string; phone?: string } | null>(null);
  const [now, setNow] = useState(() => Date.now());

  // remember sender settings
  useEffect(() => {
    try {
      const s = JSON.parse(localStorage.getItem("wishes-prefs") ?? "{}");
      if (s.festival) setFestival(s.festival);
      if (s.lang) setLang(s.lang);
      if (typeof s.withFamily === "boolean") setWithFamily(s.withFamily);
      if (s.fromName) setFromName(s.fromName);
    } catch {
      /* ignore */
    }
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem("wishes-prefs", JSON.stringify({ festival, lang, withFamily, fromName }));
    } catch {
      /* ignore */
    }
  }, [festival, lang, withFamily, fromName]);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const linkFor = (slug: string) => `${window.location.origin}/w/${slug}`;
  const waUrl = (text: string, p?: string) =>
    `https://wa.me/${p ? p.replace(/\D/g, "") : ""}?text=${encodeURIComponent(text)}`;

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setMsg("Copied ✓");
    } catch {
      setMsg("Could not copy — select and copy manually");
    }
    setTimeout(() => setMsg(""), 2000);
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    try {
      const slug = await create({
        adminKey,
        name,
        phone: phone || undefined,
        festival,
        lang,
        withFamily,
        fromName,
        note: note || undefined,
      });
      const link = linkFor(slug);
      const text = shareMessage(festival, lang, name.trim(), withFamily, link);
      setLast({ link, text, phone: phone || undefined });
      copy(link);
      setName("");
      setPhone("");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  async function onBulk() {
    const people = bulk
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .map((l) => {
        const [n, p] = l.split(",").map((x) => x.trim());
        return { name: n, phone: p || undefined };
      });
    if (!people.length || busy) return;
    setBusy(true);
    try {
      const n = await createBulk({
        adminKey,
        people,
        festival,
        lang,
        withFamily,
        fromName,
        note: note || undefined,
      });
      setBulk("");
      setMsg(`${n} links created ✓`);
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  const rows = useMemo(() => {
    const all = list ?? [];
    return all.filter((r) => {
      if (filter === "waiting") return r.openCount === 0;
      if (filter === "opened") return r.openCount > 0;
      if (filter === "viewed") return !!r.viewedAt;
      if (filter === "replied") return r.replyCount > 0;
      return true;
    });
  }, [list, filter]);

  const total = list?.length ?? 0;
  const opened = list?.filter((r) => r.openCount > 0).length ?? 0;
  const viewed = list?.filter((r) => r.viewedAt).length ?? 0;
  const replied = list?.filter((r) => r.replyCount > 0).length ?? 0;

  const stats: { label: string; value: number; key: Filter }[] = [
    { label: "Sent", value: total, key: "all" },
    { label: "Opened", value: opened, key: "opened" },
    { label: "Viewed card", value: viewed, key: "viewed" },
    { label: "Replied", value: replied, key: "replied" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <h1 className="font-card-en text-2xl font-bold sm:text-3xl">🪔 Festival Wishes</h1>
        <button onClick={onLogout} className="cursor-pointer text-sm text-stone-500 underline hover:text-stone-800">
          Log out
        </button>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.map((s) => (
          <button
            key={s.label}
            onClick={() => setFilter(s.key)}
            className="cursor-pointer rounded-2xl border border-stone-200 bg-white p-4 text-left transition hover:border-orange-400"
          >
            <div className="text-3xl font-semibold tabular-nums">{list ? s.value : "–"}</div>
            <div className="text-sm text-stone-600">
              {s.label}
              {s.key !== "all" && total > 0 && list ? ` · ${Math.round((s.value / total) * 100)}%` : ""}
            </div>
          </button>
        ))}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <form onSubmit={onAdd} className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Type a name and press Enter"
              aria-label="Recipient name"
              className="min-w-0 flex-1 rounded-xl border border-stone-300 px-4 py-3 text-lg outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
            />
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="WhatsApp no. (optional, with 91)"
              aria-label="Phone"
              inputMode="tel"
              className="rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 sm:w-64"
            />
            <button
              disabled={busy || !name.trim()}
              className="cursor-pointer rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-default disabled:opacity-50"
            >
              Create link
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Seg
              label="Festival"
              value={festival}
              onChange={setFestival}
              options={FESTIVALS.map((f) => ({ id: f.id, label: `${f.emoji} ${f.label}` }))}
            />
            <Seg label="Language" value={lang} onChange={setLang} options={LANGS} />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={withFamily}
                onChange={(e) => setWithFamily(e.target.checked)}
                className="size-4 accent-orange-600"
              />
              “& Family”
            </label>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              value={fromName}
              onChange={(e) => setFromName(e.target.value)}
              placeholder="From (your name / family name)"
              aria-label="From"
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
            />
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Personal note (optional)"
              aria-label="Personal note"
              maxLength={300}
              className="rounded-xl border border-stone-300 px-4 py-2.5 text-sm outline-none focus:border-orange-500"
            />
          </div>
        </form>

        {last && (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-green-50 p-3 text-sm">
            <span className="font-medium text-green-800">Link ready:</span>
            <code className="min-w-0 flex-1 truncate text-stone-700">{last.link}</code>
            <button onClick={() => copy(last.link)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:border-orange-400">
              Copy link
            </button>
            <button onClick={() => copy(last.text)} className="cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 hover:border-orange-400">
              Copy message
            </button>
            <a
              href={waUrl(last.text, last.phone)}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700"
            >
              WhatsApp
            </a>
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-stone-600 hover:text-stone-900">
            Add many people at once
          </summary>
          <div className="mt-3 space-y-2">
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={5}
              placeholder={"One per line. Optional phone after a comma:\nRahul Patel, 919876543210\nMeena Shah"}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <button
              onClick={onBulk}
              disabled={busy || !bulk.trim()}
              className="cursor-pointer rounded-xl border border-orange-600 px-4 py-2 font-medium text-orange-700 hover:bg-orange-50 disabled:cursor-default disabled:opacity-50"
            >
              Create all links
            </button>
          </div>
        </details>
        <p aria-live="polite" className="min-h-5 text-sm text-stone-600">{msg}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {(
              [
                ["all", "All"],
                ["waiting", "Not opened yet"],
                ["opened", "Opened"],
                ["viewed", "Viewed card"],
                ["replied", "Replied"],
              ] as [Filter, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                onClick={() => setFilter(k)}
                className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                  filter === k ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {list === undefined ? (
            <p className="text-stone-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              {total === 0 ? "No wishes yet. Type a name above and press Enter." : "Nobody in this filter."}
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => {
                const link = linkFor(r.slug);
                const text = shareMessage(r.festival as Festival, r.lang as Lang, r.name, r.withFamily, link);
                const status = r.replyCount
                  ? { t: "Replied", c: "bg-purple-100 text-purple-800" }
                  : r.viewedAt
                    ? { t: "Viewed card", c: "bg-green-100 text-green-800" }
                    : r.openCount
                      ? { t: "Opened", c: "bg-amber-100 text-amber-800" }
                      : { t: "Not opened", c: "bg-stone-100 text-stone-600" };
                const fest = FESTIVALS.find((f) => f.id === r.festival);
                return (
                  <li key={r._id} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.c}`}>{status.t}</span>
                      <span className="text-xs text-stone-500">
                        {fest?.emoji} {fest?.label} · {r.lang.toUpperCase()}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {r.lastOpenedAt
                        ? `Opened ${r.openCount}× · first ${ago(r.firstOpenedAt ?? r.lastOpenedAt, now)} · last ${ago(r.lastOpenedAt, now)}`
                        : `Created ${ago(r.createdAt, now)} · not opened yet`}
                      {r.replyCount ? ` · replied ${ago(r.lastReplyAt ?? r.createdAt, now)}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button onClick={() => copy(link)} className="cursor-pointer rounded-lg border border-stone-300 px-3 py-1 hover:border-orange-400">
                        Copy link
                      </button>
                      <a
                        href={waUrl(text, r.phone)}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg bg-green-600 px-3 py-1 font-medium text-white hover:bg-green-700"
                      >
                        WhatsApp
                      </a>
                      <a
                        href={`${link}?p=1`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-lg border border-stone-300 px-3 py-1 hover:border-orange-400"
                        title="Preview does not count as an open"
                      >
                        Preview
                      </a>
                      <button
                        onClick={() => {
                          if (confirm(`Delete ${r.name} and their link?`)) remove({ adminKey, id: r._id });
                        }}
                        className="ml-auto cursor-pointer rounded-lg px-3 py-1 text-red-700 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <aside className="h-fit rounded-2xl border border-stone-200 bg-white p-4">
          <h2 className="mb-3 font-semibold">Live activity</h2>
          {!events?.length ? (
            <p className="text-sm text-stone-500">Nothing yet. Opens show up here instantly.</p>
          ) : (
            <ul className="space-y-2.5 text-sm">
              {events.map((e) => (
                <li key={e._id}>
                  <span className="font-medium">{e.name}</span>{" "}
                  {e.type === "opened" ? "opened the link" : e.type === "viewed" ? "opened the card" : "sent wishes back"}
                  <div className="text-xs text-stone-500">
                    {ago(e.at, now)} · {e.device}
                    {e.browser ? ` · ${e.browser}` : ""}
                    {e.country ? ` · ${e.country}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </aside>
      </section>
    </main>
  );
}
