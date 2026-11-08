"use client";

import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Panel from "./Panel";

const KEY = "wishes-platform-key";

export default function PlatformPage() {
  const [key, setKey] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [input, setInput] = useState("");
  const [tried, setTried] = useState(false);

  useEffect(() => {
    try {
      setKey(sessionStorage.getItem(KEY));
    } catch {
      /* storage unavailable */
    }
    setReady(true);
  }, []);

  const valid = useQuery(api.platform.verify, key ? { adminKey: key } : "skip");

  useEffect(() => {
    if (key && valid === false) {
      try {
        sessionStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      setKey(null);
      setTried(true);
    }
  }, [key, valid]);

  function logout() {
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
    setKey(null);
    setInput("");
    setTried(false);
  }

  if (!ready) return null;

  if (!key) {
    return (
      <main className="flex min-h-dvh items-center justify-center px-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            try {
              sessionStorage.setItem(KEY, input);
            } catch {
              /* ignore */
            }
            setKey(input);
          }}
          className="w-full max-w-sm space-y-4"
        >
          <div className="text-4xl">🛡️</div>
          <h1 className="font-card-en text-3xl font-bold">Platform admin</h1>
          <p className="text-sm text-stone-600">Root access: users, links and AI usage.</p>
          <input
            type="password"
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Platform passcode"
            aria-label="Platform passcode"
            className="w-full rounded-xl border border-stone-300 bg-white px-4 py-3 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
          />
          {tried && (
            <p role="alert" className="text-sm text-red-700">
              Wrong passcode, or ADMIN_KEY is not set on Convex.
            </p>
          )}
          <button
            disabled={!input}
            className="w-full cursor-pointer rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white transition hover:bg-stone-700 disabled:cursor-default disabled:opacity-50"
          >
            Enter
          </button>
        </form>
      </main>
    );
  }

  if (!valid) return null; // checking

  return <Panel adminKey={key} onLogout={logout} />;
}
