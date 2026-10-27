import type { Point } from "./layout";
import type { Edge } from "./constellation";

/**
 * 전시 그로브. 세 중심(Juhree, phezman, HANNAH) 배치와 고른 줄.
 * LINKS는 항상 그대로 그린다. 이름을 다시 맞추거나 점수로 다시 만들지 않는다.
 * LINKS에 이름이 없는 사람만, 이미 저장된 점수에서 줄을 최소 1·최대 5개 더한다.
 * qa는 a에게, qb는 b에게 이 줄이 걸리는 질문. 0 SEEK, 1 OFFER, 2 IMAGINE.
 * quoteA/quoteB는 그 질문 순서의 상대 칸. 없으면 SEEK↔OFFER, IMAGINE↔IMAGINE.
 */
export const GROVE_PICTURE = true;

type Link = {
  a: string;
  b: string;
  qa: number[];
  qb: number[];
  bright: boolean;
  quoteA?: number[];
  quoteB?: number[];
};

const LINKS: Link[] = [
  { a: "juhree", b: "qq", qa: [0], qb: [1], bright: true },
  { a: "juhree", b: "soundbeats", qa: [0], qb: [0, 1], bright: true },
  { a: "juhree", b: "doy", qa: [0], qb: [1], bright: true },
  { a: "juhree", b: "phezman", qa: [1], qb: [0], bright: true },
  { a: "juhree", b: "hannah", qa: [2], qb: [2], bright: true },
  { a: "qq", b: "hannah", qa: [1], qb: [0], bright: true },
  { a: "soundbeats", b: "hannah", qa: [0, 1], qb: [0, 1], bright: true },
  { a: "phezman", b: "soundbeats", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "doy", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "dohan", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "oberheim", qa: [0], qb: [0, 1], quoteB: [0, 0], bright: true },
  { a: "oberheim", b: "doy", qa: [0], qb: [1], bright: true },
  { a: "oberheim", b: "sh", qa: [1], qb: [0], bright: true },
  { a: "doy", b: "jayray", qa: [1], qb: [0], quoteA: [1], bright: true },
  { a: "syon", b: "leo", qa: [0], qb: [1], bright: true },
  { a: "syon", b: "mia", qa: [0], qb: [1], bright: true },
  { a: "syon", b: "dohan", qa: [0], qb: [1], bright: true },
  { a: "leo", b: "hannah", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "rayray", b: "leo", qa: [0, 1], qb: [0, 1], bright: true },
  { a: "rayray", b: "syon", qa: [1], qb: [0], bright: true },
  { a: "rayray", b: "toa", qa: [1], qb: [0], bright: true },
  { a: "rayray", b: "teson", qa: [1], qb: [0], bright: true },
  { a: "mia", b: "jayray", qa: [1], qb: [0], quoteA: [1], bright: true },
  { a: "sh", b: "jayray", qa: [0, 1], qb: [0, 1], bright: true },
  { a: "belle", b: "toa", qa: [1], qb: [0], bright: true },
  { a: "toa", b: "sh", qa: [2], qb: [2], bright: true },
  { a: "toa", b: "keen", qa: [2], qb: [1], quoteA: [1], quoteB: [2], bright: true },
  { a: "sh", b: "keen", qa: [2], qb: [1], quoteA: [1], quoteB: [2], bright: true },
  { a: "belle", b: "keen", qa: [0, 1], qb: [1], quoteA: [1, 1], bright: true },
  { a: "paul", b: "keen", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "paul", b: "hannah", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "paul", b: "joey", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "paul", b: "starr b", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "jean", b: "starr b", qa: [0], qb: [1], bright: true },
  { a: "starr b", b: "soundbeats", qa: [0], qb: [0, 1], bright: true },
  { a: "joey", b: "convengers", qa: [0], qb: [1], quoteB: [1], bright: true },
  { a: "convengers", b: "teson", qa: [1], qb: [0], bright: true },
  { a: "flowy_state", b: "hannah", qa: [2], qb: [2], bright: true },
  { a: "aaron", b: "hannah", qa: [0], qb: [1], bright: true },
  { a: "aaron", b: "paul", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "covered", b: "toa", qa: [1], qb: [0], bright: true },
];

/** 세 중심 배치. 화면 %. */
const PLACES: Record<string, [number, number]> = {
  juhree: [40, 42],
  phezman: [58, 46],
  hannah: [46, 60],
  qq: [24, 26],
  doy: [58, 24],
  soundbeats: [74, 38],
  oberheim: [74, 58],
  dohan: [26, 50],
  "starr b": [88, 46],
  jean: [88, 64],
  leo: [22, 72],
  syon: [10, 58],
  mia: [10, 76],
  rayray: [24, 88],
  paul: [62, 76],
  joey: [78, 74],
  keen: [50, 88],
  toa: [32, 86],
  sh: [78, 16],
  belle: [16, 90],
  jayray: [56, 10],
  teson: [10, 22],
  convengers: [26, 10],
  flowy_state: [34, 64],
  aaron: [66, 64],
  covered: [94, 18],
};

/** 이름표에 없는 사람이 생기면 빈칸. */
const SPARES: [number, number][] = [
  [94, 84],
  [4, 40],
  [94, 58],
  [6, 8],
  [50, 50],
];

/** SEEK → 상대 OFFER, OFFER → 상대 SEEK, IMAGINE → 상대 IMAGINE. */
const COUNTERPART = [1, 0, 2];

function keyName(name: string) {
  return name.trim().toLowerCase();
}

/** LINKS의 끝점. 여기 이름이 있으면 1–5 상한을 적용하지 않는다. */
export function curatedEndpoints(): Set<string> {
  const names = new Set<string>();
  for (const link of LINKS) {
    names.add(keyName(link.a));
    names.add(keyName(link.b));
  }
  return names;
}

export type PictureInputEdge = Edge & { auto?: boolean; score?: number; lexical?: number };

const AUTO_CAP = 5;

type AutoCand = {
  a: string;
  b: string;
  /** 저장된 판단의 가장 센 칸. */
  score: number;
  /** 저장 점수가 0일 때, 그 쌍의 글자 신호. */
  lexical: number;
  /** endpoint a 기준 질문. */
  questions: number[];
};

function pairKey(a: string, b: string) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function flipQuestions(questions: number[]) {
  return [...new Set(questions.map((question) => COUNTERPART[question] ?? question))].sort(
    (left, right) => left - right,
  );
}

function questionsForViewer(cand: AutoCand, viewerId?: string) {
  const own = [...cand.questions].sort((left, right) => left - right);
  const flipped = flipQuestions(own);
  if (viewerId === cand.a) return own;
  if (viewerId === cand.b) return flipped;
  return [...new Set([...own, ...flipped])].sort((left, right) => left - right);
}

function compareCand(left: AutoCand, right: AutoCand) {
  if (right.score !== left.score) return right.score - left.score;
  const a = pairKey(left.a, left.b);
  const b = pairKey(right.a, right.b);
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function compareFallback(left: AutoCand, right: AutoCand) {
  if (right.lexical !== left.lexical) return right.lexical - left.lexical;
  return compareCand(left, right);
}

/** 그림 밖 사람만. 점수가 있으면 강한 순으로 최대 5, 전부 0이면 그 사람당 1줄. */
function pickAuto(cands: AutoCand[], freshIds: Set<string>): AutoCand[] {
  const unique = new Map<string, AutoCand>();
  for (const cand of cands) {
    const key = pairKey(cand.a, cand.b);
    const prev = unique.get(key);
    if (!prev || cand.score > prev.score) unique.set(key, cand);
  }
  const rows = [...unique.values()];
  const touching = (id: string) => rows.filter((row) => row.a === id || row.b === id);
  const limit = new Map<string, number>();
  const degree = new Map<string, number>();
  for (const id of freshIds) {
    limit.set(id, touching(id).some((row) => row.score > 0) ? AUTO_CAP : 1);
    degree.set(id, 0);
  }
  const room = (id: string) => (degree.get(id) ?? 0) < (limit.get(id) ?? AUTO_CAP);
  const chosen: AutoCand[] = [];
  const chosenKeys = new Set<string>();
  for (const row of rows.filter((row) => row.score > 0).sort(compareCand)) {
    const ends = [row.a, row.b].filter((id) => freshIds.has(id));
    if (ends.some((id) => !room(id))) continue;
    chosen.push(row);
    chosenKeys.add(pairKey(row.a, row.b));
    for (const id of ends) degree.set(id, (degree.get(id) ?? 0) + 1);
  }
  const needy = [...freshIds].filter((id) => (degree.get(id) ?? 0) === 0).sort();
  for (const id of needy) {
    if ((degree.get(id) ?? 0) > 0) continue;
    for (const row of touching(id).sort(compareFallback)) {
      const key = pairKey(row.a, row.b);
      if (chosenKeys.has(key)) continue;
      const other = row.a === id ? row.b : row.a;
      if (freshIds.has(other) && !room(other)) continue;
      chosen.push(row);
      chosenKeys.add(key);
      for (const end of [row.a, row.b]) {
        if (freshIds.has(end)) degree.set(end, (degree.get(end) ?? 0) + 1);
      }
      break;
    }
  }
  return chosen;
}

function at(px: number, py: number): Point {
  return { x: 80 + px * 8.4, y: 90 + py * 7.6 };
}

function findLink(viewer: string, other: string) {
  return LINKS.find(
    (item) => (item.a === viewer && item.b === other) || (item.a === other && item.b === viewer),
  );
}

function sideOf(link: Link, viewer: string) {
  if (viewer === link.a) return { questions: link.qa, quotes: link.quoteA };
  if (viewer === link.b) return { questions: link.qb, quotes: link.quoteB };
  return { questions: [] as number[], quotes: undefined };
}

/** 카드에 쓸 질문과 상대 칸. 이름을 기준으로 찾는다. 그림 밖 줄은 맞은 칸을 넘긴다. */
export function pictureReasons(
  viewerName: string,
  otherName: string,
  autoQuestions?: number[],
): { questionIndex: number; theirIndex: number }[] {
  const link = findLink(keyName(viewerName), keyName(otherName));
  if (link) {
    const side = sideOf(link, keyName(viewerName));
    return side.questions.map((questionIndex, index) => ({
      questionIndex,
      theirIndex: side.quotes?.[index] ?? COUNTERPART[questionIndex] ?? questionIndex,
    }));
  }
  const questions = (autoQuestions ?? []).filter(
    (question) => question === 0 || question === 1 || question === 2,
  );
  return questions.map((questionIndex) => ({
    questionIndex,
    theirIndex: COUNTERPART[questionIndex] ?? questionIndex,
  }));
}

export function pictureEdges(
  nodes: { id: string; name: string }[],
  edges: PictureInputEdge[],
  viewerId?: string,
): (Edge & { bright: boolean })[] {
  const byName = new Map(nodes.map((node) => [keyName(node.name), node.id]));
  const viewer = keyName(nodes.find((node) => node.id === viewerId)?.name ?? "");
  const shown: (Edge & { bright: boolean })[] = [];
  for (const link of LINKS) {
    const a = byName.get(link.a);
    const b = byName.get(link.b);
    if (!a || !b || a === b) continue;
    const questions = viewer
      ? sideOf(link, viewer).questions
      : [...new Set([...link.qa, ...link.qb])].sort((left, right) => left - right);
    shown.push({ a, b, questions, bright: link.bright });
  }

  const curated = curatedEndpoints();
  const freshIds = new Set(
    nodes.filter((node) => !curated.has(keyName(node.name))).map((node) => node.id),
  );
  if (!freshIds.size) return shown;

  const known = new Set(nodes.map((node) => node.id));
  const taken = new Set(shown.map((edge) => pairKey(edge.a, edge.b)));
  const cands: AutoCand[] = [];
  for (const edge of edges) {
    if (!edge.auto) continue;
    if (!known.has(edge.a) || !known.has(edge.b) || edge.a === edge.b) continue;
    if (!freshIds.has(edge.a) && !freshIds.has(edge.b)) continue;
    if (taken.has(pairKey(edge.a, edge.b))) continue;
    const questions = [...new Set(edge.questions.filter((question) => question >= 0 && question <= 2))].sort(
      (left, right) => left - right,
    );
    const score = typeof edge.score === "number" && Number.isFinite(edge.score) ? edge.score : 0;
    const lexical = typeof edge.lexical === "number" && Number.isFinite(edge.lexical) ? edge.lexical : 0;
    cands.push({
      a: edge.a,
      b: edge.b,
      score,
      lexical,
      questions: questions.length ? questions : [0],
    });
  }
  for (const cand of pickAuto(cands, freshIds)) {
    const key = pairKey(cand.a, cand.b);
    if (taken.has(key)) continue;
    taken.add(key);
    shown.push({
      a: cand.a,
      b: cand.b,
      questions: questionsForViewer(cand, viewerId),
      bright: true,
    });
  }
  return shown;
}

export function layoutGrovePicture(nodes: { id: string; name: string }[]): Map<string, Point> {
  const points = new Map<string, Point>();
  const extras: { id: string }[] = [];
  for (const node of nodes) {
    const place = PLACES[keyName(node.name)];
    if (!place) {
      extras.push(node);
      continue;
    }
    points.set(node.id, at(place[0], place[1]));
  }
  extras.forEach((node, index) => {
    const spare = SPARES[index];
    const point = spare
      ? at(spare[0], spare[1])
      : at(8 + (index % 5) * 18, 48 + Math.floor(index / 5) * 16);
    points.set(node.id, point);
  });
  return points;
}
