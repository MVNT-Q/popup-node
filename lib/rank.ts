import { isCrossLingual } from "./crossLang";
import { cachedVector, embedEnabled } from "./embed";
import { bandOf, blendBand, cosineVec, pickIndex, scoreText } from "./match";
import { toEnglishForMatch } from "./mymemory";
import { SLOT_TARGETS } from "./prompts";
import type { Band, NodeRecord } from "./types";

export type Hit = {
  questionIndex: number;
  theirIndex: number;
  band: Band;
  score: number;
  answer: string;
};

/**
 * 같은 언어 → 기존 theme.
 * 교차 언어 + OPENAI_API_KEY → 임베딩 코사인 (EMBED_BAND).
 * 교차 언어 + 키 없음 → 한글쪽 MyMemory→EN 후 theme (실패 시 0).
 */
export async function scorePair(
  mine: string,
  theirs: string,
): Promise<{ score: number; mode: "theme" | "embed" }> {
  const left = mine.trim();
  const right = theirs.trim();
  if (!left || !right) return { score: 0, mode: "theme" };

  if (!isCrossLingual(left, right)) {
    return { score: scoreText(left, right), mode: "theme" };
  }

  if (embedEnabled()) {
    try {
      const a = await cachedVector(left);
      const b = await cachedVector(right);
      if (a && b) return { score: cosineVec(a, b), mode: "embed" };
    } catch {
      // 임베딩 실패 시 번역 theme으로 넘긴다
    }
  }

  const enLeft = await toEnglishForMatch(left);
  const enRight = await toEnglishForMatch(right);
  if (!enLeft || !enRight) return { score: 0, mode: "theme" };
  return { score: scoreText(enLeft, enRight), mode: "theme" };
}

export async function rankAgainst(
  me: NodeRecord,
  other: NodeRecord,
  selected: number[],
): Promise<{ score: number; band: Band | null; hits: Hit[]; mode: "theme" | "embed" }> {
  const answers = [0, 1, 2].map((index) => other.slots[index]?.answer ?? "");
  const hits: Hit[] = [];
  let usedEmbed = false;

  for (const questionIndex of selected) {
    const mine = me.slots[questionIndex]?.answer ?? "";
    if (mine.trim().length < 2) continue;
    const scores: number[] = [];
    const modes: ("theme" | "embed")[] = [];
    for (const answer of answers) {
      const pair = await scorePair(mine, answer);
      scores.push(pair.score);
      modes.push(pair.mode);
    }
    const theirIndex = pickIndex(scores, SLOT_TARGETS[questionIndex] ?? []);
    if (theirIndex < 0) continue;
    const score = scores[theirIndex] ?? 0;
    const mode = modes[theirIndex] ?? "theme";
    if (mode === "embed") usedEmbed = true;
    const band = bandOf(score, mode);
    if (!band) continue;
    hits.push({
      questionIndex,
      theirIndex,
      band,
      score,
      answer: answers[theirIndex] ?? "",
    });
  }

  hits.sort((a, b) => a.questionIndex - b.questionIndex);
  const score = hits.reduce((max, hit) => Math.max(max, hit.score), 0);
  return {
    score,
    band: blendBand(
      hits.map((hit) => hit.band),
      selected.length,
    ),
    hits,
    mode: usedEmbed ? "embed" : "theme",
  };
}
