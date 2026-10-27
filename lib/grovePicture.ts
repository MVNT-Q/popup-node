import type { Point } from "./layout";
import type { Edge } from "./constellation";

/**
 * 전시 그로브. 선명한 줄은 적합도가 높은 연결, 흐린 줄은 근거가 약한 가능성이다.
 * 이 26명의 그림은 고정이다. 선명한 줄은 한 노드당 5개 이하, 흐린 줄은 그 위에 얹어 5개 이하.
 * 그림에 없는 새 사람은 arrivalMatch가 같은 기준으로 잇는다. 그 선명한 줄은 5명을 넘을 수 있다.
 * 예전 판단 점수는 이 그림에 더하지 않는다.
 * #26 covered는 세 칸 모두 근거가 없어 줄이 없다.
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
  { a: "juhree", b: "doy", qa: [0, 2], qb: [1, 2], bright: true },
  { a: "juhree", b: "phezman", qa: [0, 2], qb: [0], bright: true },
  { a: "juhree", b: "soundbeats", qa: [0, 2], qb: [1], bright: true },
  { a: "juhree", b: "hannah", qa: [2], qb: [2], bright: true },
  { a: "juhree", b: "flowy_state", qa: [0, 2], qb: [0, 1, 2], bright: true },
  { a: "qq", b: "oberheim", qa: [1], qb: [0], bright: true },
  { a: "rayray", b: "leo", qa: [1], qb: [0], bright: true },
  { a: "leo", b: "syon", qa: [1], qb: [0], bright: true },
  { a: "leo", b: "mia", qa: [1], qb: [0], bright: true },
  { a: "syon", b: "mia", qa: [0, 1], qb: [0, 1], bright: true },
  { a: "syon", b: "dohan", qa: [0], qb: [1], bright: true },
  { a: "syon", b: "convengers", qa: [2], qb: [2], bright: true },
  { a: "phezman", b: "soundbeats", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "doy", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "dohan", qa: [0], qb: [1], bright: true },
  { a: "phezman", b: "flowy_state", qa: [0], qb: [0], quoteA: [0], quoteB: [0], bright: true },
  { a: "belle", b: "toa", qa: [1, 2], qb: [0, 2], bright: true },
  { a: "belle", b: "sh", qa: [2], qb: [2], bright: true },
  { a: "belle", b: "mia", qa: [2], qb: [2], bright: true },
  { a: "sh", b: "toa", qa: [2], qb: [2], bright: true },
  { a: "sh", b: "keen", qa: [2], qb: [1], quoteB: [1], bright: true },
  { a: "jean", b: "starr b", qa: [0], qb: [1], bright: true },
  { a: "oberheim", b: "toa", qa: [2], qb: [2], bright: true },
  { a: "oberheim", b: "aaron", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "convengers", b: "teson", qa: [1], qb: [0], bright: true },
  { a: "convengers", b: "soundbeats", qa: [0], qb: [1], bright: true },
  { a: "convengers", b: "keen", qa: [0, 2], qb: [0, 2], quoteA: [0, 2], quoteB: [0, 2], bright: true },
  { a: "doy", b: "hannah", qa: [2], qb: [2], bright: true },
  { a: "paul", b: "joey", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "paul", b: "flowy_state", qa: [1], qb: [0], bright: true },
  { a: "paul", b: "aaron", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: true },
  { a: "hannah", b: "soundbeats", qa: [0], qb: [1], bright: true },
  { a: "hannah", b: "aaron", qa: [1], qb: [0], bright: true },
  { a: "hannah", b: "flowy_state", qa: [1, 2], qb: [0, 2], bright: true },
  { a: "soundbeats", b: "flowy_state", qa: [1], qb: [0], bright: true },
  { a: "juhree", b: "qq", qa: [0], qb: [1], bright: false },
  { a: "juhree", b: "teson", qa: [1], qb: [0], bright: false },
  { a: "juhree", b: "starr b", qa: [1], qb: [0], bright: false },
  { a: "qq", b: "hannah", qa: [1], qb: [0], bright: false },
  { a: "qq", b: "convengers", qa: [1], qb: [0], bright: false },
  { a: "qq", b: "soundbeats", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: false },
  { a: "rayray", b: "syon", qa: [1], qb: [0], bright: false },
  { a: "rayray", b: "toa", qa: [1], qb: [0], bright: false },
  { a: "rayray", b: "teson", qa: [1], qb: [0], bright: false },
  { a: "leo", b: "hannah", qa: [0], qb: [1], quoteA: [1], bright: false },
  { a: "leo", b: "jean", qa: [2], qb: [2], bright: false },
  { a: "syon", b: "doy", qa: [0], qb: [1], bright: false },
  { a: "dohan", b: "sh", qa: [1], qb: [0], bright: false },
  { a: "dohan", b: "mia", qa: [1], qb: [0], bright: false },
  { a: "starr b", b: "mia", qa: [1], qb: [0], bright: false },
  { a: "joey", b: "soundbeats", qa: [1], qb: [0], bright: false },
  { a: "joey", b: "mia", qa: [2], qb: [2], bright: false },
  { a: "phezman", b: "oberheim", qa: [0], qb: [1], bright: false },
  { a: "phezman", b: "teson", qa: [0], qb: [0], quoteA: [0], quoteB: [0], bright: false },
  { a: "belle", b: "convengers", qa: [1], qb: [0], bright: false },
  { a: "belle", b: "keen", qa: [2], qb: [1], quoteB: [1], bright: false },
  { a: "belle", b: "aaron", qa: [1], qb: [0], bright: false },
  { a: "sh", b: "jayray", qa: [0], qb: [1], bright: false },
  { a: "sh", b: "soundbeats", qa: [0], qb: [1], bright: false },
  { a: "doy", b: "jayray", qa: [1], qb: [1], quoteA: [1], quoteB: [1], bright: false },
  { a: "doy", b: "flowy_state", qa: [0], qb: [0], quoteA: [0], quoteB: [0], bright: false },
  { a: "teson", b: "soundbeats", qa: [0], qb: [1], bright: false },
  { a: "jayray", b: "aaron", qa: [2], qb: [2], bright: false },
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

/** 이미 판단이 끝난 26명. 이 이름끼리의 줄은 LINKS만 그린다. */
export function settledGroveNames(): Set<string> {
  return new Set(Object.keys(PLACES));
}

/** LINKS에 이미 있는 흐린 줄 수. 새 흐린 줄은 이 수와 합쳐 5를 넘기지 않는다. */
export function picturedDimByName(): Map<string, number> {
  const dim = new Map<string, number>();
  for (const link of LINKS) {
    if (link.bright) continue;
    dim.set(link.a, (dim.get(link.a) ?? 0) + 1);
    dim.set(link.b, (dim.get(link.b) ?? 0) + 1);
  }
  return dim;
}

export type PictureInputEdge = Edge & {
  auto?: boolean;
  arrival?: boolean;
  bright?: boolean;
  score?: number;
  lexical?: number;
};
export type PictureShownEdge = Edge & { bright: boolean; auto?: boolean };

function pairKey(a: string, b: string) {
  return a < b ? `${a}\0${b}` : `${b}\0${a}`;
}

function flipQuestions(questions: number[]) {
  return [...new Set(questions.map((question) => COUNTERPART[question] ?? question))].sort(
    (left, right) => left - right,
  );
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
): PictureShownEdge[] {
  const byName = new Map(nodes.map((node) => [keyName(node.name), node.id]));
  const viewer = keyName(nodes.find((node) => node.id === viewerId)?.name ?? "");
  const shown: PictureShownEdge[] = [];
  for (const link of LINKS) {
    const a = byName.get(link.a);
    const b = byName.get(link.b);
    if (!a || !b || a === b) continue;
    const questions = viewer
      ? sideOf(link, viewer).questions
      : [...new Set([...link.qa, ...link.qb])].sort((left, right) => left - right);
    shown.push({ a, b, questions, bright: link.bright });
  }
  const settled = settledGroveNames();
  const taken = new Set(shown.map((edge) => pairKey(edge.a, edge.b)));
  const nameOf = new Map(nodes.map((node) => [node.id, keyName(node.name)]));
  for (const edge of edges) {
    if (!edge.arrival) continue;
    if (!nameOf.has(edge.a) || !nameOf.has(edge.b) || edge.a === edge.b) continue;
    const leftName = nameOf.get(edge.a) ?? "";
    const rightName = nameOf.get(edge.b) ?? "";
    if (settled.has(leftName) && settled.has(rightName)) continue;
    const key = pairKey(edge.a, edge.b);
    if (taken.has(key)) continue;
    const own = [...new Set(edge.questions.filter((question) => question >= 0 && question <= 2))].sort(
      (left, right) => left - right,
    );
    const flipped = flipQuestions(own);
    const questions = !viewerId
      ? [...new Set([...own, ...flipped])].sort((left, right) => left - right)
      : viewerId === edge.a
        ? own
        : viewerId === edge.b
          ? flipped
          : [...new Set([...own, ...flipped])].sort((left, right) => left - right);
    if (!questions.length) continue;
    taken.add(key);
    shown.push({
      a: edge.a,
      b: edge.b,
      questions,
      bright: edge.bright !== false,
      auto: true,
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
