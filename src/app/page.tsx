"use client";

import { Component, ReactNode, useCallback, useEffect, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "../../convex/_generated/api";
import Dashboard from "./Dashboard";

const KEY = "wishes-admin-key";

class Boundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

export default function Home() {
  const convex = useConvex();
  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setAdminKey(localStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const logout = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setAdminKey(null);
  }, []);

  async function login(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await convex.query(api.wishes.list, { adminKey: input });
      try {
        localStorage.setItem(KEY, input);
      } catch {
        /* ignore */
      }
      setAdminKey(input);
    } catch {
      setError("Wrong passcode, or ADMIN_KEY is not set on Convex yet.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!adminKey) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <form onSubmit={login} className="w-full max-w-sm space-y-4">
          <div className="text-4xl">🪔</div>
          <h1 className="font-card-en text-3xl font-bold">Festival Wishes</h1>
          <p className="text-sm text-stone-600">Enter your passcode to open the dashboard.</p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Passcode"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          {error && <p className="text-sm text-red-700">{error}</p>}
          <button
            disabled={busy || !input}
            className="w-full cursor-pointer rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-default disabled:opacity-50"
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <Boundary onError={logout}>
      <Dashboard adminKey={adminKey} onLogout={logout} />
    </Boundary>
  );
}
