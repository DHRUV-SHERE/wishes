export type Festival = "diwali" | "besatuvarsh" | "newyear";
export type Lang = "en" | "hi" | "gu";

export const FESTIVALS: { id: Festival; label: string; emoji: string }[] = [
  { id: "diwali", label: "Diwali", emoji: "🪔" },
  { id: "besatuvarsh", label: "Besatu Varsh", emoji: "🎊" },
  { id: "newyear", label: "New Year", emoji: "🎆" },
];

export const LANGS: { id: Lang; label: string }[] = [
  { id: "gu", label: "ગુજરાતી" },
  { id: "hi", label: "हिन्दी" },
  { id: "en", label: "English" },
];

type FestivalText = { title: string; subtitle: string; message: string };

export const TEXT: Record<Festival, Record<Lang, FestivalText>> = {
  diwali: {
    en: {
      title: "Happy Diwali",
      subtitle: "Shubh Deepavali",
      message:
        "May the festival of lights fill your home and heart with joy, prosperity and good health.",
    },
    hi: {
      title: "शुभ दीपावली",
      subtitle: "दीपों का पर्व मुबारक हो",
      message:
        "दीपों का यह पावन पर्व आपके जीवन में सुख, समृद्धि और खुशियों का उजाला भर दे।",
    },
    gu: {
      title: "દિવાળીની શુભકામનાઓ",
      subtitle: "શુભ દીપાવલી",
      message:
        "દીવાઓનો આ પાવન પર્વ આપના જીવનમાં સુખ, સમૃદ્ધિ અને આનંદનો પ્રકાશ ફેલાવે.",
    },
  },
  besatuvarsh: {
    en: {
      title: "Happy Gujarati New Year",
      subtitle: "Saal Mubarak · Nutan Varshabhinandan",
      message:
        "Wishing you a new year full of happiness, success and good health. Saal Mubarak!",
    },
    hi: {
      title: "नूतन वर्षाभिनंदन",
      subtitle: "साल मुबारक",
      message:
        "नया साल आपके जीवन में नई खुशियाँ, सफलता और अच्छा स्वास्थ्य लेकर आए। साल मुबारक!",
    },
    gu: {
      title: "નૂતન વર્ષાભિનંદન",
      subtitle: "સાલ મુબારક",
      message:
        "સાલ મુબારક! નવું વર્ષ આપના જીવનમાં નવી ખુશીઓ, સફળતા અને સારું સ્વાસ્થ્ય લાવે.",
    },
  },
  newyear: {
    en: {
      title: "Happy New Year",
      subtitle: "Wishing you a bright year ahead",
      message:
        "May every day of the new year bring you new hope, new joy and new reasons to smile.",
    },
    hi: {
      title: "नववर्ष की शुभकामनाएँ",
      subtitle: "आने वाला साल आपके लिए शुभ हो",
      message:
        "नए साल का हर दिन आपके लिए नई उम्मीद, नई खुशियाँ और मुस्कुराने की नई वजहें लेकर आए।",
    },
    gu: {
      title: "નવા વર્ષની શુભેચ્છાઓ",
      subtitle: "આવનારું વર્ષ આપના માટે મંગલમય બને",
      message:
        "નવા વર્ષનો દરેક દિવસ આપના માટે નવી આશા, નવી ખુશીઓ અને હસવાના નવા કારણો લાવે.",
    },
  },
};

export const UI: Record<
  Lang,
  {
    to: (name: string, family: boolean) => string;
    teaser: string;
    tap: string;
    from: string;
    reply: string;
    replied: string;
  }
> = {
  en: {
    to: (n, f) => (f ? `${n} & Family` : n),
    teaser: "A special wish is waiting for you",
    tap: "Tap to open",
    from: "With love,",
    reply: "Send wishes back 💛",
    replied: "Thank you! Your wishes have been sent 🙏",
  },
  hi: {
    to: (n, f) => (f ? `${n} एवं परिवार को` : `${n} को`),
    teaser: "आपके लिए एक खास संदेश इंतज़ार कर रहा है",
    tap: "खोलने के लिए टैप करें",
    from: "सप्रेम,",
    reply: "आप भी शुभकामनाएँ भेजें 💛",
    replied: "धन्यवाद! आपकी शुभकामनाएँ पहुँच गईं 🙏",
  },
  gu: {
    to: (n, f) => (f ? `${n} અને પરિવારને` : `${n} ને`),
    teaser: "આપના માટે એક ખાસ સંદેશ રાહ જુએ છે",
    tap: "ખોલવા માટે ટેપ કરો",
    from: "સ્નેહ સહ,",
    reply: "તમે પણ શુભેચ્છા મોકલો 💛",
    replied: "આભાર! તમારી શુભેચ્છાઓ પહોંચી ગઈ 🙏",
  },
};

// WhatsApp share text
export function shareMessage(
  festival: Festival,
  lang: Lang,
  name: string,
  withFamily: boolean,
  link: string,
) {
  const t = TEXT[festival][lang];
  const emoji = FESTIVALS.find((f) => f.id === festival)?.emoji ?? "✨";
  const who = UI[lang].to(name, withFamily);
  return `${emoji} ${t.title}! ${emoji}\n${who}\n\n${link}`;
}

export type Theme = {
  bg: string; // css background
  accent: string;
  accent2: string;
  text: string;
  confetti: string[];
  ogFrom: string;
  ogTo: string;
};

export const THEMES: Record<Festival, Theme> = {
  diwali: {
    bg: "radial-gradient(ellipse at 50% 0%, #6b1d3a 0%, #2a0f2e 45%, #120716 100%)",
    accent: "#ffc44d",
    accent2: "#ff8a3d",
    text: "#fff4dc",
    confetti: ["#ffc44d", "#ff8a3d", "#ff5e62", "#fff1b8"],
    ogFrom: "#6b1d3a",
    ogTo: "#120716",
  },
  besatuvarsh: {
    bg: "radial-gradient(ellipse at 50% 0%, #c2410c 0%, #7f1d4f 45%, #2b0f3a 100%)",
    accent: "#ffd166",
    accent2: "#ff9f1c",
    text: "#fff6e6",
    confetti: ["#ffd166", "#ff9f1c", "#ef476f", "#06d6a0", "#ffffff"],
    ogFrom: "#c2410c",
    ogTo: "#2b0f3a",
  },
  newyear: {
    bg: "radial-gradient(ellipse at 50% 0%, #1e3a8a 0%, #0f1b4d 45%, #050818 100%)",
    accent: "#f5d27a",
    accent2: "#7dd3fc",
    text: "#f1f5ff",
    confetti: ["#f5d27a", "#7dd3fc", "#c4b5fd", "#ffffff"],
    ogFrom: "#1e3a8a",
    ogTo: "#050818",
  },
};
