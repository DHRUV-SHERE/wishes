"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { errMsg } from "@/lib/errors";
import { Badge, btnCls, dangerCls, inputCls, primaryCls } from "./ui";

export default function SettingsPanel({ adminKey }: { adminKey: string }) {
  const s = useQuery(api.platform.settings, { adminKey });
  const setKey = useMutation(api.platform.setGroqKey);
  const clearKey = useMutation(api.platform.clearGroqKey);
  const saveConfig = useMutation(api.platform.saveAiConfig);
  const testKey = useAction(api.ai.testKey);
  const fetchModels = useAction(api.ai.fetchModels);

  const [keyInput, setKeyInput] = useState("");
  const [keyMsg, setKeyMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState("");

  const [enabled, setEnabled] = useState(true);
  const [models, setModels] = useState<string[]>([]);
  const [def, setDef] = useState("");
  const [newModel, setNewModel] = useState("");
  const [available, setAvailable] = useState<string[]>([]);
  const [cfgMsg, setCfgMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [loaded, setLoaded] = useState(false);

  // fill the form once from the server; later edits stay local until saved
  useEffect(() => {
    if (s && !loaded) {
      setEnabled(s.aiEnabled);
      setModels(s.models);
      setDef(s.defaultModel);
      setLoaded(true);
    }
  }, [s, loaded]);

  if (!s) return <p className="text-stone-500">Loading…</p>;

  async function saveKey() {
    setBusy("save");
    setKeyMsg(null);
    try {
      await setKey({ adminKey, key: keyInput });
      setKeyInput("");
      setKeyMsg({ ok: true, text: "Key saved. Use Test key to confirm it works." });
    } catch (x) {
      setKeyMsg({ ok: false, text: errMsg(x, "Could not save the key") });
    } finally {
      setBusy("");
    }
  }

  async function test() {
    setBusy("test");
    setKeyMsg(null);
    try {
      const r = await testKey({ adminKey, key: keyInput || undefined, model: def || undefined });
      setKeyMsg({ ok: r.ok, text: r.message });
    } catch (x) {
      setKeyMsg({ ok: false, text: errMsg(x, "Test failed") });
    } finally {
      setBusy("");
    }
  }

  async function load() {
    setBusy("models");
    setCfgMsg(null);
    try {
      const r = await fetchModels({ adminKey, key: keyInput || undefined });
      if (r.ok) setAvailable(r.models);
      else setCfgMsg({ ok: false, text: r.message ?? "Could not load models" });
    } catch (x) {
      setCfgMsg({ ok: false, text: errMsg(x, "Could not load models") });
    } finally {
      setBusy("");
    }
  }

  async function save() {
    setBusy("cfg");
    setCfgMsg(null);
    try {
      await saveConfig({ adminKey, aiEnabled: enabled, models, defaultModel: def });
      setCfgMsg({ ok: true, text: "Saved" });
    } catch (x) {
      setCfgMsg({ ok: false, text: errMsg(x, "Could not save") });
    } finally {
      setBusy("");
    }
  }

  const addModel = (m: string) => {
    const id = m.trim();
    if (!id || models.includes(id)) return;
    setModels([...models, id]);
    if (!def) setDef(id);
  };
  const dropModel = (m: string) => {
    const next = models.filter((x) => x !== m);
    setModels(next);
    if (def === m) setDef(next[0] ?? "");
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Groq API key</h2>
          {s.keySource === "none" ? (
            <Badge tone="bad">Not set</Badge>
          ) : (
            <Badge tone="ok">
              {s.keyHint} · {s.keySource === "platform" ? "saved here" : "from server env"}
            </Badge>
          )}
        </div>
        <p className="text-sm text-stone-600">
          Paste a key from console.groq.com. It is stored on the server and is never sent back to the browser.
        </p>
        <input
          type="password"
          value={keyInput}
          onChange={(e) => setKeyInput(e.target.value)}
          placeholder={s.keySource === "none" ? "gsk_…" : "Paste a new key to replace the current one"}
          aria-label="Groq API key"
          autoComplete="off"
          className={`${inputCls} w-full font-mono`}
        />
        <div className="flex flex-wrap gap-2">
          <button onClick={saveKey} disabled={!keyInput.trim() || !!busy} className={primaryCls}>
            {busy === "save" ? "Saving…" : "Save key"}
          </button>
          <button onClick={test} disabled={(s.keySource === "none" && !keyInput.trim()) || !!busy} className={btnCls}>
            {busy === "test" ? "Testing…" : keyInput.trim() ? "Test typed key" : "Test saved key"}
          </button>
          {s.keySource === "platform" && (
            <button
              onClick={async () => {
                if (!confirm("Remove the saved Groq key? AI writing stops working until a new key is added.")) return;
                await clearKey({ adminKey });
                setKeyMsg({ ok: true, text: "Key removed" });
              }}
              className={`${dangerCls} ml-auto`}
            >
              Remove key
            </button>
          )}
        </div>
        {keyMsg && (
          <p role="status" className={`rounded-lg p-2 text-sm ${keyMsg.ok ? "bg-green-50 text-green-800" : "bg-red-50 text-red-800"}`}>
            {keyMsg.text}
          </p>
        )}
      </section>

      <section className="space-y-4 rounded-2xl border border-stone-200 bg-white p-5">
        <h2 className="font-semibold">AI for users</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} className="size-4 accent-orange-600" />
          AI writing is on for everyone (master switch)
        </label>

        <div className="space-y-2">
          <p className="text-sm font-medium">Models users can use</p>
          <ul className="flex flex-wrap gap-1.5">
            {models.map((m) => (
              <li key={m} className="flex items-center rounded-full border border-stone-300 bg-white text-sm">
                <span className="py-1 pl-3 pr-1 font-mono text-xs">{m}</span>
                <button onClick={() => dropModel(m)} aria-label={`Remove ${m}`} className="cursor-pointer py-1 pl-1 pr-2.5 text-stone-400 hover:text-red-600">
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              value={newModel}
              onChange={(e) => setNewModel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addModel(newModel);
                  setNewModel("");
                }
              }}
              placeholder="Add a model id"
              aria-label="Model id"
              className={`${inputCls} min-w-0 flex-1 font-mono`}
            />
            <button
              onClick={() => {
                addModel(newModel);
                setNewModel("");
              }}
              disabled={!newModel.trim()}
              className={btnCls}
            >
              Add
            </button>
            <button onClick={load} disabled={!!busy} className={btnCls}>
              {busy === "models" ? "Loading…" : "Load from Groq"}
            </button>
          </div>
          {available.length > 0 && (
            <div>
              <p className="mb-1 text-xs text-stone-500">Available on your Groq account (tap to add):</p>
              <ul className="flex max-h-40 flex-wrap gap-1.5 overflow-auto">
                {available
                  .filter((m) => !models.includes(m))
                  .map((m) => (
                    <li key={m}>
                      <button onClick={() => addModel(m)} className="cursor-pointer rounded-full border border-dashed border-stone-300 px-2.5 py-0.5 font-mono text-xs hover:border-orange-400">
                        + {m}
                      </button>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        <label className="block space-y-1 text-sm">
          <span className="font-medium">Default model</span>
          <select value={def} onChange={(e) => setDef(e.target.value)} className={`${inputCls} w-full font-mono`}>
            {models.map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-3">
          <button onClick={save} disabled={!!busy || !models.length || !def} className={primaryCls}>
            {busy === "cfg" ? "Saving…" : "Save"}
          </button>
          {cfgMsg && <span role="status" className={`text-sm ${cfgMsg.ok ? "text-green-700" : "text-red-700"}`}>{cfgMsg.text}</span>}
        </div>
        <p className="text-xs text-stone-500">Per-user AI access and daily limits are set in the Users tab.</p>
      </section>
    </div>
  );
}
