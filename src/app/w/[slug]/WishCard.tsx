"use client";

import { CSSProperties, useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Festival, Lang, PALETTES, TEXT, TEXT_COLOR, UI, resolveMessage } from "@/lib/content";

export type WishData = {
  name: string;
  festival: string;
  lang: string;
  withFamily: boolean;
  fromName: string;
  note: string | null;
  messageIdx: number;
  customMessage: string | null;
};

const PALETTE_EVERY_MS = 8000;

function track(slug: string, type: "opened" | "viewed" | "replied") {
  try {
    // ?p=1 is the sender's preview: never counted
    if (new URLSearchParams(window.location.search).get("p")) return;
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slug, type }),
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* tracking must never break the card */
  }
}

/* ---------- ornaments ---------- */

function Diya({ size = 120, delay = 0 }: { size?: number; delay?: number }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id={`${id}f`} cx="50%" cy="70%" r="60%">
          <stop offset="0%" style={{ stopColor: "#fffbe0" }} />
          <stop offset="55%" style={{ stopColor: "var(--ac)" }} />
          <stop offset="100%" style={{ stopColor: "var(--ac2)" }} />
        </radialGradient>
        <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9792b" />
          <stop offset="100%" stopColor="#8a3b12" />
        </linearGradient>
      </defs>
      <g className="flame" style={{ animationDelay: `${delay}s` }}>
        <path d="M60 18 C72 38 76 50 60 66 C44 50 48 38 60 18 Z" fill={`url(#${id}f)`} />
      </g>
      <path d="M20 70 Q60 62 100 70 Q96 100 60 102 Q24 100 20 70 Z" fill={`url(#${id}b)`} />
      <ellipse cx="60" cy="70" rx="40" ry="7" fill="#f3a255" opacity="0.9" />
    </svg>
  );
}

function Mandala() {
  const petals = Array.from({ length: 16 }, (_, i) => i * 22.5);
  const dots = Array.from({ length: 36 }, (_, i) => i * 10);
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.22]"
      style={{ width: "min(150vw, 980px)", aspectRatio: "1" }}
      aria-hidden
    >
      <svg viewBox="-100 -100 200 200" className="mandala-a absolute inset-0 h-full w-full" fill="none">
        {petals.map((r) => (
          <ellipse key={r} cx="0" cy="-58" rx="9" ry="26" transform={`rotate(${r})`} stroke="var(--ac)" strokeWidth="0.5" />
        ))}
        <circle r="30" stroke="var(--ac)" strokeWidth="0.5" />
        <circle r="86" stroke="var(--ac2)" strokeWidth="0.4" />
      </svg>
      <svg viewBox="-100 -100 200 200" className="mandala-b absolute inset-0 h-full w-full" fill="none">
        {dots.map((r) => (
          <circle key={r} cx="0" cy="-94" r="1.4" transform={`rotate(${r})`} fill="var(--ac2)" />
        ))}
        {petals.map((r) => (
          <path key={r} d="M0 -40 Q8 -56 0 -72 Q-8 -56 0 -40Z" transform={`rotate(${r + 11})`} stroke="var(--ac2)" strokeWidth="0.4" />
        ))}
      </svg>
    </div>
  );
}

function Lantern({ left, len, delay }: { left: string; len: number; delay: number }) {
  return (
    <div className="sway pointer-events-none absolute top-0" style={{ left, animationDelay: `${delay}s` }} aria-hidden>
      <div className="mx-auto w-px" style={{ height: len, background: "var(--ac)", opacity: 0.6 }} />
      <svg width="44" height="62" viewBox="0 0 44 62">
        <rect x="14" y="0" width="16" height="6" rx="2" style={{ fill: "var(--ac)" }} />
        <path d="M8 8 H36 Q42 30 36 52 H8 Q2 30 8 8Z" style={{ fill: "var(--ac2)" }} opacity="0.92" />
        <path d="M22 8 V52 M15 8 Q11 30 15 52 M29 8 Q33 30 29 52" stroke="rgba(0,0,0,0.25)" strokeWidth="1" fill="none" />
        <rect x="12" y="52" width="20" height="5" rx="2" style={{ fill: "var(--ac)" }} />
        <path d="M22 57 V62" stroke="var(--ac)" strokeWidth="2" />
        <circle cx="22" cy="30" r="9" fill="#fff6c8" opacity="0.55" />
      </svg>
    </div>
  );
}

function Torana() {
  const n = 16;
  return (
    <svg
      className="sway pointer-events-none absolute left-0 top-0 w-full"
      style={{ height: 58, transformOrigin: "50% 0", animationDuration: "7s" }}
      viewBox={`0 0 ${n * 10} 12`}
      preserveAspectRatio="none"
      aria-hidden
    >
      <rect x="0" y="0" width={n * 10} height="1.2" style={{ fill: "var(--ac)" }} />
      {Array.from({ length: n }, (_, i) => (
        <path
          key={i}
          d={`M${i * 10 + 0.6} 1.2 L${i * 10 + 9.4} 1.2 L${i * 10 + 5} 11Z`}
          style={{ fill: i % 2 ? "var(--ac2)" : "var(--ac)" }}
          opacity="0.9"
        />
      ))}
    </svg>
  );
}

function DiyaRow() {
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center gap-3 pb-1 opacity-90" aria-hidden>
      {[0, 0.4, 0.8, 0.2, 0.6, 1, 0.3].map((d, i) => (
        <div key={i} className={i > 4 || i < 2 ? "hidden sm:block" : ""}>
          <Diya size={46} delay={d} />
        </div>
      ))}
    </div>
  );
}

function Stars() {
  const stars = useMemo(
    () =>
      Array.from({ length: 26 }, (_, i) => ({
        left: (i * 37 + 11) % 100,
        top: (i * 53 + 7) % 90,
        size: 2 + ((i * 3) % 4),
        delay: -((i * 7) % 9) / 3,
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      {stars.map((s, i) => (
        <span
          key={i}
          className="twinkle rounded-full"
          style={{
            left: `${s.left}%`,
            top: `${s.top}%`,
            width: s.size,
            height: s.size,
            background: i % 3 ? "var(--ac)" : "#fff",
            boxShadow: "0 0 8px var(--ac)",
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Sparks() {
  const sparks = useMemo(
    () =>
      Array.from({ length: 20 }, (_, i) => ({
        left: (i * 47) % 100,
        size: 3 + ((i * 7) % 5),
        dur: 7 + ((i * 3) % 8),
        delay: -((i * 5) % 12),
      })),
    [],
  );
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {sparks.map((s, i) => (
        <span
          key={i}
          className="spark"
          style={{
            left: `${s.left}%`,
            width: s.size,
            height: s.size,
            background: "var(--ac)",
            boxShadow: "0 0 10px var(--ac)",
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

function Divider() {
  return (
    <div className="flex items-center justify-center gap-3" aria-hidden>
      <span className="h-px w-16" style={{ background: "linear-gradient(90deg, transparent, var(--ac))" }} />
      <span className="size-2 rotate-45" style={{ background: "var(--ac)" }} />
      <span className="h-px w-16" style={{ background: "linear-gradient(270deg, transparent, var(--ac))" }} />
    </div>
  );
}

function Reveal({ text, className, delay }: { text: string; className?: string; delay: number }) {
  const words = text.split(/\s+/);
  return (
    <p className={className}>
      {words.map((w, i) => (
        <motion.span
          key={i}
          className="inline-block"
          style={{ marginRight: "0.28em" }}
          initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{ delay: delay + i * 0.07, duration: 0.5 }}
        >
          {w}
        </motion.span>
      ))}
    </p>
  );
}

/* ---------- the card ---------- */

export default function WishCard({ slug, data }: { slug: string; data: WishData }) {
  const festival = (data.festival in PALETTES ? data.festival : "diwali") as Festival;
  const lang = (["en", "hi", "gu"].includes(data.lang) ? data.lang : "en") as Lang;
  const palettes = PALETTES[festival];
  const t = TEXT[festival][lang];
  const ui = UI[lang];
  const message = resolveMessage(festival, lang, data.messageIdx, data.customMessage);
  const cardFont = `font-card-${lang}`;

  const [opened, setOpened] = useState(false);
  const [replied, setReplied] = useState(false);
  const [pi, setPi] = useState(0);
  const [reduced, setReduced] = useState(false);
  const palette = palettes[pi];
  const paletteRef = useRef(palette);
  paletteRef.current = palette;

  useEffect(() => {
    track(slug, "opened");
  }, [slug]);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // colour theme changes on its own, smoothly
  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setPi((i) => (i + 1) % palettes.length), PALETTE_EVERY_MS);
    return () => clearInterval(id);
  }, [reduced, palettes.length]);

  const colors = () => [paletteRef.current.accent, paletteRef.current.accent2, "#ffffff"];

  // gentle fireworks once the card is open
  useEffect(() => {
    if (!opened || reduced) return;
    const every = festival === "diwali" ? 5500 : 3200;
    const id = setInterval(() => {
      if (document.hidden) return;
      confetti({
        particleCount: 36,
        spread: 360,
        startVelocity: 22,
        gravity: 0.6,
        ticks: 90,
        scalar: 0.9,
        shapes: ["star", "circle"],
        origin: { x: 0.1 + Math.random() * 0.8, y: 0.08 + Math.random() * 0.35 },
        colors: colors(),
      });
    }, every);
    return () => clearInterval(id);
  }, [opened, reduced, festival]);

  function openCard() {
    if (opened) return;
    setOpened(true);
    track(slug, "viewed");
    if (reduced) return;
    const fire = (x: number) =>
      confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { x, y: 0.75 }, colors: colors() });
    fire(0.2);
    fire(0.8);
    setTimeout(() => fire(0.5), 450);
  }

  function sendBack() {
    if (replied) return;
    setReplied(true);
    track(slug, "replied");
    if (!reduced) confetti({ particleCount: 60, spread: 70, origin: { y: 0.9 }, colors: colors() });
  }

  const stageStyle = {
    "--c1": palette.c1,
    "--c2": palette.c2,
    "--c3": palette.c3,
    "--ac": palette.accent,
    "--ac2": palette.accent2,
    "--glow": `${palette.accent}66`,
    color: TEXT_COLOR,
  } as CSSProperties;

  // reveal timeline for the opened card
  const words = message.split(/\s+/).length;
  const msgDelay = 1.5;
  const afterMsg = msgDelay + words * 0.07 + 0.5;

  const item = (delay: number) => ({
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { delay, duration: 0.7, ease: "easeOut" as const },
  });

  return (
    <main
      className="card-stage relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-16 text-center"
      style={stageStyle}
    >
      <Mandala />
      {festival === "newyear" ? <Stars /> : <Sparks />}
      {festival === "diwali" && (
        <>
          <Lantern left="7%" len={40} delay={0} />
          <Lantern left="86%" len={70} delay={1.2} />
          <div className="hidden sm:block">
            <Lantern left="24%" len={18} delay={0.6} />
            <Lantern left="70%" len={28} delay={1.8} />
          </div>
          <DiyaRow />
        </>
      )}
      {festival === "besatuvarsh" && <Torana />}

      <AnimatePresence mode="wait">
        {!opened ? (
          <motion.button
            key="gate"
            type="button"
            onClick={openCard}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, filter: "blur(6px)" }}
            transition={{ duration: 0.6 }}
            className="relative z-10 flex max-w-sm cursor-pointer flex-col items-center gap-5 focus-visible:outline-2 focus-visible:outline-offset-8"
            style={{ outlineColor: "var(--ac)" }}
          >
            <span
              className="rounded-full border px-4 py-1 text-xs uppercase tracking-[0.25em]"
              style={{ borderColor: "var(--ac)", color: "var(--ac)" }}
            >
              {t.year}
            </span>
            <div className="glow-pulse rounded-full p-6">
              <Diya size={130} />
            </div>
            <p className={`${cardFont} text-2xl leading-snug`} style={{ color: "var(--ac)" }}>
              {ui.to(data.name, data.withFamily)}
            </p>
            <p className="text-sm opacity-80">{ui.teaser}</p>
            <span
              className="rounded-full px-7 py-3 text-sm font-semibold tracking-wide"
              style={{ background: "var(--ac)", color: "#2a0f1a" }}
            >
              {ui.tap}
            </span>
          </motion.button>
        ) : (
          <motion.section key="card" className="relative z-10 flex w-full max-w-lg flex-col items-center gap-5">
            <motion.span
              {...item(0)}
              className="rounded-full border px-4 py-1 text-xs uppercase tracking-[0.25em]"
              style={{ borderColor: "var(--ac)", color: "var(--ac)" }}
            >
              {t.year}
            </motion.span>
            <motion.div {...item(0.15)}>
              <Diya size={84} />
            </motion.div>
            <motion.p {...item(0.35)} className={`${cardFont} text-xl`} style={{ color: "var(--ac2)" }}>
              {ui.to(data.name, data.withFamily)}
            </motion.p>
            <motion.h1
              {...item(0.55)}
              className={`${cardFont} text-balance text-4xl font-bold leading-tight sm:text-5xl`}
              style={{ color: "var(--ac)", textShadow: "0 0 30px var(--glow)" }}
            >
              {t.title}
            </motion.h1>
            <motion.p {...item(0.8)} className="text-xs uppercase tracking-[0.2em] opacity-70">
              {t.subtitle}
            </motion.p>
            <motion.div {...item(1.1)} className="w-full">
              <Divider />
            </motion.div>

            <Reveal
              text={message}
              delay={msgDelay}
              className={`${cardFont} text-pretty text-lg leading-relaxed sm:text-xl`}
            />

            <motion.ul {...item(afterMsg)} className="flex flex-wrap justify-center gap-2" aria-label="Blessings">
              {t.blessings.map((b) => (
                <li
                  key={b}
                  className="rounded-full border px-3.5 py-1 text-sm"
                  style={{ borderColor: "var(--ac)", background: "rgba(255,255,255,0.07)" }}
                >
                  ✦ {b}
                </li>
              ))}
            </motion.ul>

            {data.note && (
              <motion.p
                {...item(afterMsg + 0.3)}
                className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base"
              >
                “{data.note}”
              </motion.p>
            )}

            {data.fromName && (
              <motion.p {...item(afterMsg + 0.6)} className={`${cardFont} text-lg`}>
                {ui.from} <span style={{ color: "var(--ac)" }}>{data.fromName}</span>
              </motion.p>
            )}

            <motion.button
              {...item(afterMsg + 0.9)}
              type="button"
              onClick={sendBack}
              disabled={replied}
              className="mt-1 cursor-pointer rounded-full px-6 py-3 text-sm font-semibold transition-transform active:scale-95 disabled:cursor-default"
              style={{
                background: replied ? "transparent" : "var(--ac)",
                color: replied ? TEXT_COLOR : "#2a0f1a",
                border: replied ? "1px solid var(--ac)" : "none",
              }}
            >
              {replied ? ui.replied : ui.reply}
            </motion.button>
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
