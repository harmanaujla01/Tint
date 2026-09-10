import { type Oklch, fromHex, rgbToOklch, toHex } from "./color.ts";

/**
 * The built-in shelf: seventy hand-picked palettes, tagged by mood.
 *
 * This is what makes "describe a mood" work with no server and no API key.
 * A model would be a heavier, slower, less predictable way to answer
 * "something calm and coastal" than a tagged shelf and a scoring function —
 * and it would put a key in a static site. The shelf is also the sampling
 * pool the generator borrows real-world colour relationships from, so the
 * suggestions are anchored in palettes a person actually chose.
 */
export type LibraryPalette = {
  name: string;
  tags: string[];
  colors: string[];
};

export const LIBRARY: LibraryPalette[] = [
  // — soft / pastel ————————————————————————————————————————————
  { name: "Blush Hour", tags: ["soft", "pink", "romantic", "pastel", "feminine"], colors: ["#fff1f3", "#ffd9e1", "#f4a9be", "#c97b94", "#7a4a5c"] },
  { name: "Cotton Sky", tags: ["soft", "blue", "calm", "pastel", "airy"], colors: ["#f4f9ff", "#d9e9fa", "#a9ccee", "#6e9bc7", "#3d5a78"] },
  { name: "Mint Cream", tags: ["soft", "green", "fresh", "pastel", "mint"], colors: ["#f2fbf6", "#d3f0e0", "#a2dcc0", "#6bae93", "#3a6355"] },
  { name: "Lilac Dust", tags: ["soft", "purple", "dreamy", "pastel", "calm"], colors: ["#f8f5ff", "#e4dcf7", "#c4b4ea", "#9384c4", "#574c77"] },
  { name: "Butter", tags: ["soft", "yellow", "warm", "pastel", "cozy"], colors: ["#fffcef", "#fdf0c4", "#f6dc8b", "#d4b458", "#7c682f"] },
  { name: "Peach Sorbet", tags: ["soft", "orange", "summer", "pastel", "food"], colors: ["#fff4ee", "#ffdcc8", "#fcb89a", "#da8a66", "#82503a"] },
  { name: "Sea Glass", tags: ["soft", "teal", "calm", "coastal", "pastel"], colors: ["#f1fafa", "#d2edec", "#a3d6d4", "#6ba5a3", "#3c5f5e"] },
  { name: "Powder", tags: ["soft", "neutral", "beige", "minimal", "pastel"], colors: ["#faf7f5", "#ede4de", "#d6c4ba", "#a99286", "#63534b"] },

  // — warm / earth ————————————————————————————————————————————
  { name: "Terracotta", tags: ["warm", "earth", "clay", "rustic", "orange"], colors: ["#fbf3ec", "#f0d9c6", "#d89e77", "#a9683f", "#5e3721"] },
  { name: "Desert Road", tags: ["warm", "earth", "sand", "desert", "gold"], colors: ["#fdf6e9", "#f0dfbb", "#d9b87a", "#a88448", "#5f4a26"] },
  { name: "Burnt Sienna", tags: ["warm", "earth", "autumn", "red", "rustic"], colors: ["#fcefe9", "#f3cdbb", "#db8f6e", "#a85b3b", "#5d2f1c"] },
  { name: "Harvest", tags: ["warm", "autumn", "gold", "harvest", "earth"], colors: ["#fbf4e4", "#efdda9", "#d8ae55", "#a97c2c", "#5e4315"] },
  { name: "Cinnamon", tags: ["warm", "brown", "spice", "cozy", "earth"], colors: ["#f9f1ec", "#e9d2c2", "#cb9e80", "#96684a", "#543423"] },
  { name: "Adobe", tags: ["warm", "earth", "southwest", "clay", "neutral"], colors: ["#faf0e6", "#ebd3b8", "#cfa57c", "#9c7248", "#573d24"] },
  { name: "Rust Belt", tags: ["warm", "rust", "industrial", "brown", "earth"], colors: ["#f7eeea", "#e3c6b8", "#c08a70", "#8c543c", "#4c2a1c"] },
  { name: "Amber Room", tags: ["warm", "amber", "gold", "luxury", "elegant"], colors: ["#fff8e8", "#fbe7b0", "#eec15d", "#bc8f27", "#6a4e10"] },

  // — cool / calm ————————————————————————————————————————————
  { name: "Deep Harbour", tags: ["cool", "blue", "calm", "coastal", "navy"], colors: ["#f1f6fa", "#d2e1ec", "#9cbbd2", "#5d82a0", "#2e4a60"] },
  { name: "Fog", tags: ["cool", "grey", "minimal", "calm", "fog"], colors: ["#f6f8f9", "#e1e7ea", "#bfcbd1", "#8b9aa2", "#4e5a60"] },
  { name: "Glacier", tags: ["cool", "ice", "blue", "winter", "fresh"], colors: ["#f0fafc", "#cfedf3", "#9bd6e3", "#5fa1b2", "#2f5b68"] },
  { name: "Slate Blue", tags: ["cool", "blue", "slate", "professional", "calm"], colors: ["#f3f5fa", "#dde2f0", "#b2bcdb", "#7a85ad", "#414970"] },
  { name: "Storm", tags: ["cool", "grey", "storm", "neutral", "moody"], colors: ["#f2f4f4", "#dce1e1", "#b0b9ba", "#7c8788", "#454e4f"] },
  { name: "Nordic", tags: ["cool", "green", "nordic", "minimal", "calm"], colors: ["#f7f9f8", "#e3eae7", "#c0cfc9", "#8ca298", "#4f625a"] },
  { name: "Periwinkle", tags: ["cool", "purple", "blue", "dreamy", "soft"], colors: ["#f5f6ff", "#e0e3fc", "#b8bef5", "#8188cb", "#4a4f82"] },
  { name: "Moonstone", tags: ["cool", "grey", "blue", "calm", "minimal"], colors: ["#f4f8fa", "#dee9ee", "#b5cbd5", "#7e97a3", "#46595f"] },

  // — vibrant / bold ————————————————————————————————————————
  { name: "Sunburst", tags: ["vibrant", "bold", "warm", "summer", "energetic"], colors: ["#fff6e0", "#ffd84d", "#ff9f1c", "#e5432e", "#7a1b12"] },
  { name: "Playground", tags: ["vibrant", "playful", "fun", "bold", "kids"], colors: ["#fff3f7", "#ff6fa5", "#ffc93c", "#3ecfa0", "#2b4570"] },
  { name: "Popsicle", tags: ["vibrant", "playful", "summer", "fun", "bold"], colors: ["#fff9f0", "#ff8360", "#ffd166", "#06d6a0", "#118ab2"] },
  { name: "Carnival", tags: ["vibrant", "fun", "carnival", "bold", "playful"], colors: ["#fff2fa", "#f45b98", "#ffb627", "#4ecdc4", "#35316b"] },
  { name: "Citrus Punch", tags: ["vibrant", "citrus", "energetic", "bold", "warm"], colors: ["#fffde8", "#ffe94f", "#ffb000", "#ff5e3a", "#a02a18"] },
  { name: "Electric Bloom", tags: ["vibrant", "bold", "electric", "purple", "energetic"], colors: ["#fbf2ff", "#e56bff", "#8a4fff", "#3abeff", "#14235c"] },
  { name: "Tropicana", tags: ["vibrant", "tropical", "summer", "fun", "bold"], colors: ["#fffaf0", "#ff7b54", "#ffb26b", "#4cd3a9", "#1c6e7d"] },
  { name: "Poster", tags: ["vibrant", "bold", "poster", "graphic", "retro"], colors: ["#fff8f0", "#ff4d4d", "#ffc300", "#2ec4b6", "#1a1423"] },

  // — dark / moody ————————————————————————————————————————
  { name: "Midnight Ink", tags: ["dark", "moody", "night", "navy", "serious"], colors: ["#e8eaf0", "#a9b0c4", "#5c6684", "#2c3348", "#12151f"] },
  { name: "Charcoal", tags: ["dark", "moody", "neutral", "minimal", "mono"], colors: ["#ededed", "#c2c2c2", "#7e7e7e", "#414141", "#171717"] },
  { name: "Oxblood", tags: ["dark", "moody", "red", "wine", "luxury"], colors: ["#f5e9ea", "#d9a9ae", "#a85c66", "#6b2c36", "#2c1015"] },
  { name: "Forest Night", tags: ["dark", "green", "forest", "moody", "nature"], colors: ["#e9f0ea", "#b3c9b6", "#6e8f74", "#3b5540", "#16241a"] },
  { name: "Obsidian", tags: ["dark", "purple", "moody", "night", "mystic"], colors: ["#eceaf2", "#bdb6cc", "#7a7191", "#423a55", "#191424"] },
  { name: "Deep Sea", tags: ["dark", "teal", "ocean", "moody", "deep"], colors: ["#e6f1f3", "#a8cbd2", "#5e939e", "#2f5a64", "#10262c"] },
  { name: "Espresso", tags: ["dark", "brown", "coffee", "cozy", "warm"], colors: ["#f2ece7", "#d2c0b2", "#9c8069", "#5e4736", "#281b12"] },
  { name: "Noir", tags: ["dark", "mono", "noir", "minimal", "serious"], colors: ["#f0f0f2", "#b8b8be", "#6e6e77", "#38383f", "#101013"] },

  // — nature ————————————————————————————————————————————————
  { name: "Moss Path", tags: ["nature", "green", "moss", "organic", "fresh"], colors: ["#f3f7ee", "#dce8cb", "#b0c98d", "#7c9455", "#45542c"] },
  { name: "Sage Kitchen", tags: ["nature", "sage", "green", "calm", "organic"], colors: ["#f5f7f2", "#e0e7d8", "#bac7ac", "#8b9a7b", "#515c45"] },
  { name: "Riverbed", tags: ["nature", "green", "river", "calm", "organic"], colors: ["#f1f5f3", "#d3e2db", "#a2c0b3", "#6f8e80", "#3e534a"] },
  { name: "Wildflower", tags: ["nature", "flower", "meadow", "warm", "playful"], colors: ["#fbf6f9", "#ebd3e4", "#c88fb4", "#e0a458", "#5c6b3f"] },
  { name: "Bark & Leaf", tags: ["nature", "olive", "earth", "organic", "forest"], colors: ["#f5f3ec", "#dfdac6", "#adae84", "#77754c", "#3f3e24"] },
  { name: "Coastal Pine", tags: ["nature", "green", "coastal", "pine", "calm"], colors: ["#eff5f2", "#cde1d8", "#94bcaa", "#5a8874", "#2f4e40"] },
  { name: "Sunflower Field", tags: ["nature", "yellow", "summer", "flower", "warm"], colors: ["#fffbea", "#ffeda8", "#f5c842", "#c29416", "#6b5b1f"] },
  { name: "Lavender Field", tags: ["nature", "purple", "lavender", "calm", "flower"], colors: ["#f7f5fb", "#e2dcf0", "#b7aad8", "#8272ac", "#4b4067"] },

  // — retro / vintage ————————————————————————————————————————
  { name: "Diner", tags: ["retro", "vintage", "diner", "fifties", "warm"], colors: ["#fbf2e3", "#f0d9a8", "#e27d60", "#41729f", "#23384e"] },
  { name: "Kodak", tags: ["retro", "vintage", "film", "warm", "sepia"], colors: ["#fbf3e4", "#ebd3a0", "#d4a05c", "#8c6a3f", "#43361f"] },
  { name: "Seventies", tags: ["retro", "seventies", "vintage", "warm", "orange"], colors: ["#fcf3e3", "#edc385", "#d98b4a", "#9e5b3a", "#5e3a2a"] },
  { name: "Vinyl", tags: ["retro", "vinyl", "vintage", "brown", "music"], colors: ["#f6f1e9", "#dcc9a8", "#b98a5e", "#7a4e3a", "#2e1d18"] },
  { name: "Arcade", tags: ["retro", "arcade", "eighties", "playful", "fun"], colors: ["#fdf4f8", "#ff9bc2", "#6edcd0", "#ffd166", "#2f2440"] },
  { name: "Faded Poster", tags: ["retro", "vintage", "faded", "neutral", "paper"], colors: ["#f7f2ea", "#e0cdb4", "#c08e6e", "#7e6b5a", "#3e3730"] },

  // — neon / cyber ————————————————————————————————————————
  { name: "Cyberpunk", tags: ["neon", "cyber", "futuristic", "night", "bold"], colors: ["#f2e9ff", "#ff3cac", "#7a5cff", "#00e5ff", "#0b0b1f"] },
  { name: "Synthwave", tags: ["neon", "synthwave", "eighties", "retro", "night"], colors: ["#fff0f8", "#ff6ec7", "#b14aed", "#4dd5ff", "#17133a"] },
  { name: "Terminal", tags: ["neon", "terminal", "green", "tech", "code"], colors: ["#eafbef", "#7cffb2", "#23d97a", "#128149", "#041710"] },
  { name: "Vapor", tags: ["neon", "vaporwave", "dreamy", "pastel", "retro"], colors: ["#f6f2ff", "#ffb7f5", "#a0f2ff", "#7c6bff", "#241c46"] },
  { name: "Signal", tags: ["neon", "tech", "bold", "electric", "night"], colors: ["#f0fff7", "#45ffa1", "#00c2ff", "#ff2e9a", "#0a1224"] },

  // — minimal / mono ————————————————————————————————————————
  { name: "Paper", tags: ["minimal", "mono", "neutral", "paper", "clean"], colors: ["#ffffff", "#f1f1f0", "#d6d6d3", "#8e8e8a", "#2a2a28"] },
  { name: "Concrete", tags: ["minimal", "mono", "concrete", "neutral", "brutalist"], colors: ["#f5f5f4", "#e0dfdc", "#b6b4af", "#7b7975", "#3a3937"] },
  { name: "Blueprint", tags: ["minimal", "blue", "blueprint", "technical", "cool"], colors: ["#f4f7fb", "#dde6f1", "#adc0d6", "#6b84a0", "#223349"] },
  { name: "Newsprint", tags: ["minimal", "paper", "newsprint", "neutral", "editorial"], colors: ["#faf8f4", "#e8e3d9", "#c0b8a8", "#837b6c", "#35302a"] },
  { name: "Bone", tags: ["minimal", "neutral", "bone", "warm", "calm"], colors: ["#fdfcfa", "#f0ebe3", "#d5cbbc", "#9a8e7c", "#4a4237"] },
  { name: "Graphite", tags: ["minimal", "mono", "grey", "neutral", "professional"], colors: ["#f7f7f8", "#e2e2e5", "#b4b4ba", "#75757d", "#33333a"] },

  // — luxury / editorial ————————————————————————————————————
  { name: "Champagne", tags: ["luxury", "gold", "champagne", "elegant", "warm"], colors: ["#fdfaf3", "#f2e6cc", "#dcc48e", "#a88f55", "#574722"] },
  { name: "Emerald Suite", tags: ["luxury", "green", "emerald", "elegant", "rich"], colors: ["#eff6f1", "#c9e2d2", "#7fb99a", "#3c7a5c", "#17402d"] },
  { name: "Velvet", tags: ["luxury", "purple", "velvet", "elegant", "rich"], colors: ["#f6f0f6", "#dfc7df", "#b287b5", "#74497a", "#33193a"] },
  { name: "Ink & Gold", tags: ["luxury", "gold", "editorial", "elegant", "dark"], colors: ["#faf7f0", "#e6dbc2", "#c2a25c", "#4a4636", "#16150f"] },
  { name: "Rosewood", tags: ["luxury", "red", "rosewood", "elegant", "warm"], colors: ["#faf1f0", "#e6c9c6", "#c2867f", "#8a4a45", "#40191a"] },
];

/** Every colour on the shelf, as a flat sampling pool. */
export const LIBRARY_COLORS: Oklch[] = LIBRARY.flatMap((p) =>
  p.colors.map((hex) => fromHex(hex)!),
);

// ---------------------------------------------------------------------------
// Mood search
// ---------------------------------------------------------------------------

/**
 * Words people actually type, mapped onto the tags the shelf uses.
 *
 * "Describe a mood" is a search problem, not a generation problem: the user
 * is trying to *find* the palette they already half-imagine. Expanding their
 * words onto a controlled vocabulary is how every search box has done this
 * for thirty years, and it answers instantly and identically every time.
 */
const SYNONYMS: Record<string, string[]> = {
  happy: ["playful", "vibrant", "fun"],
  joyful: ["playful", "vibrant", "fun"],
  sad: ["moody", "dark", "grey"],
  melancholy: ["moody", "dark", "grey"],
  calm: ["calm", "soft", "minimal"],
  quiet: ["calm", "minimal", "soft"],
  peaceful: ["calm", "soft", "nature"],
  energetic: ["vibrant", "bold", "electric"],
  loud: ["vibrant", "bold"],
  professional: ["professional", "minimal", "cool"],
  corporate: ["professional", "minimal", "blue"],
  serious: ["serious", "dark", "professional"],
  cozy: ["cozy", "warm", "earth"],
  warm: ["warm"],
  cold: ["cool", "ice", "winter"],
  luxury: ["luxury", "elegant", "gold"],
  premium: ["luxury", "elegant"],
  expensive: ["luxury", "elegant", "gold"],
  cheap: ["playful", "bold"],
  spooky: ["dark", "moody", "night"],
  scary: ["dark", "moody", "night"],
  halloween: ["dark", "orange", "night"],
  ocean: ["coastal", "ocean", "teal", "blue"],
  sea: ["coastal", "ocean", "teal"],
  beach: ["coastal", "summer", "sand"],
  forest: ["forest", "nature", "green"],
  woods: ["forest", "nature", "green"],
  mountain: ["nature", "cool", "grey"],
  sunset: ["warm", "orange", "vibrant"],
  sunrise: ["warm", "soft", "yellow"],
  winter: ["cool", "ice", "winter"],
  spring: ["fresh", "pastel", "green"],
  summer: ["summer", "vibrant", "warm"],
  autumn: ["autumn", "warm", "earth"],
  fall: ["autumn", "warm", "earth"],
  night: ["night", "dark"],
  clean: ["minimal", "clean", "neutral"],
  simple: ["minimal", "clean"],
  modern: ["minimal", "cool", "professional"],
  startup: ["tech", "minimal", "blue"],
  saas: ["tech", "minimal", "professional"],
  tech: ["tech", "electric", "blue"],
  wedding: ["soft", "elegant", "romantic"],
  romantic: ["romantic", "soft", "pink"],
  food: ["food", "warm", "earth"],
  restaurant: ["warm", "food", "earth"],
  coffee: ["coffee", "brown", "cozy"],
  kids: ["kids", "playful", "vibrant"],
  children: ["kids", "playful", "fun"],
  medical: ["clean", "fresh", "blue", "calm"],
  health: ["fresh", "green", "calm"],
  finance: ["professional", "blue", "minimal"],
  bank: ["professional", "blue", "minimal"],
  vintage: ["vintage", "retro", "faded"],
  futuristic: ["neon", "cyber", "electric"],
  earthy: ["earth", "organic", "brown"],
  muted: ["faded", "neutral", "soft"],
  dreamy: ["dreamy", "pastel", "soft"],
  bold: ["bold", "vibrant"],
  dark: ["dark", "moody"],
  light: ["soft", "pastel", "minimal"],

  // British spellings, because the rest of this project is written in them.
  cosy: ["cozy", "warm", "earth"],
  colourful: ["vibrant", "bold", "fun"],
  colorful: ["vibrant", "bold", "fun"],
  greyscale: ["mono", "grey", "minimal"],
  grayscale: ["mono", "grey", "minimal"],
  monochrome: ["mono", "minimal", "grey"],

  // The nouns people reach for instead of adjectives. Someone describing a
  // mood rarely says "warm and earthy" — they say "a bakery".
  bakery: ["warm", "food", "cozy", "brown"],
  cafe: ["coffee", "brown", "cozy", "warm"],
  pastry: ["soft", "warm", "food"],
  garden: ["nature", "green", "flower"],
  desert: ["desert", "sand", "warm", "earth"],
  snow: ["ice", "winter", "cool", "minimal"],
  fire: ["warm", "orange", "bold"],
  wine: ["wine", "dark", "luxury", "red"],
  spa: ["calm", "soft", "green", "minimal"],
  yoga: ["calm", "soft", "nature"],
  gym: ["bold", "dark", "energetic"],
  fitness: ["bold", "energetic", "dark"],
  travel: ["coastal", "warm", "nature"],
  music: ["music", "retro", "vinyl", "bold"],
  book: ["editorial", "paper", "neutral", "vintage"],
  reading: ["editorial", "paper", "neutral"],
  portfolio: ["minimal", "editorial", "neutral"],
  blog: ["editorial", "paper", "minimal"],
  shop: ["clean", "minimal", "professional"],
  ecommerce: ["clean", "minimal", "professional"],
  fashion: ["elegant", "minimal", "luxury"],
  beauty: ["soft", "pastel", "elegant", "pink"],
  skincare: ["soft", "pastel", "clean"],
  baby: ["soft", "pastel", "kids"],
  party: ["playful", "vibrant", "fun"],
  birthday: ["playful", "vibrant", "fun"],
  christmas: ["red", "green", "winter", "cozy"],
  valentine: ["pink", "romantic", "soft"],
  gaming: ["neon", "arcade", "bold", "night"],
  space: ["night", "dark", "purple", "neon"],
  sunny: ["warm", "yellow", "summer"],
  rainy: ["cool", "grey", "fog", "moody"],
  retro: ["retro", "vintage", "eighties"],
  neon: ["neon", "electric", "night"],
  elegant: ["elegant", "luxury", "minimal"],
  playful: ["playful", "fun", "vibrant"],
  soft: ["soft", "pastel"],
  bright: ["vibrant", "bold", "light"],
  pale: ["pastel", "soft", "faded"],
  rich: ["rich", "luxury", "dark"],
  natural: ["nature", "organic", "green"],
  organic: ["organic", "nature", "green"],
};

const tokenise = (q: string): string[] =>
  q
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((t) => t.length > 2)
    .map((t) => (t.endsWith("s") && t.length > 3 ? t.slice(0, -1) : t));

/**
 * Rank the shelf against a description. Returns the best matches, or an
 * empty array when nothing scores — an honest miss beats a random palette
 * presented as an answer.
 */
export function searchMood(query: string, limit = 12): LibraryPalette[] {
  const tokens = tokenise(query);
  if (tokens.length === 0) return [];

  const wanted = new Map<string, number>();
  for (const token of tokens) {
    wanted.set(token, (wanted.get(token) ?? 0) + 3);
    for (const syn of SYNONYMS[token] ?? [])
      wanted.set(syn, (wanted.get(syn) ?? 0) + 2);
  }

  const scored = LIBRARY.map((palette) => {
    let score = 0;
    const name = palette.name.toLowerCase();
    for (const [word, weight] of wanted) {
      if (palette.tags.includes(word)) score += weight;
      if (name.includes(word)) score += weight * 2;
    }
    return { palette, score };
  }).filter((s) => s.score > 0);

  scored.sort((a, b) => b.score - a.score || a.palette.name.localeCompare(b.palette.name));
  return scored.slice(0, limit).map((s) => s.palette);
}

// ---------------------------------------------------------------------------
// Parsing pasted colour
// ---------------------------------------------------------------------------

/**
 * Pull every colour out of arbitrary pasted text — a CSS block, a list of
 * hexes off a screenshot caption, a coolors URL, whatever landed on the
 * clipboard. Order is preserved and duplicates are dropped.
 */
export function parseColors(text: string): Oklch[] {
  const out: Oklch[] = [];
  const seen = new Set<string>();
  const push = (color: Oklch | null) => {
    if (!color) return;
    const key = toHex(color);
    if (seen.has(key)) return;
    seen.add(key);
    out.push(color);
  };

  for (const m of text.matchAll(/#([0-9a-f]{6}|[0-9a-f]{3})\b/gi)) push(fromHex(m[0]));

  for (const m of text.matchAll(/rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})/gi))
    push(rgbToOklch({ r: +m[1] / 255, g: +m[2] / 255, b: +m[3] / 255 }));

  for (const m of text.matchAll(/oklch\(\s*([\d.]+)(%?)\s+([\d.]+)\s+([\d.]+)/gi))
    push({ l: m[2] ? +m[1] / 100 : +m[1], c: +m[3], h: +m[4] });

  if (out.length > 0) return out;

  // Bare hex with no "#" is only trusted when the whole input is bare hex.
  // English is full of six-letter words that parse as colours — "decade",
  // "facade", "efface" — so accepting them mid-prose would turn a mood
  // description into a palette of accidents.
  const tokens = text.trim().split(/[\s,;|/]+/).filter(Boolean);
  if (
    tokens.length > 0 &&
    tokens.every((t) => /^([0-9a-f]{6}|[0-9a-f]{3})$/i.test(t))
  )
    for (const t of tokens) push(fromHex(t));

  return out;
}
