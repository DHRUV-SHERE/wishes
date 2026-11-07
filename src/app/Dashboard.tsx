"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Doc } from "../../convex/_generated/dataModel";
import { FESTIVALS, LANGS, Festival, Lang, shareMessage } from "@/lib/content";
import MessagePicker, { Mode, Seg } from "./MessagePicker";

type Filter = "all" | "waiting" | "opened" | "viewed" | "replied";
type Recipient = Doc<"recipients">;

function ago(ts: number, now: number) {
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

const inputCls =
  "rounded-xl border border-stone-300 bg-white px-4 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";

function statusOf(r: Recipient) {
  if (r.replyCount) return { t: "Replied", c: "bg-purple-100 text-purple-800" };
  if (r.viewedAt) return { t: "Viewed card", c: "bg-green-100 text-green-800" };
  if (r.openCount) return { t: "Opened", c: "bg-amber-100 text-amber-800" };
  return { t: "Not opened", c: "bg-stone-100 text-stone-600" };
}

/* ---------- edit dialog ---------- */
function EditDialog({
  adminKey,
  r,
  templates,
  onClose,
}: {
  adminKey: string;
  r: Recipient;
  templates: Doc<"templates">[] | undefined;
  onClose: () => void;
}) {
  const update = useMutation(api.wishes.update);
  const ref = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(r.name);
  const [phone, setPhone] = useState(r.phone ?? "");
  const [festival, setFestival] = useState(r.festival as Festival);
  const [lang, setLang] = useState(r.lang as Lang);
  const [withFamily, setWithFamily] = useState(r.withFamily);
  const [fromName, setFromName] = useState(r.fromName);
  const [note, setNote] = useState(r.note ?? "");
  const [mode, setMode] = useState<Mode>(r.customMessage ? "custom" : (r.messageIdx ?? 0));
  const [custom, setCustom] = useState(r.customMessage ?? "");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    ref.current?.showModal();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "custom" && !custom.trim()) return setErr("Write a message or pick a preset.");
    setBusy(true);
    try {
      await update({
        adminKey,
        id: r._id,
        name,
        phone: phone || undefined,
        festival,
        lang,
        withFamily,
        fromName,
        note: note || undefined,
        messageIdx: mode === "custom" ? undefined : mode,
        customMessage: mode === "custom" ? custom : undefined,
      });
      onClose();
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="m-auto w-[min(720px,calc(100vw-24px))] rounded-2xl p-0 backdrop:bg-black/50"
    >
      <form onSubmit={save} className="space-y-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Edit wish</h2>
          <button type="button" onClick={() => ref.current?.close()} aria-label="Close" className="cursor-pointer text-2xl leading-none text-stone-500">
            ×
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Name" placeholder="Name" className={inputCls} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} aria-label="Phone" placeholder="WhatsApp no." inputMode="tel" className={inputCls} />
          <input value={fromName} onChange={(e) => setFromName(e.target.value)} aria-label="From" placeholder="From" className={inputCls} />
          <input value={note} onChange={(e) => setNote(e.target.value)} aria-label="Personal note" placeholder="Personal note" maxLength={300} className={inputCls} />
        </div>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
          <Seg label="Festival" value={festival} onChange={setFestival} options={FESTIVALS.map((f) => ({ id: f.id, label: `${f.emoji} ${f.label}` }))} />
          <Seg label="Language" value={lang} onChange={setLang} options={LANGS} />
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input type="checkbox" checked={withFamily} onChange={(e) => setWithFamily(e.target.checked)} className="size-4 accent-orange-600" />
            “& Family”
          </label>
        </div>
        <MessagePicker
          festival={festival}
          lang={lang}
          name={name}
          withFamily={withFamily}
          mode={mode}
          setMode={setMode}
          custom={custom}
          setCustom={setCustom}
          templates={templates}
        />
        {err && <p className="text-sm text-red-700">{err}</p>}
        <div className="flex justify-end gap-2">
          <button type="button" onClick={() => ref.current?.close()} className="cursor-pointer rounded-xl border border-stone-300 px-4 py-2 text-sm">
            Cancel
          </button>
          <button disabled={busy || !name.trim()} className="cursor-pointer rounded-xl bg-orange-600 px-5 py-2 text-sm font-semibold text-white disabled:opacity-50">
            Save changes
          </button>
        </div>
      </form>
    </dialog>
  );
}

/* ---------- dashboard ---------- */
export default function Dashboard({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const list = useQuery(api.wishes.list, { adminKey });
  const events = useQuery(api.wishes.recentEvents, { adminKey });
  const templates = useQuery(api.wishes.templatesList, { adminKey });
  const create = useMutation(api.wishes.create);
  const createBulk = useMutation(api.wishes.createBulk);
  const remove = useMutation(api.wishes.remove);
  const saveTemplate = useMutation(api.wishes.templateCreate);
  const removeTemplate = useMutation(api.wishes.templateRemove);

  const [festival, setFestival] = useState<Festival>("diwali");
  const [lang, setLang] = useState<Lang>("gu");
  const [withFamily, setWithFamily] = useState(true);
  const [fromName, setFromName] = useState("");
  const [note, setNote] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [mode, setMode] = useState<Mode>(0);
  const [custom, setCustom] = useState("");
  const [saveToLib, setSaveToLib] = useState(false);
  const [bulk, setBulk] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [festFilter, setFestFilter] = useState<Festival | "all">("all");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [last, setLast] = useState<{ link: string; text: string; phone?: string } | null>(null);
  const [editing, setEditing] = useState<Recipient | null>(null);
  const [now, setNow] = useState(() => Date.now());

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

  function flash(text: string, ms = 2500) {
    setMsg(text);
    setTimeout(() => setMsg(""), ms);
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      flash("Copied ✓", 2000);
    } catch {
      flash("Could not copy. Select and copy manually.");
    }
  }

  const messageArgs = () => ({
    messageIdx: mode === "custom" ? undefined : mode,
    customMessage: mode === "custom" ? custom : undefined,
  });

  async function maybeSaveTemplate() {
    if (mode === "custom" && saveToLib && custom.trim()) {
      await saveTemplate({ adminKey, title: "", text: custom, lang });
      setSaveToLib(false);
    }
  }

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    if (mode === "custom" && !custom.trim()) return flash("Write a message or pick a preset.");
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
        ...messageArgs(),
      });
      await maybeSaveTemplate();
      const link = linkFor(slug);
      setLast({ link, text: shareMessage(festival, lang, name.trim(), withFamily, link), phone: phone || undefined });
      copy(link);
      setName("");
      setPhone("");
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed");
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
    if (mode === "custom" && !custom.trim()) return flash("Write a message or pick a preset.");
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
        ...messageArgs(),
      });
      await maybeSaveTemplate();
      setBulk("");
      flash(`${n} links created ✓`, 3000);
    } catch (err) {
      flash(err instanceof Error ? err.message : "Failed");
    } finally {
      setBusy(false);
    }
  }

  function exportCsv() {
    const cell = (v: string | number | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const fmt = (t?: number) => (t ? new Date(t).toLocaleString() : "");
    const rowsCsv = [
      ["Name", "Phone", "Festival", "Language", "Link", "Status", "Opens", "First opened", "Last opened", "Viewed card", "Replies"],
      ...(list ?? []).map((r) => [
        r.name, r.phone, r.festival, r.lang, linkFor(r.slug), statusOf(r).t,
        r.openCount, fmt(r.firstOpenedAt), fmt(r.lastOpenedAt), fmt(r.viewedAt), r.replyCount,
      ]),
    ];
    const blob = new Blob(["﻿" + rowsCsv.map((r) => r.map(cell).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "wishes.csv";
    a.click();
    URL.revokeObjectURL(a.href);
  }

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (list ?? []).filter((r) => {
      if (q && !r.name.toLowerCase().includes(q)) return false;
      if (festFilter !== "all" && r.festival !== festFilter) return false;
      if (filter === "waiting") return r.openCount === 0;
      if (filter === "opened") return r.openCount > 0;
      if (filter === "viewed") return !!r.viewedAt;
      if (filter === "replied") return r.replyCount > 0;
      return true;
    });
  }, [list, filter, festFilter, search]);

  const total = list?.length ?? 0;
  const count = (f: (r: Recipient) => boolean) => list?.filter(f).length ?? 0;
  const stats: { label: string; value: number; key: Filter }[] = [
    { label: "Sent", value: total, key: "all" },
    { label: "Opened", value: count((r) => r.openCount > 0), key: "opened" },
    { label: "Viewed card", value: count((r) => !!r.viewedAt), key: "viewed" },
    { label: "Replied", value: count((r) => r.replyCount > 0), key: "replied" },
  ];

  return (
    <main className="mx-auto w-full max-w-5xl space-y-8 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-card-en text-2xl font-bold sm:text-3xl">🪔 Festival Wishes</h1>
          <p className="text-sm text-stone-500">Create a personal card, share the link, watch who opens it.</p>
        </div>
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

      <section className="space-y-5 rounded-2xl border border-stone-200 bg-white p-5">
        <form onSubmit={onAdd} className="space-y-5">
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
              className={`${inputCls} py-3 sm:w-64`}
            />
            <button
              disabled={busy || !name.trim()}
              className="cursor-pointer rounded-xl bg-orange-600 px-6 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-default disabled:opacity-50"
            >
              Create link
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <Seg label="Festival" value={festival} onChange={setFestival} options={FESTIVALS.map((f) => ({ id: f.id, label: `${f.emoji} ${f.label}` }))} />
            <Seg label="Language" value={lang} onChange={setLang} options={LANGS} />
            <label className="flex cursor-pointer items-center gap-2 text-sm">
              <input type="checkbox" checked={withFamily} onChange={(e) => setWithFamily(e.target.checked)} className="size-4 accent-orange-600" />
              “& Family”
            </label>
          </div>

          <MessagePicker
            festival={festival}
            lang={lang}
            name={name}
            withFamily={withFamily}
            mode={mode}
            setMode={setMode}
            custom={custom}
            setCustom={setCustom}
            saveToLib={saveToLib}
            setSaveToLib={setSaveToLib}
            templates={templates}
            onDeleteTemplate={(id) => removeTemplate({ adminKey, id })}
          />

          <div className="grid gap-3 sm:grid-cols-2">
            <input value={fromName} onChange={(e) => setFromName(e.target.value)} placeholder="From (your name / family name)" aria-label="From" className={inputCls} />
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Personal line for this person (optional)" aria-label="Personal note" maxLength={300} className={inputCls} />
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
            <a href={waUrl(last.text, last.phone)} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1.5 font-medium text-white hover:bg-green-700">
              WhatsApp
            </a>
          </div>
        )}

        <details className="text-sm">
          <summary className="cursor-pointer text-stone-600 hover:text-stone-900">Add many people at once (uses the settings and message above)</summary>
          <div className="mt-3 space-y-2">
            <textarea
              value={bulk}
              onChange={(e) => setBulk(e.target.value)}
              rows={5}
              placeholder={"One per line. Optional phone after a comma:\nRahul Patel, 919876543210\nMeena Shah"}
              className="w-full rounded-xl border border-stone-300 px-4 py-3 outline-none focus:border-orange-500"
            />
            <button onClick={onBulk} disabled={busy || !bulk.trim()} className="cursor-pointer rounded-xl border border-orange-600 px-4 py-2 font-medium text-orange-700 hover:bg-orange-50 disabled:cursor-default disabled:opacity-50">
              Create all links
            </button>
          </div>
        </details>
        <p aria-live="polite" className="min-h-5 text-sm text-stone-600">{msg}</p>
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name…"
              aria-label="Search"
              className={`${inputCls} w-40 py-1.5`}
            />
            {(
              [["all", "All"], ["waiting", "Not opened yet"], ["opened", "Opened"], ["viewed", "Viewed card"], ["replied", "Replied"]] as [Filter, string][]
            ).map(([k, l]) => (
              <button key={k} onClick={() => setFilter(k)} className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${filter === k ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}>
                {l}
              </button>
            ))}
            <button onClick={exportCsv} disabled={!total} className="ml-auto cursor-pointer rounded-full border border-stone-300 bg-white px-3 py-1 text-sm hover:border-orange-400 disabled:opacity-50">
              Export CSV
            </button>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {([["all", "All festivals"], ...FESTIVALS.map((f) => [f.id, `${f.emoji} ${f.label}`])] as [Festival | "all", string][]).map(([k, l]) => (
              <button key={k} onClick={() => setFestFilter(k)} className={`cursor-pointer rounded-full border px-3 py-0.5 text-xs ${festFilter === k ? "border-orange-600 bg-orange-50 text-orange-800" : "border-stone-300 bg-white text-stone-600"}`}>
                {l}
              </button>
            ))}
          </div>

          {list === undefined ? (
            <p className="text-stone-500">Loading…</p>
          ) : rows.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-stone-300 p-8 text-center text-stone-500">
              {total === 0 ? "No wishes yet. Type a name above and press Enter." : "Nobody matches this filter."}
            </p>
          ) : (
            <ul className="space-y-2">
              {rows.map((r) => {
                const link = linkFor(r.slug);
                const text = shareMessage(r.festival as Festival, r.lang as Lang, r.name, r.withFamily, link);
                const status = statusOf(r);
                const fest = FESTIVALS.find((f) => f.id === r.festival);
                return (
                  <li key={r._id} className="rounded-2xl border border-stone-200 bg-white p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{r.name}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${status.c}`}>{status.t}</span>
                      <span className="text-xs text-stone-500">
                        {fest?.emoji} {fest?.label} · {r.lang.toUpperCase()}
                        {r.customMessage ? " · custom message" : ""}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-stone-500">
                      {r.lastOpenedAt
                        ? `Opened ${r.openCount}× · first ${ago(r.firstOpenedAt ?? r.lastOpenedAt, now)} · last ${ago(r.lastOpenedAt, now)}`
                        : `Created ${ago(r.createdAt, now)} · not opened yet`}
                      {r.replyCount ? ` · replied ${ago(r.lastReplyAt ?? r.createdAt, now)}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2 text-sm">
                      <button onClick={() => copy(link)} className="cursor-pointer rounded-lg border border-stone-300 px-3 py-1 hover:border-orange-400">Copy link</button>
                      <a href={waUrl(text, r.phone)} target="_blank" rel="noreferrer" className="rounded-lg bg-green-600 px-3 py-1 font-medium text-white hover:bg-green-700">WhatsApp</a>
                      <a href={`${link}?p=1`} target="_blank" rel="noreferrer" className="rounded-lg border border-stone-300 px-3 py-1 hover:border-orange-400" title="Preview does not count as an open">Preview</a>
                      <button onClick={() => setEditing(r)} className="cursor-pointer rounded-lg border border-stone-300 px-3 py-1 hover:border-orange-400">Edit</button>
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

      {editing && <EditDialog key={editing._id} adminKey={adminKey} r={editing} templates={templates} onClose={() => setEditing(null)} />}
    </main>
  );
}
