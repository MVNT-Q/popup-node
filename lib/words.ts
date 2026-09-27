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

export type SphereWord = {
  text: string;
  weight: number;
  example: boolean;
};

export function sphereWords(imagines: string[]): SphereWord[] {
  const counts = new Map<string, number>();
  for (const line of imagines) {
    for (const token of tokens(line)) {
      // 구에는 영어만. 한글 토큰은 건너뛴다.
      if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(token)) continue;
      const key = token.length <= 24 ? token : token.slice(0, 24);
      const display = key.toUpperCase();
      counts.set(display, (counts.get(display) ?? 0) + 1);
    }
  }

  const real: SphereWord[] = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 64)
    .map(([text, weight]) => ({ text, weight, example: false }));

  // 실제 답이 충분해도 예시를 조금 섞어 그물 밀도를 유지
  const used = new Set(real.map((w) => w.text.toUpperCase()));
  const extras: SphereWord[] = [];
  const target = real.length >= 20 ? Math.min(72, real.length + 18) : 48;
  for (const word of EXAMPLE_WORDS) {
    if (used.has(word)) continue;
    extras.push({ text: word, weight: 1, example: true });
    if (real.length + extras.length >= target) break;
  }
  return [...real, ...extras];
}
