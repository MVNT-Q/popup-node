"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fitCam, zoomCam, type Cam } from "@/lib/layout";

export type SkyPoint = {
  id: string;
  code: number;
  name?: string;
  x: number;
  y: number;
  band: "self" | "dim" | "weak" | "mid" | "strong";
  selected: boolean;
};

export type SkyEdge = {
  a: string;
  b: string;
  questions: number[];
  bright: boolean;
};

const WORLD = 1000;

function lineClass(bright: boolean, a: SkyPoint["band"], b: SkyPoint["band"]) {
  if (!bright) return "cyp-line dim";
  const rank = (band: SkyPoint["band"]) =>
    band === "strong" || band === "self" ? 3 : band === "mid" ? 2 : band === "weak" ? 1 : 0;
  const level = Math.min(rank(a), rank(b));
  if (level >= 3) return "cyp-line strong";
  if (level >= 2) return "cyp-line mid";
  return "cyp-line weak";
}

/** 연결된 선 반대쪽으로 라벨을 밀어 선·번호가 겹치지 않게 */
function labelPlacement(
  star: SkyPoint,
  neighbors: SkyPoint[],
): { side: "right" | "left" | "above" | "below"; alone: boolean } {
  if (!neighbors.length) return { side: "right", alone: true };
  let sx = 0;
  let sy = 0;
  for (const n of neighbors) {
    const dx = n.x - star.x;
    const dy = n.y - star.y;
    const d = Math.hypot(dx, dy) || 1;
    sx += dx / d;
    sy += dy / d;
  }
  // 선들이 모인 쪽의 반대 = 라벨
  const ox = -sx;
  const oy = -sy;
  if (Math.hypot(ox, oy) < 0.15) return { side: "right", alone: false };
  if (Math.abs(ox) >= Math.abs(oy)) {
    return { side: ox >= 0 ? "right" : "left", alone: false };
  }
  return { side: oy >= 0 ? "below" : "above", alone: false };
}

export function ConstellationSky({
  stars,
  edges,
  onPick,
}: {
  stars: SkyPoint[];
  edges: SkyEdge[];
  onPick: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, s: 1 });
  const camRef = useRef(cam);
  camRef.current = cam;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const drag = useRef<{
    id: number;
    x: number;
    y: number;
    ox: number;
    oy: number;
    moved: boolean;
    starId?: string;
  } | null>(null);
  const pinch = useRef<{ dist: number; cam: Cam } | null>(null);
  const starsRef = useRef(stars);
  starsRef.current = stars;
  // 자리만 키로. 밝기·선택 바뀌어도 카메라를 다시 맞추지 않는다.
  const layoutKey = stars.map((star) => `${star.id}:${Math.round(star.x)}:${Math.round(star.y)}`).join("|");
  const byId = useMemo(() => new Map(stars.map((star) => [star.id, star])), [stars]);

  const neighborsOf = useMemo(() => {
    const map = new Map<string, SkyPoint[]>();
    for (const star of stars) map.set(star.id, []);
    for (const edge of edges) {
      const a = byId.get(edge.a);
      const b = byId.get(edge.b);
      if (!a || !b) continue;
      map.get(edge.a)?.push(b);
      map.get(edge.b)?.push(a);
    }
    return map;
  }, [stars, edges, byId]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    setCam(fitCam(starsRef.current, el.clientWidth, el.clientHeight));
  }, [layoutKey]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = el.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      setCam(zoomCam(camRef.current, event.clientX - rect.left, event.clientY - rect.top, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className="cyp-sky"
      ref={viewportRef}
      onPointerDown={(event) => {
        const el = event.currentTarget;
        el.setPointerCapture(event.pointerId);
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (pointers.current.size >= 2) {
          const pts = [...pointers.current.values()];
          pinch.current = {
            dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1,
            cam: camRef.current,
          };
          drag.current = null;
          return;
        }
        const star = (event.target as HTMLElement).closest?.("[data-star]");
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          ox: camRef.current.x,
          oy: camRef.current.y,
          moved: false,
          starId: star instanceof HTMLElement ? star.dataset.star : undefined,
        };
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const el = viewportRef.current;
        if (pointers.current.size >= 2 && pinch.current && el) {
          const pts = [...pointers.current.values()];
          const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
          const rect = el.getBoundingClientRect();
          const mx = (pts[0].x + pts[1].x) / 2 - rect.left;
          const my = (pts[0].y + pts[1].y) / 2 - rect.top;
          setCam(zoomCam(pinch.current.cam, mx, my, dist / pinch.current.dist));
          return;
        }
        const current = drag.current;
        if (!current || current.id !== event.pointerId) return;
        const dx = event.clientX - current.x;
        const dy = event.clientY - current.y;
        if (Math.hypot(dx, dy) > 10) current.moved = true;
        // 별 위에서 시작한 제스처는 팬하지 않음 — 탭으로 시트 열기
        if (current.starId) return;
        setCam({ x: current.ox + dx, y: current.oy + dy, s: camRef.current.s });
      }}
      onPointerUp={(event) => {
        const dragged = Boolean(drag.current?.moved);
        const pinched = Boolean(pinch.current);
        const id = drag.current?.id === event.pointerId ? drag.current.starId : undefined;
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (drag.current?.id === event.pointerId) drag.current = null;
        if (!dragged && !pinched && id) onPick(id);
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
    >
      <div
        className="cyp-world"
        style={{
          width: WORLD,
          height: WORLD,
          transform: `translate(${cam.x}px, ${cam.y}px) scale(${cam.s})`,
        }}
      >
        <svg className="cyp-wires" width={WORLD} height={WORLD} viewBox={`0 0 ${WORLD} ${WORLD}`} aria-hidden>
          {edges.map((edge) => {
            const a = byId.get(edge.a);
            const b = byId.get(edge.b);
            if (!a || !b) return null;
            return (
              <line
                key={`${edge.a}-${edge.b}-${edge.questions.join(",")}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={lineClass(edge.bright, a.band, b.band)}
              />
            );
          })}
        </svg>
        {stars.map((star) => {
          const place = labelPlacement(star, neighborsOf.get(star.id) ?? []);
          return (
            <button
              key={star.id}
              type="button"
              className={`cyp-star ${star.band}${star.selected ? " on" : ""} label-${place.side}`}
              style={{ left: star.x, top: star.y }}
              data-star={star.id}
              aria-label={star.name ? `#${String(star.code).padStart(3, "0")} ${star.name}` : `NODE ${star.code}`}
            >
              <span className="dot" />
              <span className="num">#{String(star.code).padStart(3, "0")}</span>
              {star.name ? <span className="call">{star.name}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}
