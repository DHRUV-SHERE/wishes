import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { fetchQuery } from "convex/nextjs";
import { api } from "../../../../convex/_generated/api";
import { FESTIVALS, Festival, Lang, TEXT, UI } from "@/lib/content";
import WishCard from "./WishCard";

type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    return await fetchQuery(api.wishes.getBySlug, { slug });
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Wishes" };
  const festival = (data.festival as Festival) in TEXT ? (data.festival as Festival) : "diwali";
  const lang = (data.lang as Lang) in UI ? (data.lang as Lang) : "en";
  const emoji = FESTIVALS.find((f) => f.id === festival)?.emoji ?? "✨";
  const title = `${emoji} ${TEXT[festival][lang].title} — ${UI[lang].to(data.name, data.withFamily)}`;
  return {
    title,
    description: TEXT[festival][lang].message,
    robots: { index: false, follow: false },
    openGraph: { title, description: UI[lang].teaser },
  };
}

export default async function WishPage({ params }: Props) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  return <WishCard slug={slug} data={data} />;
}
