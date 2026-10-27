import { curatedEndpoints } from "./grovePicture";
import { judgedScores, lexicalPairScores, type JudgeScores } from "./judge";
import type { NodeRecord } from "./types";

export type NewcomerEdge = {
  a: string;
  b: string;
  /** endpoint a 기준. 0 SEEK, 1 OFFER, 2 IMAGINE. */
  questions: number[];
  /** 저장된 판단. 글자 신호는 여기 넣지 않는다. */
  score: number;
  /** 저장 점수가 0일 때만 읽은 글자 신호. */
  lexical: number;
  auto: true;
};

function strength(scores: JudgeScores) {
  return Math.max(scores.seek, scores.offer, scores.imagine);
}

/** 저장된 점수가 있으면 그 칸만. 전부 0일 때만 이 쌍의 글자 신호를 읽는다. */
function readPair(a: NodeRecord, b: NodeRecord) {
  const judged = judgedScores(a.id, b.id);
  const storedScores = judged ?? { seek: 0, offer: 0, imagine: 0 };
  const stored = strength(storedScores);
  if (stored > 0) return { scores: storedScores, stored, lexical: 0 };
  const lexicalScores = lexicalPairScores(a, b);
  return { scores: lexicalScores, stored: 0, lexical: strength(lexicalScores) };
}

function slotsOf(scores: JudgeScores) {
  const slots: number[] = [];
  if (scores.seek > 0) slots.push(0);
  if (scores.offer > 0) slots.push(1);
  if (scores.imagine > 0) slots.push(2);
  if (slots.length) return slots;
  const ranked = [scores.seek, scores.offer, scores.imagine];
  let best = 0;
  for (let index = 1; index < ranked.length; index += 1) {
    if (ranked[index] > ranked[best]) best = index;
  }
  return [best];
}

/**
 * 전시 그림에 아직 없는 사람이 들어간 쌍만.
 * 이미 저장한 점수를 읽고, 없을 때만 그 쌍의 글자 신호를 본다. 모델은 부르지 않는다.
 */
export function newcomerCandidates(nodes: NodeRecord[]): NewcomerEdge[] {
  const curated = curatedEndpoints();
  const fresh = nodes.filter((node) => !curated.has(node.name.trim().toLowerCase()));
  if (!fresh.length || nodes.length < 2) return [];
  const seen = new Set<string>();
  const out: NewcomerEdge[] = [];
  for (const node of fresh) {
    for (const other of nodes) {
      if (other.id === node.id) continue;
      const key = node.id < other.id ? `${node.id}\0${other.id}` : `${other.id}\0${node.id}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const read = readPair(node, other);
      out.push({
        a: node.id,
        b: other.id,
        questions: slotsOf(read.scores),
        score: read.stored,
        lexical: read.lexical,
        auto: true,
      });
    }
  }
  return out;
}
