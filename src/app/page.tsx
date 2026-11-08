"use client";

import { Component, ReactNode, useCallback, useEffect, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Dashboard from "./Dashboard";

const KEY = "wishes-session";

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
  const login = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);
  const [token, setToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      setToken(localStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  // live: becomes null if the session expires or the platform admin disables this account
  const me = useQuery(api.auth.me, token ? { token } : "skip");

  const clearToken = useCallback(() => {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setToken(null);
  }, []);

  useEffect(() => {
    if (token && me === null) clearToken();
  }, [token, me, clearToken]);

  const logout = useCallback(() => {
    if (token) logoutMutation({ token }).catch(() => {});
    clearToken();
  }, [token, logoutMutation, clearToken]);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await login({ username, password });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      try {
        localStorage.setItem(KEY, res.token);
      } catch {
        /* ignore */
      }
      setToken(res.token);
      setPassword("");
    } catch {
      setError("Could not sign in. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (!ready) return null;

  if (!token) {
    const field =
      "w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200";
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <form onSubmit={onLogin} className="w-full max-w-sm space-y-4">
          <div className="text-4xl">🪔</div>
          <h1 className="font-card-en text-3xl font-bold">Festival Wishes</h1>
          <p className="text-sm text-stone-600">Sign in to open your dashboard.</p>
          <input
            autoFocus
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            aria-label="Username"
            className={field}
          />
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            aria-label="Password"
            className={field}
          />
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
          <button
            disabled={busy || !username.trim() || !password}
            className="w-full cursor-pointer rounded-xl bg-orange-600 px-4 py-3 font-semibold text-white transition hover:bg-orange-700 disabled:cursor-default disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Sign in"}
          </button>
          <p className="text-xs text-stone-500">No account? Ask the administrator to create one for you.</p>
        </form>
      </main>
    );
  }

  if (!me) return null; // checking the session

  return (
    <Boundary onError={clearToken}>
      <Dashboard token={token} user={me} onLogout={logout} />
    </Boundary>
  );
}
