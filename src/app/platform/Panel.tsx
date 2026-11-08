"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { errMsg } from "@/lib/errors";
import { Badge, Stat, ago, btnCls, dangerCls, inputCls, num, primaryCls } from "./ui";
import UsagePanel from "./UsagePanel";
import SettingsPanel from "./SettingsPanel";

type Tab = "overview" | "users" | "usage" | "ai";
type UserRow = NonNullable<ReturnType<typeof useOverview>>["users"][number];

function useOverview(adminKey: string) {
  return useQuery(api.platform.overview, { adminKey });
}

function genPassword() {
  const chars = "abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const a = new Uint32Array(12);
  crypto.getRandomValues(a);
  return Array.from(a, (n) => chars[n % chars.length]).join("");
}

/* ---------- create user ---------- */
function CreateUser({ adminKey }: { adminKey: string }) {
  const create = useMutation(api.platform.createUser);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState(() => genPassword());
  const [aiEnabled, setAiEnabled] = useState(true);
  const [limit, setLimit] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [made, setMade] = useState<{ username: string; password: string } | null>(null);
  const [copied, setCopied] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      await create({
        adminKey,
        username,
        password,
        name: name || undefined,
        aiEnabled,
        aiDailyLimit: limit.trim() === "" ? undefined : Number(limit),
      });
      setMade({ username: username.trim().toLowerCase(), password });
      setUsername("");
      setName("");
      setLimit("");
      setPassword(genPassword());
    } catch (x) {
      setErr(errMsg(x, "Could not create the user"));
    } finally {
      setBusy(false);
    }
  }

  const loginUrl = typeof window !== "undefined" ? window.location.origin : "";
  const creds = made ? `Festival Wishes\nLogin: ${loginUrl}\nUsername: ${made.username}\nPassword: ${made.password}` : "";

  return (
    <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
      <h2 className="font-semibold">Create a user</h2>
      <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="Username (login id)" aria-label="Username" autoCapitalize="none" className={inputCls} />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Display name (optional)" aria-label="Display name" className={inputCls} />
        <div className="flex gap-2 sm:col-span-2">
          <input value={password} onChange={(e) => setPassword(e.target.value)} aria-label="Password" className={`${inputCls} min-w-0 flex-1 font-mono`} />
          <button type="button" onClick={() => setPassword(genPassword())} className={btnCls}>
            New
          </button>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={aiEnabled} onChange={(e) => setAiEnabled(e.target.checked)} className="size-4 accent-orange-600" />
          Can use AI
        </label>
        <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} placeholder="AI limit per day (blank = no limit)" aria-label="AI daily limit" inputMode="numeric" className={inputCls} />
        <div className="sm:col-span-2 lg:col-span-2 lg:text-right">
          <button disabled={busy || !username.trim() || password.length < 8} className={primaryCls}>
            {busy ? "Creating…" : "Create user"}
          </button>
        </div>
      </form>
      {err && <p role="alert" className="text-sm text-red-700">{err}</p>}
      {made && (
        <div className="space-y-2 rounded-xl bg-green-50 p-3 text-sm">
          <p className="font-medium text-green-800">User created. Share these details now; the password cannot be viewed later.</p>
          <pre className="whitespace-pre-wrap rounded-lg bg-white p-3 text-stone-700">{creds}</pre>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(creds);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              } catch {
                /* ignore */
              }
            }}
            className={btnCls}
          >
            {copied ? "Copied ✓" : "Copy details"}
          </button>
        </div>
      )}
    </section>
  );
}

/* ---------- one user's detail panel ---------- */
function UserDetail({ adminKey, u, onClose }: { adminKey: string; u: UserRow; onClose: () => void }) {
  const links = useQuery(api.platform.userLinks, { adminKey, userId: u.id });
  const update = useMutation(api.platform.updateUser);
  const reset = useMutation(api.platform.resetPassword);
  const remove = useMutation(api.platform.removeUser);
  const [name, setName] = useState(u.name ?? "");
  const [limit, setLimit] = useState(u.aiDailyLimit === null ? "" : String(u.aiDailyLimit));
  const [pw, setPw] = useState("");
  const [msg, setMsg] = useState("");

  async function run(fn: () => Promise<unknown>, ok: string) {
    setMsg("");
    try {
      await fn();
      setMsg(ok);
    } catch (x) {
      setMsg(errMsg(x, "Failed"));
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-orange-300 bg-orange-50/40 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold">
          {u.name || u.username} <span className="font-normal text-stone-500">@{u.username}</span>
        </h3>
        <button onClick={onClose} aria-label="Close" className="cursor-pointer text-2xl leading-none text-stone-500">
          ×
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-600">Display name</p>
          <div className="flex gap-2">
            <input value={name} onChange={(e) => setName(e.target.value)} aria-label="Display name" className={`${inputCls} min-w-0 flex-1`} />
            <button className={btnCls} onClick={() => run(() => update({ adminKey, id: u.id, name }), "Saved")}>
              Save
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-600">AI limit per day (blank = no limit)</p>
          <div className="flex gap-2">
            <input value={limit} onChange={(e) => setLimit(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="AI daily limit" className={`${inputCls} min-w-0 flex-1`} />
            <button
              className={btnCls}
              onClick={() => run(() => update({ adminKey, id: u.id, aiDailyLimit: limit === "" ? -1 : Number(limit) }), "Saved")}
            >
              Save
            </button>
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-xs font-medium text-stone-600">Reset password (signs them out everywhere)</p>
          <div className="flex gap-2">
            <input value={pw} onChange={(e) => setPw(e.target.value)} placeholder="New password" aria-label="New password" className={`${inputCls} min-w-0 flex-1 font-mono`} />
            <button className={btnCls} onClick={() => setPw(genPassword())}>
              New
            </button>
            <button
              disabled={pw.length < 8}
              className={btnCls}
              onClick={() => run(async () => { await reset({ adminKey, id: u.id, password: pw }); }, `Password set to: ${pw}`)}
            >
              Set
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button className={btnCls} onClick={() => run(() => update({ adminKey, id: u.id, disabled: !u.disabled }), u.disabled ? "Account enabled" : "Account disabled")}>
          {u.disabled ? "Enable account" : "Disable account"}
        </button>
        <button className={btnCls} onClick={() => run(() => update({ adminKey, id: u.id, aiEnabled: !u.aiEnabled }), u.aiEnabled ? "AI turned off" : "AI turned on")}>
          {u.aiEnabled ? "Turn AI off" : "Turn AI on"}
        </button>
        <button
          className={`${dangerCls} ml-auto`}
          onClick={async () => {
            if (!confirm(`Delete ${u.username} and ALL of their ${u.links} links? This cannot be undone.`)) return;
            await run(() => remove({ adminKey, id: u.id }), "Deleted");
            onClose();
          }}
        >
          Delete user
        </button>
      </div>
      <p aria-live="polite" className="min-h-5 text-sm text-stone-700">{msg}</p>

      {u.lastAiError && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-800">
          Last AI error ({ago(u.lastAiError.at)}): {u.lastAiError.error}
        </p>
      )}

      <div>
        <h4 className="mb-2 text-sm font-semibold">Links created ({links?.length ?? "…"})</h4>
        {links && links.length === 0 && <p className="text-sm text-stone-500">No links yet.</p>}
        {links && links.length > 0 && (
          <div className="max-h-96 overflow-auto rounded-xl border border-stone-200 bg-white">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-stone-50 text-xs text-stone-500">
                <tr>
                  <th className="p-2">Name</th>
                  <th className="p-2">Festival</th>
                  <th className="p-2">Status</th>
                  <th className="p-2">Opens</th>
                  <th className="p-2">Created</th>
                  <th className="p-2" />
                </tr>
              </thead>
              <tbody>
                {links.map((l) => (
                  <tr key={l.id} className="border-t border-stone-100">
                    <td className="p-2">{l.name}</td>
                    <td className="p-2 text-stone-600">
                      {l.festival} · {l.lang.toUpperCase()}
                      {l.custom ? " · custom" : ""}
                    </td>
                    <td className="p-2">
                      {l.replyCount ? <Badge tone="info">Replied</Badge> : l.viewedAt ? <Badge tone="ok">Viewed</Badge> : l.openCount ? <Badge tone="info">Opened</Badge> : <Badge tone="off">Not opened</Badge>}
                    </td>
                    <td className="p-2 tabular-nums">{l.openCount}</td>
                    <td className="p-2 text-stone-600">{ago(l.createdAt)}</td>
                    <td className="p-2">
                      <a href={`/w/${l.slug}?p=1`} target="_blank" rel="noreferrer" className="text-orange-700 underline">
                        Preview
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------- unowned (pre-accounts) wishes ---------- */
function LegacyBanner({ adminKey, count, users }: { adminKey: string; count: number; users: UserRow[] }) {
  const assignAll = useMutation(api.platform.assignLegacy);
  const assignSome = useMutation(api.platform.assignLinks);
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [picking, setPicking] = useState(false);
  const [picked, setPicked] = useState<Set<Id<"recipients">>>(new Set());
  const list = useQuery(api.platform.legacyList, picking ? { adminKey } : "skip");

  if (count === 0) return null;

  async function run(fn: () => Promise<number>) {
    setBusy(true);
    setMsg("");
    try {
      const moved = await fn();
      setMsg(`Moved ${moved} links.`);
      setPicked(new Set());
    } catch (x) {
      setMsg(errMsg(x, "Failed"));
    } finally {
      setBusy(false);
    }
  }

  const all = () =>
    run(async () => {
      let moved = 0;
      for (let i = 0; i < 20; i++) {
        const r = await assignAll({ adminKey, userId: to as Id<"users"> });
        moved += r.moved;
        if (!r.more) break;
      }
      return moved;
    });
  const some = () =>
    run(async () => (await assignSome({ adminKey, userId: to as Id<"users">, ids: [...picked] })).moved);

  const toggle = (id: Id<"recipients">) =>
    setPicked((p) => {
      const n = new Set(p);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <section className="space-y-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <p className="min-w-60 flex-1 text-amber-900">
          <b>{count > 1000 ? "1000+" : count} links</b> were made before accounts existed. No user can see them until you assign them.
        </p>
        <select value={to} onChange={(e) => setTo(e.target.value)} aria-label="Assign to user" className={inputCls}>
          <option value="">Assign to…</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name || u.username}
            </option>
          ))}
        </select>
        <button disabled={!to || busy} onClick={all} className={btnCls}>
          Assign all
        </button>
        <button onClick={() => setPicking((p) => !p)} className={primaryCls}>
          {picking ? "Hide list" : "Choose links"}
        </button>
      </div>

      {picking && (
        <div className="space-y-2">
          {!list ? (
            <p className="text-amber-900">Loading…</p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setPicked(picked.size === list.length ? new Set() : new Set(list.map((l) => l.id)))}
                  className={btnCls}
                >
                  {picked.size === list.length && list.length > 0 ? "Clear" : "Select all"}
                </button>
                <button disabled={!to || !picked.size || busy} onClick={some} className={primaryCls}>
                  {busy ? "Moving…" : `Assign ${picked.size} selected to ${users.find((u) => u.id === to)?.username ?? "…"}`}
                </button>
                {!to && <span className="text-amber-900">Pick a user first.</span>}
              </div>
              <ul className="max-h-80 overflow-auto rounded-xl border border-amber-200 bg-white">
                {list.map((l) => (
                  <li key={l.id} className="border-t border-stone-100 first:border-0">
                    <label className="flex cursor-pointer items-center gap-3 p-2.5">
                      <input type="checkbox" checked={picked.has(l.id)} onChange={() => toggle(l.id)} className="size-4 accent-orange-600" />
                      <span className="font-medium">{l.name}</span>
                      <span className="text-stone-500">
                        {l.festival}
                        {l.fromName ? ` · from ${l.fromName}` : ""}
                      </span>
                      <span className="ml-auto text-xs text-stone-500">
                        {l.openCount} opens · {ago(l.createdAt)}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}
      {msg && <p className="text-amber-900">{msg}</p>}
    </section>
  );
}

/* ---------- shell ---------- */
export default function Panel({ adminKey, onLogout }: { adminKey: string; onLogout: () => void }) {
  const data = useOverview(adminKey);
  const [tab, setTab] = useState<Tab>("overview");
  const [open, setOpen] = useState<Id<"users"> | null>(null);

  const t = data?.totals;
  const tabs: [Tab, string][] = [
    ["overview", "Overview"],
    ["users", `Users${t ? ` (${t.users})` : ""}`],
    ["usage", "AI usage"],
    ["ai", "AI settings"],
  ];
  const selected = data?.users.find((u) => u.id === open);

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-card-en text-2xl font-bold sm:text-3xl">🛡️ Platform admin</h1>
          <p className="text-sm text-stone-500">Users, their links, and AI usage.</p>
        </div>
        <button onClick={onLogout} className="cursor-pointer text-sm text-stone-500 underline hover:text-stone-800">
          Log out
        </button>
      </header>

      <nav className="flex flex-wrap gap-2" aria-label="Sections">
        {tabs.map(([k, l]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            aria-current={tab === k}
            className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${tab === k ? "border-stone-900 bg-stone-900 text-white" : "border-stone-300 bg-white"}`}
          >
            {l}
            {k === "usage" && t && t.aiErrors24h > 0 && (
              <span className="ml-2 rounded-full bg-red-600 px-1.5 text-xs text-white">{t.aiErrors24h}</span>
            )}
          </button>
        ))}
      </nav>

      {!data ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          {t && t.aiErrors24h > 0 && tab !== "usage" && (
            <button
              onClick={() => setTab("usage")}
              className="w-full cursor-pointer rounded-2xl border border-red-300 bg-red-50 p-3 text-left text-sm text-red-800"
            >
              ⚠ {t.aiErrors24h} AI {t.aiErrors24h === 1 ? "error" : "errors"} in the last 24 hours. Tap to see details.
            </button>
          )}

          {tab === "overview" && t && (
            <div className="space-y-6">
              <LegacyBanner adminKey={adminKey} count={data.legacyLinks} users={data.users} />
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                <Stat label="Users" value={`${t.activeUsers}/${t.users}`} />
                <Stat label="Links created" value={num(t.links)} />
                <Stat label="Opened" value={`${num(t.opened)}${t.links ? ` · ${Math.round((t.opened / t.links) * 100)}%` : ""}`} />
                <Stat label="Replied" value={num(t.replied)} />
                <Stat label="AI calls (24h)" value={num(t.aiCalls24h)} />
                <Stat label="AI tokens (24h)" value={num(t.tokens24h)} />
                <Stat label="AI errors (24h)" value={num(t.aiErrors24h)} tone={t.aiErrors24h > 0 ? "bad" : "good"} />
              </div>
              <div>
                <h2 className="mb-2 font-semibold">Most active users</h2>
                <ul className="space-y-2">
                  {[...data.users].sort((a, b) => b.links - a.links).slice(0, 5).map((u) => (
                    <li key={u.id} className="flex items-center justify-between rounded-xl border border-stone-200 bg-white p-3 text-sm">
                      <span className="font-medium">{u.name || u.username}</span>
                      <span className="text-stone-600">
                        {u.links} links · {u.opened} opened · {u.replied} replied
                      </span>
                    </li>
                  ))}
                  {data.users.length === 0 && <p className="text-sm text-stone-500">No users yet. Create one in the Users tab.</p>}
                </ul>
              </div>
            </div>
          )}

          {tab === "users" && (
            <div className="space-y-6">
              <CreateUser adminKey={adminKey} />
              {selected && <UserDetail key={selected.id} adminKey={adminKey} u={selected} onClose={() => setOpen(null)} />}
              <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500">
                    <tr>
                      <th className="p-3">User</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Links</th>
                      <th className="p-3">Opened</th>
                      <th className="p-3">Replied</th>
                      <th className="p-3">AI today</th>
                      <th className="p-3">AI errors</th>
                      <th className="p-3">Last login</th>
                      <th className="p-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {data.users.map((u) => (
                      <tr key={u.id} className={`border-t border-stone-100 ${u.id === open ? "bg-orange-50/50" : ""}`}>
                        <td className="p-3">
                          <div className="font-medium">{u.name || u.username}</div>
                          <div className="text-xs text-stone-500">@{u.username}</div>
                        </td>
                        <td className="p-3">{u.disabled ? <Badge tone="bad">Disabled</Badge> : <Badge tone="ok">Active</Badge>}</td>
                        <td className="p-3 tabular-nums">{u.links}</td>
                        <td className="p-3 tabular-nums">{u.opened}</td>
                        <td className="p-3 tabular-nums">{u.replied}</td>
                        <td className="p-3 tabular-nums">
                          {u.aiEnabled ? `${u.aiToday}${u.aiDailyLimit !== null ? `/${u.aiDailyLimit}` : ""}` : <Badge tone="off">AI off</Badge>}
                        </td>
                        <td className={`p-3 tabular-nums ${u.aiErrors ? "font-semibold text-red-700" : ""}`}>{u.aiErrors}</td>
                        <td className="p-3 text-stone-600">{ago(u.lastLoginAt)}</td>
                        <td className="p-3">
                          <button onClick={() => setOpen(u.id === open ? null : u.id)} className={btnCls}>
                            {u.id === open ? "Hide" : "Manage"}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {data.users.length === 0 && (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-stone-500">
                          No users yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === "usage" && <UsagePanel adminKey={adminKey} />}
          {tab === "ai" && <SettingsPanel adminKey={adminKey} />}
        </>
      )}
    </main>
  );
}
