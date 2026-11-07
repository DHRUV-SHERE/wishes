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

export const PRESET_LABELS = ["Classic", "Blessing", "Heartfelt"];

type FestivalText = {
  title: string;
  subtitle: string;
  year: string; // small chip above the title
  blessings: [string, string, string];
  messages: [string, string, string]; // three ready-made messages
};

export const TEXT: Record<Festival, Record<Lang, FestivalText>> = {
  diwali: {
    en: {
      title: "Happy Diwali",
      subtitle: "Shubh Deepavali",
      year: "Diwali · 2026",
      blessings: ["Health", "Prosperity", "Joy"],
      messages: [
        "May the festival of lights fill your home and heart with joy, prosperity and good health.",
        "May Maa Lakshmi bless you and your family with wealth, wisdom and endless happiness this Diwali and always.",
        "Wishing you a Diwali as bright as a thousand diyas, full of sweet moments, warm hugs and loved ones around you.",
      ],
    },
    hi: {
      title: "शुभ दीपावली",
      subtitle: "दीपों का पर्व मुबारक हो",
      year: "दीपावली · २०२६",
      blessings: ["स्वास्थ्य", "समृद्धि", "खुशियाँ"],
      messages: [
        "दीपों का यह पावन पर्व आपके जीवन में सुख, समृद्धि और खुशियों का उजाला भर दे।",
        "इस दीपावली माँ लक्ष्मी की कृपा आप और आपके परिवार पर सदा बनी रहे। आपका घर धन, सुख और शांति से भरा रहे।",
        "हज़ार दीयों जैसी रोशन दीवाली हो आपकी, मिठाइयों की मिठास, अपनों का साथ और ढेर सारी हँसी के साथ।",
      ],
    },
    gu: {
      title: "દિવાળીની શુભકામનાઓ",
      subtitle: "શુભ દીપાવલી",
      year: "દિવાળી · ૨૦૨૬",
      blessings: ["સ્વાસ્થ્ય", "સમૃદ્ધિ", "આનંદ"],
      messages: [
        "દીવાઓનો આ પાવન પર્વ આપના જીવનમાં સુખ, સમૃદ્ધિ અને આનંદનો પ્રકાશ ફેલાવે.",
        "આ દિવાળીએ માતા લક્ષ્મીની કૃપા આપ અને આપના પરિવાર પર સદા રહે. આપનું ઘર ધન, સુખ અને શાંતિથી ભર્યું રહે.",
        "હજાર દીવાઓ જેવી ઝળહળતી દિવાળી આપની હોય, મીઠાઈની મીઠાશ, સ્વજનોનો સાથ અને ખૂબ બધા હાસ્ય સાથે.",
      ],
    },
  },
  besatuvarsh: {
    en: {
      title: "Happy Gujarati New Year",
      subtitle: "Saal Mubarak · Nutan Varshabhinandan",
      year: "Vikram Samvat 2083",
      blessings: ["Happiness", "Success", "Good Health"],
      messages: [
        "Wishing you a new year full of happiness, success and good health. Saal Mubarak!",
        "As the new Vikram Samvat begins, may every step you take lead to prosperity and every day bring a reason to smile. Saal Mubarak!",
        "Thank you for being a part of our lives. May the new year strengthen every bond and fill your family with love and laughter.",
      ],
    },
    hi: {
      title: "नूतन वर्षाभिनंदन",
      subtitle: "साल मुबारक",
      year: "विक्रम संवत २०८३",
      blessings: ["खुशियाँ", "सफलता", "अच्छा स्वास्थ्य"],
      messages: [
        "नया साल आपके जीवन में नई खुशियाँ, सफलता और अच्छा स्वास्थ्य लेकर आए। साल मुबारक!",
        "नए विक्रम संवत की शुरुआत पर आपका हर कदम समृद्धि की ओर बढ़े और हर दिन मुस्कुराने की वजह लाए। साल मुबारक!",
        "हमारे जीवन का हिस्सा बनने के लिए धन्यवाद। नया साल हर रिश्ते को और मज़बूत करे और आपके परिवार को प्यार व हँसी से भर दे।",
      ],
    },
    gu: {
      title: "નૂતન વર્ષાભિનંદન",
      subtitle: "સાલ મુબારક",
      year: "વિક્રમ સંવત ૨૦૮૩",
      blessings: ["ખુશીઓ", "સફળતા", "સારું સ્વાસ્થ્ય"],
      messages: [
        "સાલ મુબારક! નવું વર્ષ આપના જીવનમાં નવી ખુશીઓ, સફળતા અને સારું સ્વાસ્થ્ય લાવે.",
        "નવા વિક્રમ સંવતની શરૂઆતે આપનું દરેક પગલું સમૃદ્ધિ તરફ લઈ જાય અને દરેક દિવસ હસવાનું કારણ લાવે. સાલ મુબારક!",
        "અમારા જીવનનો ભાગ બનવા બદલ આભાર. નવું વર્ષ દરેક સંબંધને વધુ મજબૂત કરે અને આપના પરિવારને પ્રેમ અને હાસ્યથી ભરી દે.",
      ],
    },
  },
  newyear: {
    en: {
      title: "Happy New Year",
      subtitle: "Wishing you a bright year ahead",
      year: "Welcome 2027",
      blessings: ["Hope", "Success", "Joy"],
      messages: [
        "May every day of the new year bring you new hope, new joy and new reasons to smile.",
        "Here's to fresh starts, big dreams and the courage to chase them. Wishing you and your family a wonderful year ahead!",
        "Thank you for every memory this year. May the next one be even brighter, healthier and happier for you and your loved ones.",
      ],
    },
    hi: {
      title: "नववर्ष की शुभकामनाएँ",
      subtitle: "आने वाला साल आपके लिए शुभ हो",
      year: "नववर्ष २०२७",
      blessings: ["उम्मीद", "सफलता", "खुशियाँ"],
      messages: [
        "नए साल का हर दिन आपके लिए नई उम्मीद, नई खुशियाँ और मुस्कुराने की नई वजहें लेकर आए।",
        "नई शुरुआत, बड़े सपनों और उन्हें पूरा करने के हौसले के नाम! आपको और आपके परिवार को आने वाला साल मंगलमय हो।",
        "इस साल की हर याद के लिए शुक्रिया। आने वाला साल आपके और आपके अपनों के लिए और भी उजला, स्वस्थ और खुशहाल हो।",
      ],
    },
    gu: {
      title: "નવા વર્ષની શુભેચ્છાઓ",
      subtitle: "આવનારું વર્ષ આપના માટે મંગલમય બને",
      year: "નવું વર્ષ ૨૦૨૭",
      blessings: ["આશા", "સફળતા", "આનંદ"],
      messages: [
        "નવા વર્ષનો દરેક દિવસ આપના માટે નવી આશા, નવી ખુશીઓ અને હસવાના નવા કારણો લાવે.",
        "નવી શરૂઆત, મોટા સપનાં અને તેને પૂરા કરવાની હિંમતના નામે! આપને અને આપના પરિવારને આવનારું વર્ષ મંગલમય બને.",
        "આ વર્ષની દરેક યાદ માટે આભાર. આવનારું વર્ષ આપના અને આપના સ્વજનો માટે વધુ ઉજ્જવળ, સ્વસ્થ અને ખુશહાલ બને.",
      ],
    },
  },
};

// Message shown on the card: the sender's own text wins over the preset.
export function resolveMessage(
  festival: Festival,
  lang: Lang,
  idx: number | null | undefined,
  custom: string | null | undefined,
) {
  if (custom && custom.trim()) return custom.trim();
  const list = TEXT[festival][lang].messages;
  return list[(idx ?? 0) % list.length];
}

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

// ---- colour palettes: the card cross-fades through these on its own ----
export type Palette = {
  c1: string; // glow at the top
  c2: string; // middle
  c3: string; // deep bottom
  accent: string;
  accent2: string;
};

export const PALETTES: Record<Festival, Palette[]> = {
  diwali: [
    { c1: "#6b1d3a", c2: "#2a0f2e", c3: "#120716", accent: "#ffc44d", accent2: "#ff8a3d" },
    { c1: "#2f2a7a", c2: "#14123f", c3: "#07061c", accent: "#ffd36b", accent2: "#ff9a5a" },
    { c1: "#0f6b6b", c2: "#0b3a47", c3: "#051a24", accent: "#ffd166", accent2: "#ff7b54" },
    { c1: "#a3205f", c2: "#50123f", c3: "#1c0719", accent: "#ffcf5c", accent2: "#ff6f91" },
  ],
  besatuvarsh: [
    { c1: "#c2410c", c2: "#7f1d4f", c3: "#2b0f3a", accent: "#ffd166", accent2: "#ff9f1c" },
    { c1: "#0f766e", c2: "#134e4a", c3: "#042f2e", accent: "#fde68a", accent2: "#fb923c" },
    { c1: "#1d4ed8", c2: "#312e81", c3: "#0f0a2e", accent: "#fcd34d", accent2: "#f472b6" },
    { c1: "#be185d", c2: "#6b1146", c3: "#2a0a22", accent: "#fde047", accent2: "#fb7185" },
  ],
  newyear: [
    { c1: "#1e3a8a", c2: "#0f1b4d", c3: "#050818", accent: "#f5d27a", accent2: "#7dd3fc" },
    { c1: "#5b21b6", c2: "#2e1065", c3: "#0f0524", accent: "#fcd34d", accent2: "#67e8f9" },
    { c1: "#0e7490", c2: "#0c3a52", c3: "#04121c", accent: "#fde68a", accent2: "#a78bfa" },
    { c1: "#9f1239", c2: "#3b0a1f", c3: "#12040b", accent: "#fbbf24", accent2: "#fda4af" },
  ],
};

export const TEXT_COLOR = "#fff6e6";

// Used by the link-preview image (first palette of each festival)
export const THEMES: Record<
  Festival,
  { accent: string; text: string; ogFrom: string; ogTo: string }
> = {
  diwali: { accent: PALETTES.diwali[0].accent, text: TEXT_COLOR, ogFrom: PALETTES.diwali[0].c1, ogTo: PALETTES.diwali[0].c3 },
  besatuvarsh: { accent: PALETTES.besatuvarsh[0].accent, text: TEXT_COLOR, ogFrom: PALETTES.besatuvarsh[0].c1, ogTo: PALETTES.besatuvarsh[0].c3 },
  newyear: { accent: PALETTES.newyear[0].accent, text: TEXT_COLOR, ogFrom: PALETTES.newyear[0].c1, ogTo: PALETTES.newyear[0].c3 },
};
