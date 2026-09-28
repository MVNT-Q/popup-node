import { hasHangul, isCrossLingual } from "./crossLang";
import { bandOf, blendBand, pickIndex, scoreText } from "./match";
import { SLOT_TARGETS } from "./prompts";
import type { Band } from "./types";

const cache = new Map<string, string | null>();

/** 브라우저: /api/translate로 한글→영어. 실패·그대로 한글이면 null. */
async function toEnglish(text: string): Promise<string | null> {
  const raw = text.trim().slice(0, 400);
  if (!raw) return null;
  if (!hasHangul(raw)) return raw;
  const hit = cache.get(raw);
  if (hit !== undefined) return hit;
  try {
    const response = await fetch(
      `/api/translate?q=${encodeURIComponent(raw)}&to=en`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      cache.set(raw, null);
      return null;
    }
    const data = (await response.json()) as { text?: string };
    const out = (data.text ?? "").trim();
    if (!out || hasHangul(out)) {
      cache.set(raw, null);
      return null;
    }
    cache.set(raw, out);
    return out;
  } catch {
    cache.set(raw, null);
    return null;
  }
}

/** 서버 scorePair와 같은 규칙 (임베딩 키는 브라우저에서 안 씀 → 번역 theme). */
export async function scorePairBrowser(mine: string, theirs: string): Promise<number> {
  const left = mine.trim();
  const right = theirs.trim();
  if (!left || !right) return 0;
  if (!isCrossLingual(left, right)) return scoreText(left, right);
  const enLeft = await toEnglish(left);
  const enRight = await toEnglish(right);
  if (!enLeft || !enRight) return 0;
  return scoreText(enLeft, enRight);
}

export async function themeHitsBrowser(
  mine: string[],
  theirs: string[],
  selected: number[],
): Promise<{
  hits: { questionIndex: number; theirIndex: number; band: Band; score: number }[];
  score: number;
  band: Band | null;
}> {
  const hits: { questionIndex: number; theirIndex: number; band: Band; score: number }[] = [];
  for (const questionIndex of selected) {
    const text = mine[questionIndex] ?? "";
    if (text.trim().length < 2) continue;
    const scores: number[] = [];
    for (const answer of theirs) {
      scores.push(await scorePairBrowser(text, answer ?? ""));
    }
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
