// 컬렉티브 구에 쓸 단어. 답이 적을 때 예시만 옅게 깐다. POC_8 영어.

export const EXAMPLE_WORDS = [
  "NATURE",
  "AUTONOMY",
  "COEXISTENCE",
  "QUIET TECHNOLOGY",
  "FLOATING CITY",
  "CARE",
  "RITUAL",
  "FOREST",
  "CRAFT",
  "SHARED MEALS",
  "SLOW LIFE",
  "COMMONS",
  "PRIVACY",
  "OPEN TECHNOLOGY",
  "SHARED SPACES",
  "FLUID IDENTITY",
  "LOCAL MAKING",
  "SELF-SOVEREIGNTY",
  "MUTUAL AID",
  "BIOLUMINESCENCE",
  "DIGITAL COMMONS",
  "PEER NETWORKS",
  "HEALING",
  "ECOLOGY",
  "STORYTELLING",
  "ANONYMITY",
  "WORKSHOPS",
  "FRIENDSHIP",
  "DREAMING",
  "MOONLIGHT",
  "GARDENS",
  "KINSHIP",
  "SOFT POWER",
  "NODE TRUST",
  "NIGHT WALKS",
  "SEED BANKS",
  "OPEN TOOLS",
  "CIRCLES",
  "REST",
  "WATER",
  "SOIL",
  "LISTEN",
  "GIFT",
  "THRESHOLDS",
  "SHELTER",
  "PLAY",
  "MEMORY",
  "TIDE",
  "HORIZON",
  "WILDNESS",
  "SYMBIOSIS",
  "SOFT INFRA",
  "LIVING ARCHIVE",
  "EDGE LIFE",
  "NIGHT MARKET",
  "ROOT SYSTEMS",
  "TEMPLE AIR",
  "SLOW SIGNAL",
  "FIELD NOTES",
  "PORTAL",
  "DEW",
  "MOSS",
  "EMBER",
  "DRIFT",
  "WEAVE",
  "BLOOM",
  "ECHO",
  "PULSE",
  "HAVEN",
  "CANOPY",
  "RIVERBED",
  "STARPATH",
  "HANDMADE",
  "TOGETHER",
] as const;

const STOP = new Set(
  [
    "a",
    "an",
    "the",
    "and",
    "or",
    "of",
    "to",
    "in",
    "on",
    "for",
    "with",
    "by",
    "from",
    "as",
    "at",
    "is",
    "are",
    "be",
    "this",
    "that",
    "it",
    "i",
    "my",
    "we",
    "our",
    "you",
    "your",
    "their",
    "where",
    "what",
    "how",
    "who",
    "which",
    "when",
    "like",
    "something",
    "people",
    "world",
    "future",
    "want",
    "live",
    "can",
    "will",
    "그",
    "이",
    "저",
    "것",
    "수",
    "있는",
    "없는",
    "하는",
    "된",
    "될",
    "같은",
    "위한",
    "통해",
    "보다",
    "싶다",
    "미래",
    "세계",
    "사람들",
  ].map((w) => w.toLowerCase()),
);

function tokens(text: string): string[] {
  return text
    .split(/[^\p{L}\p{N}]+/u)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !STOP.has(part.toLowerCase()));
}

/** IMAGINE 문장에서 영어 짧은 구절을 뽑아 구를 채운다. */
function phrases(text: string): string[] {
  if (!/[A-Za-z]{3,}/.test(text)) return [];
  // 구 안 긴 문장 조각은 틱커처럼 보이므로 짧은 2~3어절만
  const chunks = text.match(/[A-Za-z][A-Za-z0-9\s,'-]{5,28}/g) || [];
  const out: string[] = [];
  for (const raw of chunks) {
    const cleaned = raw.replace(/\s+/g, " ").trim();
    if (cleaned.length < 6 || cleaned.length > 22) continue;
    if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(cleaned)) continue;
    const words = cleaned.split(/\s+/).filter((w) => !STOP.has(w.toLowerCase()));
    if (words.length < 2 || words.length > 3) continue;
    const display = words.join(" ").toUpperCase().slice(0, 20);
    if (display.length >= 6) out.push(display);
  }
  return out;
}

export type SphereWord = {
  text: string;
  weight: number;
  example: boolean;
};

/** 실답·예시를 번갈아 끼워 위 반구에만 밝은 글자가 몰리지 않게. */
function interleave(real: SphereWord[], extras: SphereWord[]): SphereWord[] {
  const out: SphereWord[] = [];
  const a = [...real];
  const b = [...extras];
  while (a.length || b.length) {
    if (a.length) out.push(a.shift()!);
    if (b.length) out.push(b.shift()!);
    // 예시가 더 많으면 한 칸에 두 개까지 넣어 밀도 맞춤
    if (b.length > a.length && b.length) out.push(b.shift()!);
  }
  return out;
}

export function sphereWords(imagines: string[]): SphereWord[] {
  const counts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();

  for (const line of imagines) {
    for (const token of tokens(line)) {
      // 구에는 영어만. 한글 토큰은 건너뛴다.
      if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(token)) continue;
      const key = token.length <= 24 ? token : token.slice(0, 24);
      const display = key.toUpperCase();
      counts.set(display, (counts.get(display) ?? 0) + 1);
    }
    for (const phrase of phrases(line)) {
      phraseCounts.set(phrase, (phraseCounts.get(phrase) ?? 0) + 1);
    }
  }

  const realTokens: SphereWord[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 48)
    .map(([text, weight]) => ({ text, weight, example: false }));

  const used = new Set(realTokens.map((w) => w.text.toUpperCase()));
  const realPhrases: SphereWord[] = [...phraseCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .filter(([text]) => !used.has(text))
    .slice(0, 8)
    .map(([text, weight]) => {
      used.add(text);
      return { text, weight: weight + 1, example: false };
    });

  const real = [...realTokens, ...realPhrases];

  // 키워드만 채움(원문 문장 조각 아님). 밀도는 숨 쉬게 낮춤
  const extras: SphereWord[] = [];
  const target = Math.max(56, Math.min(72, real.length + 28));
  for (const word of EXAMPLE_WORDS) {
    if (used.has(word)) continue;
    extras.push({ text: word, weight: 1, example: true });
    used.add(word);
    if (real.length + extras.length >= target) break;
  }
  return interleave(real, extras);
}
