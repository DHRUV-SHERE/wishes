import { ReactNode } from "react";

export const inputCls =
  "rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
export const btnCls =
  "cursor-pointer rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm hover:border-orange-400 disabled:cursor-default disabled:opacity-50";
export const primaryCls =
  "cursor-pointer rounded-lg bg-orange-600 px-4 py-1.5 text-sm font-semibold text-white hover:bg-orange-700 disabled:cursor-default disabled:opacity-50";
export const dangerCls =
  "cursor-pointer rounded-lg border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50";

export function ago(ts: number | null | undefined, now = Date.now()) {
  if (!ts) return "never";
  const s = Math.max(1, Math.round((now - ts) / 1000));
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} h ago`;
  return `${Math.round(h / 24)} d ago`;
}

export function when(ts: number) {
  return new Date(ts).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

export const num = (n: number) => n.toLocaleString();

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "bad" | "good" }) {
  const cls =
    tone === "bad"
      ? "border-red-300 bg-red-50"
      : tone === "good"
        ? "border-green-300 bg-green-50"
        : "border-stone-200 bg-white";
  return (
    <div className={`rounded-2xl border p-4 ${cls}`}>
      <div className={`text-3xl font-semibold tabular-nums ${tone === "bad" ? "text-red-800" : ""}`}>{value}</div>
      <div className="text-sm text-stone-600">{label}</div>
    </div>
  );
}

export function Badge({ children, tone }: { children: ReactNode; tone: "ok" | "bad" | "off" | "info" }) {
  const c = {
    ok: "bg-green-100 text-green-800",
    bad: "bg-red-100 text-red-800",
    off: "bg-stone-100 text-stone-600",
    info: "bg-amber-100 text-amber-800",
  }[tone];
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${c}`}>{children}</span>;
}
