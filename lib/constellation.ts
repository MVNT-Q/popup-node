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

function clamp(point: Point, pad = 40) {
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

// 그로브: 줄로 이어진 조각끼리 당기고, 조각끼리는 밀어 낸다. 혼자인 별은 틈에.
export function layoutGrove(nodes: NodeRef[], edges: Edge[]): Map<string, Point> {
  const points = new Map<string, Point>();
  if (!nodes.length) return points;

  const ids = nodes.map((node) => node.id);
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const comps = componentsOf(ids, edges);
  const multi = comps.filter((c) => c.length >= 2);
  const solo = comps.filter((c) => c.length === 1).map((c) => c[0]);

  const centers: Point[] = [];
  const count = Math.max(multi.length, 1);
  // 조각이 여러 개면 멀리 떨어뜨린다. 하나면 살짝 중심에서 비킨다.
  const ringR = multi.length <= 1 ? 0 : Math.min(340, 180 + multi.length * 36);
  multi.forEach((comp, index) => {
    const angle = (index / count) * Math.PI * 2 - Math.PI / 2 + (multi.length === 1 ? 0 : 0.15);
    centers.push({
      x: 500 + Math.cos(angle) * ringR,
      y: 480 + Math.sin(angle) * ringR * 0.92,
    });
  });

  multi.forEach((comp, cIndex) => {
    const center = centers[cIndex] ?? { x: 500, y: 500 };
    const local = new Map<string, Point>();
    const ordered = [...comp].sort((a, b) => (byId.get(a)?.code ?? 0) - (byId.get(b)?.code ?? 0));
    ordered.forEach((id, index) => {
      const angle = (index / ordered.length) * Math.PI * 2 + hashAngle(id) * 0.12;
      const radius = ordered.length === 2 ? 58 : 36 + ordered.length * 10;
      local.set(id, {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.sin(angle) * radius,
      });
    });

    const localEdges = edges.filter((edge) => comp.includes(edge.a) && comp.includes(edge.b));
    for (let iter = 0; iter < 56; iter += 1) {
      for (const edge of localEdges) {
        const a = local.get(edge.a)!;
        const b = local.get(edge.b)!;
        const d = dist(a, b);
        const ideal = 78;
        const pull = (d - ideal) * 0.1;
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
          if (d >= 56) continue;
          const push = (56 - d) * 0.16;
          const ux = (b.x - a.x) / d;
          const uy = (b.y - a.y) / d;
          a.x -= ux * push;
          a.y -= uy * push;
          b.x += ux * push;
          b.y += uy * push;
        }
      }
    }

    // 조각 중심을 다시 centers에 맞춤.
    const mid = componentCenter(ordered, local);
    const dx = center.x - mid.x;
    const dy = center.y - mid.y;
    for (const [id, point] of local) {
      point.x += dx;
      point.y += dy;
      points.set(id, point);
    }
  });

  // 조각 중심끼리 강하게 밀어 떨어뜨린다.
  const minComp = 260;
  for (let iter = 0; iter < 36; iter += 1) {
    for (let i = 0; i < multi.length; i += 1) {
      for (let j = i + 1; j < multi.length; j += 1) {
        const ca = centers[i];
        const cb = centers[j];
        const d = dist(ca, cb);
        if (d >= minComp) continue;
        const push = (minComp - d) * 0.22;
        const ux = (cb.x - ca.x) / d;
        const uy = (cb.y - ca.y) / d;
        const dx = ux * push;
        const dy = uy * push;
        for (const id of multi[i]) {
          const p = points.get(id)!;
          p.x -= dx;
          p.y -= dy;
        }
        for (const id of multi[j]) {
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
  }

  // 혼자인 별: 무리 사이 바깥 고리에 둔다.
  const occupied = [...points.values()];
  solo
    .sort((a, b) => (byId.get(a)?.code ?? 0) - (byId.get(b)?.code ?? 0))
    .forEach((id, index) => {
      const angle =
        (index / Math.max(solo.length, 1)) * Math.PI * 2 + 0.55 + hashAngle(id) * 0.04;
      let radius = multi.length ? 360 + (index % 4) * 28 : 220 + (index % 5) * 24;
      let x = 500 + Math.cos(angle) * radius;
      let y = 500 + Math.sin(angle) * radius;
      for (let tryN = 0; tryN < 8; tryN += 1) {
        let closest = Infinity;
        for (const point of occupied) {
          closest = Math.min(closest, Math.hypot(point.x - x, point.y - y));
        }
        if (closest >= 96) break;
        radius += 28;
        x = 500 + Math.cos(angle + tryN * 0.35) * radius;
        y = 500 + Math.sin(angle + tryN * 0.35) * radius;
      }
      const point = { x, y };
      clamp(point);
      points.set(id, point);
      occupied.push(point);
    });

  for (const point of points.values()) clamp(point);
  return points;
}
