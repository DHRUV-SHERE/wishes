import type { Metadata } from "next";
import { Poppins, Noto_Serif_Devanagari, Noto_Serif_Gujarati, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ConvexClientProvider } from "./ConvexClientProvider";

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});
const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["600", "700"],
});
const devanagari = Noto_Serif_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["500", "700"],
});
const gujarati = Noto_Serif_Gujarati({
  variable: "--font-gujarati",
  subsets: ["gujarati"],
  weight: ["500", "700"],
});

export const metadata: Metadata = {
  title: "Festival Wishes",
  description: "Send personal festival wishes and see who opened them.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${poppins.variable} ${playfair.variable} ${devanagari.variable} ${gujarati.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <ConvexClientProvider>{children}</ConvexClientProvider>
      </body>
    </html>
  );
}
