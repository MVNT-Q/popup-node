import type { Point } from "./layout";
import type { Edge } from "./constellation";

/**
 * 전시 그로브에 그리는 26줄. false면 예전 방사 배치·저장된 줄 전부.
 * 저장된 판단은 지우지 않고, 화면에 깔 줄과 자리만 고른다.
 */
export const GROVE_PICTURE = true;

type Link = { a: string; b: string; bright: boolean };

/** 이름이 맞는 줄. 밝은 줄 17, 흐린 줄 9. */
const LINKS: Link[] = [
  { a: "juhree", b: "syon", bright: true },
  { a: "juhree", b: "mia", bright: true },
  { a: "syon", b: "mia", bright: true },
  { a: "leo", b: "syon", bright: true },
  { a: "syon", b: "dohan", bright: true },
  { a: "juhree", b: "hannah", bright: true },
  { a: "teson", b: "soundbeats", bright: true },
  { a: "phezman", b: "soundbeats", bright: true },
  { a: "qq", b: "doy", bright: true },
  { a: "juhree", b: "toa", bright: true },
  { a: "hannah", b: "toa", bright: true },
  { a: "sh", b: "toa", bright: true },
  { a: "doy", b: "toa", bright: true },
  { a: "syon", b: "convengers", bright: true },
  { a: "convengers", b: "keen", bright: true },
  { a: "phezman", b: "toa", bright: true },
  { a: "mia", b: "belle", bright: true },
  { a: "dohan", b: "sh", bright: false },
  { a: "mia", b: "dohan", bright: false },
  { a: "jean", b: "starr b", bright: false },
  { a: "convengers", b: "soundbeats", bright: false },
  { a: "qq", b: "soundbeats", bright: false },
  { a: "juhree", b: "doy", bright: false },
  { a: "hannah", b: "doy", bright: false },
  { a: "juhree", b: "teson", bright: false },
  { a: "juhree", b: "qq", bright: false },
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

export function pictureEdges(
  nodes: { id: string; name: string }[],
  edges: Edge[],
): (Edge & { bright: boolean })[] {
  const byName = new Map(nodes.map((node) => [keyName(node.name), node.id]));
  const questions = new Map(edges.map((edge) => [pairKey(edge.a, edge.b), edge.questions]));
  const shown: (Edge & { bright: boolean })[] = [];
  for (const link of LINKS) {
    const a = byName.get(link.a);
    const b = byName.get(link.b);
    if (!a || !b || a === b) continue;
    shown.push({
      a,
      b,
      questions: questions.get(pairKey(a, b)) ?? [],
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
