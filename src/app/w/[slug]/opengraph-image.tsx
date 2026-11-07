import { ImageResponse } from "next/og";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { THEMES, Festival } from "@/lib/content";

export const alt = "A festival wish for you";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const HEADLINE: Record<Festival, string> = {
  diwali: "Happy Diwali",
  besatuvarsh: "Saal Mubarak",
  newyear: "Happy New Year",
};

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let festival: Festival = "diwali";
  try {
    const d = await fetchQuery(api.wishes.getBySlug, { slug });
    if (d && d.festival in THEMES) festival = d.festival as Festival;
  } catch {
    /* fall back to default */
  }
  const theme = THEMES[festival];

  // Latin-only text: the default OG font cannot render Hindi/Gujarati glyphs.
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(160deg, ${theme.ogFrom}, ${theme.ogTo})`,
          color: theme.accent,
        }}
      >
        <div style={{ fontSize: 120, fontWeight: 700 }}>{HEADLINE[festival]}</div>
        <div style={{ fontSize: 40, marginTop: 24, color: theme.text, opacity: 0.85 }}>
          A special wish is waiting for you
        </div>
      </div>
    ),
    { ...size },
  );
}
