import { SLOT_TARGETS } from "./prompts";
import type { Band } from "./types";

// 같은 언어·교차언어(번역 후) theme 막대.
// 강: 질문의 주제를 답이 다 덮음. 중: 절반. 약: '사람' 같은 얇은 겹침만.
// 교차 언어는 rank.scorePair: 키 있으면 임베딩, 없으면 MyMemory→EN 후 이 점수.
export const THEME_BAND = { strong: 0.72, mid: 0.42, weak: 0.22 };

// text-embedding-3-small. 교차 언어 쌍에만 쓴다 (같은 언어는 theme 유지).
export const EMBED_BAND = { strong: 0.58, mid: 0.47, weak: 0.38 };

const THEMES: Record<string, string[]> = {
  cloth: ["텍스타일", "원단", "옷의 결", "옷"],
  body: ["안무", "디렉션", "장면", "몸을"],
  night: ["밤 공연", "밤"],
  bind: ["같은 결", "묶이"],
  space: ["조명", "설치", "사운드", "전시"],
  future: ["미래", "도시"],
  // IMAGINE 영어. bioluminescent는 구체적. world 한 글자는 아래 불용어로 버린다.
  glow: ["bioluminescent"],
};

const SOFT = ["아티스트"];

// SEEK/OFFER/IMAGINE에 자주 붙지만 연결 근거가 안 되는 말.
// world 하나, 세상/사람만 겹친다고 mid 선을 그리지 않는다.
const STOP = new Set([
  "a",
  "an",
  "the",
  "of",
  "to",
  "in",
  "on",
  "and",
  "or",
  "with",
  "for",
  "that",
  "this",
  "these",
  "those",
  "it",
  "its",
  "is",
  "are",
  "be",
  "am",
  "was",
  "were",
  "been",
  "being",
  "as",
  "at",
  "by",
  "from",
  "into",
  "over",
  "under",
  "about",
  "across",
  "through",
  "within",
  "without",
  "up",
  "down",
  "out",
  "off",
  "than",
  "then",
  "too",
  "very",
  "just",
  "also",
  "only",
  "more",
  "most",
  "some",
  "any",
  "all",
  "each",
  "other",
  "own",
  "such",
  "can",
  "could",
  "would",
  "should",
  "will",
  "may",
  "might",
  "have",
  "has",
  "had",
  "do",
  "does",
  "did",
  "i",
  "my",
  "me",
  "we",
  "our",
  "you",
  "your",
  "they",
  "them",
  "their",
  "who",
  "what",
  "where",
  "when",
  "how",
  "which",
  "there",
  "here",
  "so",
  "if",
  "not",
  "no",
  "nor",
  "but",
  "because",
  "while",
  "after",
  "before",
  "between",
  "among",
  "around",
  "like",
  "feels",
  "feel",
  "feeling",
  "world",
  "worlds",
  "people",
  "person",
  "persons",
  "someone",
  "something",
  "somewhere",
  "every",
  "everyone",
  "everything",
  "want",
  "wants",
  "wanted",
  "live",
  "lives",
  "living",
  "life",
  "way",
  "ways",
  "place",
  "places",
  "kind",
  "kinds",
  "make",
  "makes",
  "made",
  "making",
  "get",
  "gets",
  "help",
  "helps",
  "use",
  "uses",
  "using",
  "used",
  "one",
  "two",
  "many",
  "much",
  "few",
  "new",
  "old",
  "good",
  "great",
  "small",
  "big",
  "large",
  "quiet",
  "soft",
  "warm",
  "cold",
  "daily",
  "day",
  "days",
  "night",
  "nights",
  "time",
  "times",
  "future",
  "past",
  "together",
  "same",
  "different",
  "imagine",
  "offer",
  "seek",
  "세상",
  "사람",
  "사람들",
  "모든",
  "있는",
  "되는",
  "하는",
  "된",
  "한",
  "수",
  "것",
  "거",
  "더",
  "그",
  "이",
  "저",
  "및",
  "또",
  "또는",
  "그리고",
  "같이",
  "같은",
  "싶음",
  "싶은",
]);

function themesOf(text: string): Set<string> {
  const t = text.toLowerCase();
  const set = new Set<string>();
  for (const [name, words] of Object.entries(THEMES)) {
    if (words.some((word) => t.includes(word.toLowerCase()))) set.add(name);
  }
  return set;
}

function themeScore(question: string, answer: string): number {
  const left = themesOf(question);
  const right = themesOf(answer);
  if (!left.size || !right.size) return 0;
  let inter = 0;
  for (const name of left) if (right.has(name)) inter += 1;
  if (!inter) return 0;
  const coverage = inter / left.size;
  const union = left.size + right.size - inter;
  const jaccard = inter / union;
  return 0.75 * coverage + 0.25 * jaccard;
}

function softScore(question: string, answer: string): number {
  const hit = SOFT.some((word) => question.includes(word) && answer.includes(word));
  return hit ? 0.3 : 0;
}

/** 영어 단어·한글 덩어리. 불용어·한 글자 토큰은 버린다. */
export function contentTokens(text: string): string[] {
  const raw = text.toLowerCase().match(/[a-z0-9]+|[가-힣]+/g) ?? [];
  return raw.filter((token) => token.length >= 2 && !STOP.has(token));
}

function sharedContent(question: string, answer: string): string[] {
  const right = new Set(contentTokens(answer));
  const seen = new Set<string>();
  const shared: string[] = [];
  for (const token of contentTokens(question)) {
    if (!right.has(token) || seen.has(token)) continue;
    seen.add(token);
    shared.push(token);
  }
  return shared;
}

/** 내용 토큰이 두 개 이상 이어진 구가 양쪽에 같으면 true. */
function sharedPhrase(question: string, answer: string): boolean {
  const left = contentTokens(question);
  const right = contentTokens(answer);
  if (left.length < 2 || right.length < 2) return false;
  const grams = new Set<string>();
  for (let i = 0; i < right.length - 1; i += 1) {
    grams.add(`${right[i]}\0${right[i + 1]}`);
  }
  for (let i = 0; i < left.length - 1; i += 1) {
    if (grams.has(`${left[i]}\0${left[i + 1]}`)) return true;
  }
  return false;
}

/** mid 선을 그릴 만큼 내용이 겹쳤는지. 불용어 하나·분위기 단어 하나로는 안 된다. */
function substantiveOverlap(question: string, answer: string): boolean {
  if (sharedPhrase(question, answer)) return true;
  return sharedContent(question, answer).length >= 2;
}

function bag(text: string): Map<string, number> {
  const compact = text.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");
  const counts = new Map<string, number>();
  for (let i = 0; i < compact.length - 1; i += 1) {
    const key = compact.slice(i, i + 2);
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return counts;
}

function lexical(question: string, answer: string): number {
  const a = bag(question);
  const b = bag(answer);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (const value of a.values()) na += value * value;
  for (const value of b.values()) nb += value * value;
  const [small, large] = a.size < b.size ? [a, b] : [b, a];
  for (const [key, value] of small) {
    const other = large.get(key);
    if (other) dot += value * other;
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function scoreText(question: string, answer: string): number {
  if (!question.trim() || !answer.trim()) return 0;
  const theme = themeScore(question, answer);
  const soft = softScore(question, answer);
  const solid = substantiveOverlap(question, answer);
  const lex = lexical(question, answer);

  // 문자 bigram만 높고 내용 토큰이 비면 mid로 올리지 않는다 (world·poetry 오탐).
  let lexBoost = 0;
  if (solid) {
    lexBoost =
      lex >= THEME_BAND.mid ? lex : lex >= 0.28 ? Math.min(lex, THEME_BAND.mid - 0.01) : 0;
  } else if (sharedContent(question, answer).length === 1 || soft > 0) {
    // 내용 토큰 하나·소프트만이면 약(별)까지만.
    lexBoost = Math.min(Math.max(lex, soft), THEME_BAND.mid - 0.01);
  }

  return Math.min(1, Math.max(theme, soft, lexBoost));
}

// SLOT_TARGETS(짝 칸)만 본다. SEEK/OFFER가 IMAGINE 문장을 가져가지 않게.
// preferred가 비면 전체에서 최고점. 동점이면 목록 앞 칸.
export function pickIndex(scores: number[], preferred: readonly number[], _bias = 0.02): number {
  const pool = preferred.length ? [...preferred] : scores.map((_, index) => index);
  let best = -1;
  let top = -Infinity;
  for (const index of pool) {
    const score = scores[index] ?? 0;
    if (score > top) {
      top = score;
      best = index;
    }
  }
  return best;
}

// 질문을 하나만 보면 그 칸의 밝기 그대로.
// 여러 질문을 보면, 강은 두 곳 이상이 겹칠 때. 한 곳만 강하면 중으로 내린다.
// 약한 겹침이 두 개여도 중으로 올리지 않는다.
export function blendBand(bands: Band[], selectedCount: number): Band | null {
  if (!bands.length) return null;
  if (selectedCount <= 1) return bands[0];
  const strong = bands.filter((band) => band === "strong").length;
  const solid = bands.filter((band) => band === "strong" || band === "mid").length;
  if (bands.length >= 2 && strong >= 1) return "strong";
  if (bands.length >= 3 && solid >= 2) return "strong";
  if (solid >= 1 && bands.length >= 2) return "mid";
  if (bands.length === 1 && bands[0] === "strong") return "mid";
  if (bands.length === 1) return bands[0];
  return "weak";
}

export function themeHits(mine: string[], theirs: string[], selected: number[]) {
  const hits: { questionIndex: number; theirIndex: number; band: Band; score: number }[] = [];
  for (const questionIndex of selected) {
    const text = mine[questionIndex] ?? "";
    if (text.trim().length < 2) continue;
    const scores = theirs.map((answer) => scoreText(text, answer ?? ""));
    const theirIndex = pickIndex(scores, SLOT_TARGETS[questionIndex] ?? []);
    if (theirIndex < 0) continue;
    const score = scores[theirIndex] ?? 0;
    const band = bandOf(score, "theme");
    if (!band) continue;
    hits.push({ questionIndex, theirIndex, band, score });
  }
  return {
    hits,
    score: hits.reduce((max, hit) => Math.max(max, hit.score), 0),
    band: blendBand(
      hits.map((hit) => hit.band),
      selected.length,
    ),
  };
}

export function bestTarget(mine: string, answers: string[], targets: readonly number[]) {
  let score = 0;
  let index = -1;
  for (const target of targets) {
    const next = scoreText(mine, answers[target] ?? "");
    if (next > score) {
      score = next;
      index = target;
    }
  }
  return { score, index };
}

export function cosineVec(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  if (!na || !nb) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

export function bandOf(score: number, mode: "theme" | "embed"): Band | null {
  const table = mode === "embed" ? EMBED_BAND : THEME_BAND;
  if (score >= table.strong) return "strong";
  if (score >= table.mid) return "mid";
  if (score >= table.weak) return "weak";
  return null;
}

export function bestAnswer(
  question: string,
  answers: string[],
  mode: "theme" | "embed",
  vectors?: { question: number[] | null; answers: (number[] | null)[] },
): { score: number; index: number } {
  let score = 0;
  let index = -1;
  answers.forEach((answer, i) => {
    if (!answer.trim()) return;
    let next = 0;
    if (mode === "embed" && vectors?.question && vectors.answers[i]) {
      next = cosineVec(vectors.question, vectors.answers[i] as number[]);
    } else if (mode === "theme") {
      next = scoreText(question, answer);
    }
    if (next > score) {
      score = next;
      index = i;
    }
  });
  return { score, index };
}
