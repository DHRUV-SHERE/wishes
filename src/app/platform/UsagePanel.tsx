"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Badge, Stat, ago, num, when } from "./ui";

const RANGES = [
  [1, "Today"],
  [7, "7 days"],
  [30, "30 days"],
  [90, "90 days"],
] as const;

export default function UsagePanel({ adminKey }: { adminKey: string }) {
  const [days, setDays] = useState<number>(7);
  const u = useQuery(api.platform.usage, { adminKey, days });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Period">
        {RANGES.map(([d, l]) => (
          <button
            key={d}
            role="radio"
            aria-checked={days === d}
            onClick={() => setDays(d)}
            className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${days === d ? "border-orange-600 bg-orange-50 text-orange-800" : "border-stone-300 bg-white"}`}
          >
            {l}
          </button>
        ))}
      </div>

      {!u ? (
        <p className="text-stone-500">Loading…</p>
      ) : (
        <>
          {u.truncated && (
            <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
              Showing the latest 5,000 calls in this period. Pick a shorter period for exact totals.
            </p>
          )}

          <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
            <Stat label="AI calls" value={num(u.total.calls)} />
            <Stat label="Successful" value={num(u.total.ok)} />
            <Stat label="Errors" value={num(u.total.errors)} tone={u.total.errors > 0 ? "bad" : "good"} />
            <Stat label="Tokens used" value={num(u.total.totalTokens)} />
            <Stat label="Avg response" value={`${num(u.total.avgLatencyMs)} ms`} />
          </div>

          {/* errors first: this is what needs attention */}
          <section className={`rounded-2xl border p-4 ${u.errors.length ? "border-red-300 bg-red-50" : "border-green-300 bg-green-50"}`}>
            <h2 className={`mb-2 font-semibold ${u.errors.length ? "text-red-800" : "text-green-800"}`}>
              {u.errors.length ? `Errors (${u.total.errors})` : "No errors in this period ✓"}
            </h2>
            {u.errors.length > 0 && (
              <div className="max-h-96 overflow-auto rounded-xl border border-red-200 bg-white">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0 bg-red-50 text-xs text-red-800">
                    <tr>
                      <th className="p-2">When</th>
                      <th className="p-2">User</th>
                      <th className="p-2">Model</th>
                      <th className="p-2">Code</th>
                      <th className="p-2">Error</th>
                    </tr>
                  </thead>
                  <tbody>
                    {u.errors.map((e) => (
                      <tr key={e.id} className="border-t border-red-100 align-top">
                        <td className="whitespace-nowrap p-2 text-stone-600" title={when(e.at)}>
                          {ago(e.at)}
                        </td>
                        <td className="p-2">{e.username}</td>
                        <td className="p-2 text-xs">{e.model}</td>
                        <td className="p-2">
                          {e.status ? <Badge tone="bad">{e.status}</Badge> : <Badge tone="off">network</Badge>}
                        </td>
                        <td className="p-2 text-red-800">{e.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {u.total.errors > u.errors.length && <p className="mt-2 text-xs text-red-800">Showing the 50 most recent.</p>}
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Usage by user</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="p-3">User</th>
                    <th className="p-3">Calls</th>
                    <th className="p-3">Errors</th>
                    <th className="p-3">Prompt tokens</th>
                    <th className="p-3">Output tokens</th>
                    <th className="p-3">Total tokens</th>
                    <th className="p-3">Last used</th>
                  </tr>
                </thead>
                <tbody>
                  {u.byUser.map((r) => (
                    <tr key={r.id} className="border-t border-stone-100">
                      <td className="p-3 font-medium">{r.username}</td>
                      <td className="p-3 tabular-nums">{num(r.calls)}</td>
                      <td className={`p-3 tabular-nums ${r.errors ? "font-semibold text-red-700" : ""}`} title={r.lastError ?? undefined}>
                        {r.errors}
                      </td>
                      <td className="p-3 tabular-nums">{num(r.promptTokens)}</td>
                      <td className="p-3 tabular-nums">{num(r.completionTokens)}</td>
                      <td className="p-3 tabular-nums">{num(r.totalTokens)}</td>
                      <td className="p-3 text-stone-600">{ago(r.lastAt)}</td>
                    </tr>
                  ))}
                  {u.byUser.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-stone-500">
                        No AI usage in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="font-semibold">Usage by model</h2>
            <div className="overflow-x-auto rounded-2xl border border-stone-200 bg-white">
              <table className="w-full text-left text-sm">
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="p-3">Model</th>
                    <th className="p-3">Calls</th>
                    <th className="p-3">Errors</th>
                    <th className="p-3">Prompt tokens</th>
                    <th className="p-3">Output tokens</th>
                    <th className="p-3">Total tokens</th>
                    <th className="p-3">Avg response</th>
                  </tr>
                </thead>
                <tbody>
                  {u.byModel.map((r) => (
                    <tr key={r.model} className="border-t border-stone-100">
                      <td className="p-3 font-mono text-xs">{r.model}</td>
                      <td className="p-3 tabular-nums">{num(r.calls)}</td>
                      <td className={`p-3 tabular-nums ${r.errors ? "font-semibold text-red-700" : ""}`} title={r.lastError ?? undefined}>
                        {r.errors}
                      </td>
                      <td className="p-3 tabular-nums">{num(r.promptTokens)}</td>
                      <td className="p-3 tabular-nums">{num(r.completionTokens)}</td>
                      <td className="p-3 tabular-nums">{num(r.totalTokens)}</td>
                      <td className="p-3 tabular-nums">{num(r.avgLatencyMs)} ms</td>
                    </tr>
                  ))}
                  {u.byModel.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-stone-500">
                        No AI usage in this period.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {u.byDay.length > 1 && (
            <section className="space-y-2">
              <h2 className="font-semibold">Calls per day</h2>
              <ul className="space-y-1 rounded-2xl border border-stone-200 bg-white p-4 text-sm">
                {(() => {
                  const max = Math.max(...u.byDay.map((d) => d.calls), 1);
                  return u.byDay.map((d) => (
                    <li key={d.day} className="flex items-center gap-3">
                      <span className="w-24 shrink-0 tabular-nums text-stone-600">{d.day.slice(5)}</span>
                      <span className="flex h-4 flex-1 overflow-hidden rounded bg-stone-100">
                        <span className="bg-orange-500" style={{ width: `${((d.calls - d.errors) / max) * 100}%` }} />
                        <span className="bg-red-500" style={{ width: `${(d.errors / max) * 100}%` }} />
                      </span>
                      <span className="w-28 shrink-0 text-right tabular-nums">
                        {d.calls} calls{d.errors ? <span className="text-red-700"> · {d.errors} err</span> : ""}
                      </span>
                    </li>
                  ));
                })()}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
