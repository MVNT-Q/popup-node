import type { Point } from "./layout";

export type Edge = { a: string; b: string; questions: number[] };

type NodeRef = { id: string; code: number };

function hashAngle(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return (h % 360) * (Math.PI / 180);
}

function dist(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y) || 0.001;
}

function clamp(point: Point, pad = 60) {
  point.x = Math.min(1000 - pad, Math.max(pad, point.x));
  point.y = Math.min(1000 - pad, Math.max(pad, point.y));
}

export function componentsOf(ids: string[], edges: Edge[]): string[][] {
  const map = new Map(ids.map((id) => [id, id]));
  function find(id: string): string {
    const parent = map.get(id) ?? id;
    if (parent === id) return id;
    const root = find(parent);
    map.set(id, root);
    return root;
  }
  function join(a: string, b: string) {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) map.set(ra, rb);
  }
  for (const edge of edges) {
    if (!map.has(edge.a) || !map.has(edge.b)) continue;
    join(edge.a, edge.b);
  }
  const groups = new Map<string, string[]>();
  for (const id of ids) {
    const root = find(id);
    const list = groups.get(root) ?? [];
    list.push(id);
    groups.set(root, list);
  }
  return [...groups.values()].sort((a, b) => b.length - a.length || a[0].localeCompare(b[0]));
}

// 내 노드: 중·강 줄을 합친 자리. 토글해도 다시 안 잡는다.
export function layoutMyNode(
  self: NodeRef,
  others: NodeRef[],
  edges: Edge[],
): Map<string, Point> {
  const points = new Map<string, Point>();
  const center = { x: 500, y: 500 };
  points.set(self.id, { ...center });

  const linked = new Set<string>();
  for (const edge of edges) {
    if (edge.a === self.id) linked.add(edge.b);
    if (edge.b === self.id) linked.add(edge.a);
  }

  const ordered = [...others].sort((a, b) => a.code - b.code);
  const ring = ordered.filter((node) => linked.has(node.id));
  const outer = ordered.filter((node) => !linked.has(node.id));

  ring.forEach((node, index) => {
    const angle = (index / Math.max(ring.length, 1)) * Math.PI * 2 - Math.PI / 2 + hashAngle(node.id) * 0.05;
    const radius = 150 + (index % 3) * 28;
    points.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  outer.forEach((node, index) => {
    const angle = (index / Math.max(outer.length, 1)) * Math.PI * 2 + 0.4 + hashAngle(node.id) * 0.08;
    const radius = 260 + (index % 4) * 22;
    points.set(node.id, {
      x: center.x + Math.cos(angle) * radius,
      y: center.y + Math.sin(angle) * radius,
    });
  });

  return points;
}

function componentCenter(ids: string[], points: Map<string, Point>): Point {
  let x = 0;
  let y = 0;
  for (const id of ids) {
    const p = points.get(id)!;
    x += p.x;
    y += p.y;
  }
  const n = Math.max(ids.length, 1);
  return { x: x / n, y: y / n };
}

function componentRadius(ids: string[], points: Map<string, Point>, center: Point): number {
  let maxR = 28;
  for (const id of ids) {
    const p = points.get(id)!;
    maxR = Math.max(maxR, dist(p, center));
  }
  return maxR + 18;
}

// 그로브: 조각 안은 짧은 줄·별 최소거리. 조각끼리는 (반지름+여백)만 밀고 화면 끝까지 안 흩음.
// 고독별은 조각 사이 빈칸. 질문 토글은 호출부가 자리를 다시 안 잡음.
export function layoutGrove(nodes: NodeRef[], edges: Edge[]): Map<string, Point> {
  const points = new Map<string, Point>();
  if (!nodes.length) return points;

  const ids = nodes.map((node) => node.id);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const comps = componentsOf(ids, edges);
  const multi = comps.filter((c) => c.length >= 2);
  const solo = comps.filter((c) => c.length === 1).map((c) => c[0]);

  const STAR_MIN = 46;
  const EDGE_IDEAL = 54;
  const PIECE_GAP = 40;
  const PACK_R = 210;

  const centers: Point[] = [];
  const radii: number[] = multi.map((comp) => (comp.length === 2 ? 48 : 32 + comp.length * 7));
  const count = Math.max(multi.length, 1);

  // 초기 고리: 조각 반지름 합으로 둘레 잡고, 화면 끝까지 안 나가게 상한
  let ringR = 0;
  if (multi.length > 1) {
    const step =
      radii.reduce((sum, r, i) => sum + r + radii[(i + 1) % radii.length]! + PIECE_GAP, 0) /
      multi.length;
    ringR = Math.min(PACK_R, Math.max(64, (step * multi.length) / (Math.PI * 2)));
  }

  multi.forEach((_, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + (multi.length === 1 ? 0 : 0.12);
    centers.push({
      x: 500 + Math.cos(angle) * ringR,
      y: 500 + Math.sin(angle) * ringR * 0.94,
    });
  });

  multi.forEach((comp, cIndex) => {
    const center = centers[cIndex] ?? { x: 500, y: 500 };
    const local = new Map<string, Point>();
    const ordered = [...comp].sort((a, b) => (byId.get(a)?.code ?? 0) - (byId.get(b)?.code ?? 0));
    ordered.forEach((id, index) => {
      const angle = (index / ordered.length) * Math.PI * 2 + hashAngle(id) * 0.12;
      const radius = ordered.length === 2 ? 42 : 28 + ordered.length * 7;
      local.set(id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      });
    });

    const localEdges = edges.filter((edge) => comp.includes(edge.a) && comp.includes(edge.b));
    for (let iter = 0; iter < 64; iter += 1) {
      for (const edge of localEdges) {
        const a = local.get(edge.a)!;
        const b = local.get(edge.b)!;
        const d = dist(a, b);
        const pull = (d - EDGE_IDEAL) * 0.14;
        const ux = (b.x - a.x) / d;
        const uy = (b.y - a.y) / d;
        a.x += ux * pull;
        a.y += uy * pull;
        b.x -= ux * pull;
        b.y -= uy * pull;
      }
      for (let i = 0; i < ordered.length; i += 1) {
        for (let j = i + 1; j < ordered.length; j += 1) {
          const a = local.get(ordered[i])!;
          const b = local.get(ordered[j])!;
          const d = dist(a, b);
          if (d >= STAR_MIN) continue;
          const push = (STAR_MIN - d) * 0.2;
          const ux = (b.x - a.x) / d;
          const uy = (b.y - a.y) / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }

    const mid = componentCenter(ordered, local);
    const dx = center.x - mid.x;
    const dy = center.y - mid.y;
    for (const [id, point] of local) {
      point.x += dx;
      point.y += dy;
      points.set(id, point);
    }
    radii[cIndex] = componentRadius(ordered, local, center);
  });

  // 조각끼리: 반지름+여백만 밀고, 중심에서 멀면 다시 모아 화면 끝까지 안 흩음
  for (let iter = 0; iter < 48; iter += 1) {
    for (let i = 0; i < multi.length; i += 1) {
      for (let j = i + 1; j < multi.length; j += 1) {
        const ca = centers[i]!;
        const cb = centers[j]!;
        const need = radii[i]! + radii[j]! + PIECE_GAP;
        const d = dist(ca, cb);
        if (d >= need) continue;
        const push = (need - d) * 0.2;
        const ux = (cb.x - ca.x) / d;
        const uy = (cb.y - ca.y) / d;
        const dx = ux * push;
        const dy = uy * push;
        for (const id of multi[i]!) {
          const p = points.get(id)!;
          p.x -= dx;
          p.y -= dy;
        }
        for (const id of multi[j]!) {
          const p = points.get(id)!;
          p.x += dx;
          p.y += dy;
        }
        ca.x -= dx;
        ca.y -= dy;
        cb.x += dx;
        cb.y += dy;
      }
    }
    for (let i = 0; i < multi.length; i += 1) {
      const ca = centers[i]!;
      const fromMid = dist(ca, { x: 500, y: 500 });
      const cap = PACK_R + radii[i]! * 0.35;
      if (fromMid <= cap) continue;
      const pull = (fromMid - cap) * 0.12;
      const ux = (500 - ca.x) / fromMid;
      const uy = (500 - ca.y) / fromMid;
      const dx = ux * pull;
      const dy = uy * pull;
      for (const id of multi[i]!) {
        const p = points.get(id)!;
        p.x += dx;
        p.y += dy;
      }
      ca.x += dx;
      ca.y += dy;
    }
  }

  // 고독별: 조각 사이·안쪽 빈칸. 바깥 큰 고리로 안 밀어냄
  const occupied = [...points.values()];
  const soloMin = 52;
  solo
    .sort((a, b) => (byId.get(a)?.code ?? 0) - (byId.get(b)?.code ?? 0))
    .forEach((id, index) => {
      let best: Point | null = null;
      let bestScore = -Infinity;
      const tries = 36;
      for (let tryN = 0; tryN < tries; tryN += 1) {
        const angle =
          (index / Math.max(solo.length, 1)) * Math.PI * 2 +
          tryN * 0.47 +
          hashAngle(id) * 0.08;
        const band = multi.length ? 90 + (tryN % 5) * 28 + (index % 3) * 12 : 120 + (tryN % 6) * 22;
        const x = 500 + Math.cos(angle) * band;
        const y = 500 + Math.sin(angle) * band * 0.96;
        let closest = Infinity;
        for (const point of occupied) {
          closest = Math.min(closest, Math.hypot(point.x - x, point.y - y));
        }
        if (closest < soloMin) continue;
        // 빈칸에 가깝고, 화면 가장자리보다 안쪽을 선호
        const edgeDist = Math.min(x, y, 1000 - x, 1000 - y);
        const score = Math.min(closest, 140) + edgeDist * 0.35 - Math.hypot(x - 500, y - 500) * 0.08;
        if (score > bestScore) {
          bestScore = score;
          best = { x, y };
        }
      }
      const point = best ?? {
        x: 500 + Math.cos(hashAngle(id)) * 140,
        y: 500 + Math.sin(hashAngle(id)) * 140,
      };
      clamp(point);
      points.set(id, point);
      occupied.push(point);
    });

  for (const point of points.values()) clamp(point);
  return points;
}
