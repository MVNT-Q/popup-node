import type { Point } from "./layout";
import type { Edge } from "./constellation";

/**
 * 전시 그로브에 그리는 26줄. false면 예전 방사 배치·저장된 줄 전부.
 * 저장된 판단은 지우지 않고, 화면에 깔 줄과 자리만 고른다.
 */
export const GROVE_PICTURE = true;

type Link = {
  a: string;
  b: string;
  bright: boolean;
  /** 저장된 맞음에 질문이 없을 때만. 그 사람 기준 0 SEEK, 1 OFFER, 2 IMAGINE. */
  as?: Partial<Record<string, number[]>>;
  /**
   * 카드에 보여줄 상대 칸. 질문 순서와 같다.
   * 없으면 SEEK는 상대 OFFER, OFFER는 상대 SEEK, IMAGINE은 상대 IMAGINE.
   */
  quote?: Partial<Record<string, number[]>>;
};

/** 이름이 맞는 줄. 밝은 줄 17, 흐린 줄 9. */
const LINKS: Link[] = [
  { a: "juhree", b: "syon", bright: true },
  { a: "juhree", b: "mia", bright: true },
  { a: "syon", b: "mia", bright: true },
  { a: "leo", b: "syon", bright: true },
  { a: "syon", b: "dohan", bright: true },
  { a: "juhree", b: "hannah", bright: true, as: { juhree: [2], hannah: [2] } },
  { a: "teson", b: "soundbeats", bright: true },
  { a: "phezman", b: "soundbeats", bright: true },
  { a: "qq", b: "doy", bright: true },
  { a: "juhree", b: "toa", bright: true, as: { juhree: [2], toa: [2] } },
  { a: "hannah", b: "toa", bright: true, as: { hannah: [2], toa: [2] } },
  { a: "sh", b: "toa", bright: true, as: { sh: [2], toa: [2] } },
  {
    a: "doy",
    b: "toa",
    bright: true,
    as: { doy: [0], toa: [2] },
    quote: { doy: [2], toa: [0] },
  },
  { a: "syon", b: "convengers", bright: true, as: { syon: [2], convengers: [2] } },
  { a: "convengers", b: "keen", bright: true },
  { a: "phezman", b: "toa", bright: true },
  { a: "mia", b: "belle", bright: true, as: { mia: [0], belle: [1] } },
  { a: "dohan", b: "sh", bright: false },
  {
    a: "mia",
    b: "dohan",
    bright: false,
    as: { mia: [1], dohan: [1] },
    quote: { mia: [1], dohan: [1] },
  },
  { a: "jean", b: "starr b", bright: false, as: { jean: [0], "starr b": [1] } },
  { a: "convengers", b: "soundbeats", bright: false },
  { a: "qq", b: "soundbeats", bright: false, as: { qq: [1], soundbeats: [0] } },
  { a: "juhree", b: "doy", bright: false },
  { a: "hannah", b: "doy", bright: false },
  { a: "juhree", b: "teson", bright: false },
  { a: "juhree", b: "qq", bright: false, as: { juhree: [0], qq: [1] } },
];

/** 화면 % . 제목 띠(위쪽 가운데)에는 두지 않는다. */
const PLACES: Record<string, [number, number]> = {
  leo: [11, 14],
  syon: [24, 19],
  convengers: [37, 19],
  keen: [59, 17],
  belle: [28, 30],
  mia: [22, 42],
  dohan: [10, 49],
  sh: [17, 64],
  juhree: [52, 40],
  hannah: [54, 68],
  toa: [42, 82],
  teson: [66, 35],
  qq: [68, 49],
  doy: [69, 65],
  soundbeats: [86, 36],
  phezman: [79, 76],
  joey: [8, 32],
  "starr b": [8, 74],
  jean: [22, 88],
  oberheim: [8, 90],
  paul: [56, 92],
  jayray: [74, 92],
  rayray: [94, 56],
};

/** 이름표에 없는 사람이 생기면 줄 사이 빈칸. 위쪽 가운데(제목)는 비움. */
const SPARES: [number, number][] = [
  [94, 18],
  [94, 84],
  [40, 52],
  [84, 58],
  [4, 58],
];

function keyName(name: string) {
  return name.trim().toLowerCase();
}

function at(px: number, py: number): Point {
  return { x: 80 + px * 8.4, y: 90 + py * 7.6 };
}

function pairKey(a: string, b: string) {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

/** SEEK → 상대 OFFER, OFFER → 상대 SEEK, IMAGINE → 상대 IMAGINE. */
const COUNTERPART = [1, 0, 2];

/**
 * 저장된 맞음이 없는 전시 줄의 카드 칸.
 * 이름을 기준으로 찾으므로, 나중에 줄을 추가해도 질문만 적으면 누구 노드에서나 같다.
 */
export function pictureReasons(
  viewerName: string,
  otherName: string,
): { questionIndex: number; theirIndex: number }[] {
  const viewer = keyName(viewerName);
  const other = keyName(otherName);
  const link = LINKS.find(
    (item) => (item.a === viewer && item.b === other) || (item.a === other && item.b === viewer),
  );
  const questions = link?.as?.[viewer];
  if (!questions?.length) return [];
  const quotes = link?.quote?.[viewer];
  return questions.map((questionIndex, index) => ({
    questionIndex,
    theirIndex: quotes?.[index] ?? COUNTERPART[questionIndex] ?? questionIndex,
  }));
}

export function pictureEdges(
  nodes: { id: string; name: string }[],
  edges: Edge[],
  viewerId?: string,
): (Edge & { bright: boolean })[] {
  const byName = new Map(nodes.map((node) => [keyName(node.name), node.id]));
  const viewer = keyName(nodes.find((node) => node.id === viewerId)?.name ?? "");
  const questions = new Map(edges.map((edge) => [pairKey(edge.a, edge.b), edge.questions]));
  const shown: (Edge & { bright: boolean })[] = [];
  for (const link of LINKS) {
    const a = byName.get(link.a);
    const b = byName.get(link.b);
    if (!a || !b || a === b) continue;
    const stored = questions.get(pairKey(a, b));
    shown.push({
      a,
      b,
      questions: stored && stored.length ? stored : viewer ? (link.as?.[viewer] ?? []) : [],
      bright: link.bright,
    });
  }
  shown.sort((left, right) => Number(left.bright) - Number(right.bright));
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
