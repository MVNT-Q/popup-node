"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fitCam, focusBandY, focusCam, zoomCam, type Cam } from "@/lib/layout";

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
/** 화면 픽셀 기준 별 히트 반경 — 줌·태블릿 데스크톱 모드에서도 손가락이 먹게 */
const HIT_PX = 44;

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

/** 뷰포트 로컬 좌표 → 월드. 카메라 변환과 같은 식 */
function clientToWorld(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  cam: Cam,
): { x: number; y: number } {
  const rect = el.getBoundingClientRect();
  // visualViewport 오프셋이 있어도 client·getBoundingClientRect는 같은 좌표계
  const lx = clientX - rect.left;
  const ly = clientY - rect.top;
  return {
    x: (lx - cam.x) / cam.s,
    y: (ly - cam.y) / cam.s,
  };
}

/** DOM 타깃이 아닌 화면 거리로 고른다 — 줌 아웃·갤탭에서 56px 박스가 안 맞는 문제 */
function nearestStarId(
  el: HTMLElement,
  clientX: number,
  clientY: number,
  cam: Cam,
  stars: SkyPoint[],
): string | undefined {
  if (!stars.length) return undefined;
  const world = clientToWorld(el, clientX, clientY, cam);
  const maxDist = HIT_PX / Math.max(cam.s, 0.001);
  let bestId: string | undefined;
  let best = maxDist;
  for (const star of stars) {
    const d = Math.hypot(star.x - world.x, star.y - world.y);
    if (d <= best) {
      best = d;
      bestId = star.id;
    }
  }
  return bestId;
}

export function ConstellationSky({
  stars,
  edges,
  focusId = null,
  onPick,
}: {
  stars: SkyPoint[];
  edges: SkyEdge[];
  /** 선택된 별 — 카메라가 그쪽으로 이동·줌, 나머지는 흐리게 */
  focusId?: string | null;
  onPick: (id: string) => void;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const [cam, setCam] = useState<Cam>({ x: 0, y: 0, s: 1 });
  const [camEase, setCamEase] = useState(false);
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
  const focusRef = useRef(focusId);
  focusRef.current = focusId;
  const hadFocus = useRef(false);
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
    if (!el || focusRef.current) return;
    setCamEase(false);
    setCam(fitCam(starsRef.current, el.clientWidth, el.clientHeight));
  }, [layoutKey]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    if (!focusId) {
      if (hadFocus.current) {
        setCamEase(true);
        setCam(fitCam(starsRef.current, el.clientWidth, el.clientHeight));
        hadFocus.current = false;
      }
      return;
    }
    const star = starsRef.current.find((item) => item.id === focusId);
    if (!star) return;
    hadFocus.current = true;
    const apply = () => {
      const node = viewportRef.current;
      const target = starsRef.current.find((item) => item.id === focusId);
      if (!node || !target) return;
      setCamEase(true);
      // 제목 아래·카드/틱커 위 빈 구간 중앙 — 폰 높이 달라도 같은 느낌
      setCam(focusCam(target, node.clientWidth, node.clientHeight, focusBandY(node)));
    };
    apply();
    // 카드가 같은 프레임에 붙을 수 있어 한 번 더
    const raf = requestAnimationFrame(apply);
    const onResize = () => apply();
    window.addEventListener("resize", onResize);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", onResize);
    vv?.addEventListener("scroll", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      vv?.removeEventListener("resize", onResize);
      vv?.removeEventListener("scroll", onResize);
    };
  }, [focusId]);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setCamEase(false);
      const rect = el.getBoundingClientRect();
      const factor = event.deltaY < 0 ? 1.08 : 0.92;
      setCam(zoomCam(camRef.current, event.clientX - rect.left, event.clientY - rect.top, factor));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  return (
    <div
      className={`cyp-sky${focusId ? " is-focus" : ""}`}
      ref={viewportRef}
      onPointerDown={(event) => {
        const el = event.currentTarget;
        // 버튼이 클릭을 삼키지 않게 — 하늘이 포인터를 갖는다
        try {
          el.setPointerCapture(event.pointerId);
        } catch {
          /* capture 실패해도 좌표 히트는 동작 */
        }
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
        // DOM closest만 믿으면 라벨·글로우·줌 아웃에서 빗나감 → 화면 거리
        const fromDom = (event.target as HTMLElement).closest?.("[data-star]");
        const domId = fromDom instanceof HTMLElement ? fromDom.dataset.star : undefined;
        const nearId = nearestStarId(el, event.clientX, event.clientY, camRef.current, starsRef.current);
        drag.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          ox: camRef.current.x,
          oy: camRef.current.y,
          moved: false,
          starId: nearId || domId,
        };
      }}
      onPointerMove={(event) => {
        if (!pointers.current.has(event.pointerId)) return;
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const el = viewportRef.current;
        if (pointers.current.size >= 2 && pinch.current && el) {
          setCamEase(false);
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
        // 별 탭은 손가락 떨림을 더 허용 — 10px면 모바일에서 선택이 자주 죽음
        const slop = current.starId ? 32 : 10;
        if (Math.hypot(dx, dy) > slop) current.moved = true;
        // 별 위에서 시작한 제스처는 팬하지 않음 — 탭으로 시트 열기
        if (current.starId) return;
        setCamEase(false);
        setCam({ x: current.ox + dx, y: current.oy + dy, s: camRef.current.s });
      }}
      onPointerUp={(event) => {
        const current = drag.current?.id === event.pointerId ? drag.current : null;
        const dragged = Boolean(current?.moved);
        const pinched = Boolean(pinch.current);
        pointers.current.delete(event.pointerId);
        if (pointers.current.size < 2) pinch.current = null;
        if (drag.current?.id === event.pointerId) drag.current = null;
        if (dragged || pinched || !current) return;
        const el = viewportRef.current;
        // 업 시점에도 다시 히트 — 포커스 변환·mouse/touch 혼용에서도 같은 별
        const again =
          el
            ? nearestStarId(el, event.clientX, event.clientY, camRef.current, starsRef.current)
            : undefined;
        const id = again || current.starId;
        if (id) onPick(id);
      }}
      onPointerCancel={(event) => {
        pointers.current.delete(event.pointerId);
        pinch.current = null;
        drag.current = null;
      }}
    >
      <div
        className={`cyp-world${camEase ? " ease" : ""}`}
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
            const tied = Boolean(focusId && (edge.a === focusId || edge.b === focusId));
            // 별 중심끼리만 — 라벨(#·이름)은 선 밖 absolute
            return (
              <line
                key={`${edge.a}-${edge.b}-${edge.questions.join(",")}`}
                x1={a.x}
                y1={a.y}
                x2={b.x}
                y2={b.y}
                className={`${lineClass(edge.bright, a.band, b.band)}${focusId && !tied ? " fade" : ""}`}
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
              className={`cyp-star ${star.band}${star.selected ? " on" : ""}${focusId && !star.selected ? " fade" : ""} label-${place.side}`}
              style={{ left: star.x, top: star.y }}
              data-star={star.id}
              aria-label={star.name ? `#${String(star.code).padStart(3, "0")} ${star.name}` : `NODE ${star.code}`}
              tabIndex={-1}
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
