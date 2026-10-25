import type { Point } from "./layout";
import type { Edge } from "./constellation";

/**
 * 전시 그로브. 세 중심(Juhree, phezman, HANNAH) 배치와 고른 37줄.
 * 저장된 판단은 지우지 않는다. 화면에 깔 줄·자리·질문만 이 목록을 쓴다.
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
};

/** 이름표에 없는 사람이 생기면 빈칸. */
const SPARES: [number, number][] = [
  [94, 18],
  [94, 84],
  [4, 40],
  [94, 58],
  [50, 50],
];

/** SEEK → 상대 OFFER, OFFER → 상대 SEEK, IMAGINE → 상대 IMAGINE. */
const COUNTERPART = [1, 0, 2];

function keyName(name: string) {
  return name.trim().toLowerCase();
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

/** 카드에 쓸 질문과 상대 칸. 이름을 기준으로 찾는다. */
export function pictureReasons(
  viewerName: string,
  otherName: string,
): { questionIndex: number; theirIndex: number }[] {
  const link = findLink(keyName(viewerName), keyName(otherName));
  if (!link) return [];
  const side = sideOf(link, keyName(viewerName));
  return side.questions.map((questionIndex, index) => ({
    questionIndex,
    theirIndex: side.quotes?.[index] ?? COUNTERPART[questionIndex] ?? questionIndex,
  }));
}

export function pictureEdges(
  nodes: { id: string; name: string }[],
  _edges: Edge[],
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
