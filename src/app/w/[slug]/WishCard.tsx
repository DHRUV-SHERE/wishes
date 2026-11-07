"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Festival, Lang, TEXT, THEMES, UI } from "@/lib/content";

export type WishData = {
  name: string;
  festival: string;
  lang: string;
  withFamily: boolean;
  fromName: string;
  note: string | null;
};

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

function Diya({ accent, accent2, size = 120 }: { accent: string; accent2: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" aria-hidden>
      <defs>
        <radialGradient id="fl" cx="50%" cy="70%" r="60%">
          <stop offset="0%" stopColor="#fffbe0" />
          <stop offset="55%" stopColor={accent} />
          <stop offset="100%" stopColor={accent2} />
        </radialGradient>
        <linearGradient id="bowl" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#d9792b" />
          <stop offset="100%" stopColor="#8a3b12" />
        </linearGradient>
      </defs>
      <g className="flame">
        <path d="M60 18 C72 38 76 50 60 66 C44 50 48 38 60 18 Z" fill="url(#fl)" />
      </g>
      <path d="M20 70 Q60 62 100 70 Q96 100 60 102 Q24 100 20 70 Z" fill="url(#bowl)" />
      <ellipse cx="60" cy="70" rx="40" ry="7" fill="#f3a255" opacity="0.9" />
    </svg>
  );
}

function Sparks({ color }: { color: string }) {
  // deterministic so server and client markup match
  const sparks = useMemo(
    () =>
      Array.from({ length: 22 }, (_, i) => ({
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
            background: color,
            boxShadow: `0 0 ${s.size * 3}px ${color}`,
            animationDuration: `${s.dur}s`,
            animationDelay: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
}

export default function WishCard({ slug, data }: { slug: string; data: WishData }) {
  const festival = (data.festival in THEMES ? data.festival : "diwali") as Festival;
  const lang = (["en", "hi", "gu"].includes(data.lang) ? data.lang : "en") as Lang;
  const theme = THEMES[festival];
  const t = TEXT[festival][lang];
  const ui = UI[lang];
  const [opened, setOpened] = useState(false);
  const [replied, setReplied] = useState(false);
  const cardFont = `font-card-${lang}`;

  useEffect(() => {
    track(slug, "opened");
  }, [slug]);

  function openCard() {
    if (opened) return;
    setOpened(true);
    track(slug, "viewed");
    const fire = (origin: number) =>
      confetti({
        particleCount: 90,
        spread: 80,
        startVelocity: 45,
        origin: { x: origin, y: 0.75 },
        colors: theme.confetti,
      });
    fire(0.2);
    fire(0.8);
    setTimeout(() => fire(0.5), 450);
  }

  function sendBack() {
    if (replied) return;
    setReplied(true);
    track(slug, "replied");
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.9 }, colors: theme.confetti });
  }

  return (
    <main
      className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 py-10 text-center"
      style={{ background: theme.bg, color: theme.text, ["--glow" as string]: `${theme.accent}55` }}
    >
      <Sparks color={theme.accent} />

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
            className="relative z-10 flex max-w-sm cursor-pointer flex-col items-center gap-6 focus-visible:outline-2 focus-visible:outline-offset-8"
            style={{ outlineColor: theme.accent }}
          >
            <div className="glow-pulse rounded-full p-6" style={{ ["--glow" as string]: `${theme.accent}66` }}>
              <Diya accent={theme.accent} accent2={theme.accent2} size={130} />
            </div>
            <p className={`${cardFont} text-2xl leading-snug`} style={{ color: theme.accent }}>
              {ui.to(data.name, data.withFamily)}
            </p>
            <p className="text-sm opacity-80">{ui.teaser}</p>
            <span
              className="rounded-full px-7 py-3 text-sm font-semibold tracking-wide"
              style={{ background: theme.accent, color: "#2a0f1a" }}
            >
              {ui.tap}
            </span>
          </motion.button>
        ) : (
          <motion.section
            key="card"
            className="relative z-10 flex w-full max-w-md flex-col items-center gap-5"
            initial="hidden"
            animate="show"
            variants={{ show: { transition: { staggerChildren: 0.35 } } }}
          >
            {[
              <Diya key="d" accent={theme.accent} accent2={theme.accent2} size={96} />,
              <p key="to" className={`${cardFont} text-xl`} style={{ color: theme.accent2 }}>
                {ui.to(data.name, data.withFamily)}
              </p>,
              <h1
                key="t"
                className={`${cardFont} text-balance text-4xl font-bold leading-tight sm:text-5xl`}
                style={{ color: theme.accent }}
              >
                {t.title}
              </h1>,
              <p key="s" className="text-sm uppercase tracking-[0.2em] opacity-70">
                {t.subtitle}
              </p>,
              <p key="m" className={`${cardFont} text-pretty text-lg leading-relaxed opacity-95`}>
                {t.message}
              </p>,
              ...(data.note
                ? [
                    <p key="n" className="rounded-2xl border border-white/20 bg-white/10 px-5 py-3 text-base">
                      “{data.note}”
                    </p>,
                  ]
                : []),
              data.fromName ? (
                <p key="f" className={`${cardFont} text-lg`}>
                  {ui.from} <span style={{ color: theme.accent }}>{data.fromName}</span>
                </p>
              ) : (
                <span key="f" />
              ),
              <button
                key="r"
                type="button"
                onClick={sendBack}
                disabled={replied}
                className="mt-2 cursor-pointer rounded-full px-6 py-3 text-sm font-semibold transition-transform active:scale-95 disabled:cursor-default"
                style={{
                  background: replied ? "transparent" : theme.accent,
                  color: replied ? theme.text : "#2a0f1a",
                  border: replied ? `1px solid ${theme.accent}` : "none",
                }}
              >
                {replied ? ui.replied : ui.reply}
              </button>,
            ].map((el, i) => (
              <motion.div
                key={i}
                variants={{ hidden: { opacity: 0, y: 18 }, show: { opacity: 1, y: 0 } }}
                transition={{ duration: 0.7, ease: "easeOut" }}
              >
                {el}
              </motion.div>
            ))}
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
}
