"use client";

import { useEffect, useMemo, useRef } from "react";
import { sphereWords, type SphereWord } from "@/lib/words";

type Base = SphereWord & {
  x: number;
  y: number;
  z: number;
  sizeBase: number;
  glow: number;
};

type Dust = { x: number; y: number; z: number; size: number; glow: number };

/** 구 표면 플라즈마 — 부드러운 초록 빛 가닥 (단어 없음) */
type Plasma = {
  pts: { x: number; y: number; z: number }[];
  width: number;
  alpha: number;
};

type Pair = { i: number; j: number; a: number; kind: "word" | "dust" };

function frac(seed: number) {
  const t = Math.sin(seed * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

/** 결정적 셔플 — 무게 순이 위 반구에 몰리지 않게 위도를 다시 섞는다. */
function shuffleWords(words: SphereWord[]): SphereWord[] {
  const arr = [...words];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(frac(i * 19.73 + 4.2) * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j]!;
    arr[j] = tmp!;
  }
  return arr;
}

function basePlace(words: SphereWord[]): Base[] {
  const ordered = shuffleWords(words);
  const n = ordered.length || 1;
  // 피보나치 구면: y를 [-1,1] 균등 → 위·옆·아래 전면
  return ordered.map((word, index) => {
    const r1 = frac(index + 1.7);
    const r2 = frac(index * 3.1 + 0.4);
    const r3 = frac(index * 7.3 + 2.2);
    const i = index + 0.5;
    const y0 = 1 - (i / n) * 2;
    const y = Math.max(-0.98, Math.min(0.98, y0 + (r3 - 0.5) * 0.06));
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const golden = i * 2.399963229728653 + (r1 - 0.5) * 0.28;
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    const hub = !word.example && word.weight >= 2;
    const phrase = word.text.includes(" ");
    // 목업처럼 숨 쉬는 간격 — 글자 과하지 않게
    const sizeBase = word.example
      ? phrase
        ? 5 + r2 * 2.5
        : 5.5 + r2 * 3.5
      : hub
        ? 10 + Math.min(8, word.weight * 1.6) + r1 * 3.5
        : phrase
          ? 5.5 + Math.min(4, word.weight * 0.9) + r3 * 2.5
          : 6.5 + Math.min(6, word.weight * 1.2) + r3 * 3.5;
    const glow = word.example
      ? 0.55 + r1 * 0.4
      : hub
        ? 1.15 + r2 * 0.45
        : 0.7 + r3 * 0.5;
    return { ...word, x, y, z, sizeBase, glow };
  });
}

function makeDust(count: number): Dust[] {
  const out: Dust[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = frac(i * 2.17 + 9.1);
    const r2 = frac(i * 5.33 + 1.4);
    const r3 = frac(i * 11.7 + 3.8);
    // 구 표면 잔점 — 배경 먼지별과 별개 레이어
    const yi = i + 0.5;
    const y0 = 1 - (yi / count) * 2;
    const y = Math.max(-0.95, Math.min(0.95, y0 + (r1 - 0.5) * 0.1));
    const shell = 0.72 + r2 * 0.28;
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * shell;
    const ang = yi * 2.399963229728653 + r3;
    out.push({
      x: Math.cos(ang) * radius,
      y,
      z: Math.sin(ang) * radius,
      size: 1.1 + r1 * 2.1,
      glow: 0.4 + r2 * 0.5,
    });
  }
  return out;
}

function makePlasma(count: number): Plasma[] {
  const out: Plasma[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = frac(i * 4.11 + 2.3);
    const r2 = frac(i * 9.27 + 0.8);
    const r3 = frac(i * 13.5 + 5.1);
    const yMid = (r1 - 0.5) * 1.6;
    const steps = 7 + Math.floor(r2 * 5);
    const pts: { x: number; y: number; z: number }[] = [];
    const baseAng = r3 * Math.PI * 2;
    for (let s = 0; s < steps; s++) {
      const t = s / (steps - 1);
      const y = Math.max(-0.92, Math.min(0.92, yMid + (t - 0.5) * (0.55 + r2 * 0.45)));
      const shell = 0.78 + r1 * 0.2;
      const radius = Math.sqrt(Math.max(0, 1 - y * y)) * shell;
      const ang = baseAng + (t - 0.5) * (0.9 + r3 * 1.1) + Math.sin(t * Math.PI * 2 + r1) * 0.35;
      pts.push({
        x: Math.cos(ang) * radius,
        y,
        z: Math.sin(ang) * radius,
      });
    }
    out.push({
      pts,
      width: 0.9 + r2 * 1.6,
      alpha: 0.1 + r1 * 0.14,
    });
  }
  return out;
}

function linkPairs(base: Base[], dust: Dust[]): Pair[] {
  // 가까운 점끼리만 — 먼 대각선은 줄인다
  const points = [
    ...base.map((p) => ({ x: p.x, y: p.y, z: p.z, w: p.example ? 0.4 : p.weight, word: true })),
    ...dust.map((p) => ({ x: p.x, y: p.y, z: p.z, w: 0.25, word: false })),
  ];
  const scored: { i: number; j: number; dist: number; prefer: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i]!;
      const b = points[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0.48 || dist < 0.04) continue;
      const prefer = a.w + b.w + (1.2 - dist) * 2.2 + (a.word && b.word ? 0.8 : 0);
      const gate = frac(i * 17 + j * 31 + 0.9);
      if (prefer < 1.6 && gate > 0.5) continue;
      if (prefer < 2.4 && gate > 0.72) continue;
      scored.push({ i, j, dist, prefer });
    }
  }
  scored.sort((a, b) => b.prefer - a.prefer || a.dist - b.dist);
  const maxLinks = Math.max(56, Math.min(260, Math.floor(points.length * 1.8)));
  return scored.slice(0, maxLinks).map((row) => ({
    i: row.i,
    j: row.j,
    a: 0.14 + (1 - row.dist / 0.48) * 0.32,
    kind: row.i < base.length && row.j < base.length ? "word" : "dust",
  }));
}

function projectPoint(
  p: { x: number; y: number; z: number },
  yaw: number,
  pitch: number,
) {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  // yaw(Y) → pitch(X)
  const x1 = p.x * cy + p.z * sy;
  const y1 = p.y;
  const z1 = -p.x * sy + p.z * cy;
  const y2 = y1 * cp - z1 * sp;
  const z2 = y1 * sp + z1 * cp;
  return { x: x1, y: y2, z: z2 };
}

export function WordSphere({ imagines }: { imagines: string[] }) {
  const base = useMemo(() => basePlace(sphereWords(imagines)), [imagines]);
  // 구 위 잔점 — 배경별보다 밀도로 구분
  const dust = useMemo(() => makeDust(Math.max(110, Math.floor(base.length * 2.4))), [base.length]);
  const plasma = useMemo(() => makePlasma(14), []);
  const pairs = useMemo(() => linkPairs(base, dust), [base, dust]);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const plasmaRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    const plasmaSvg = plasmaRef.current;
    if (!root || !svg || !plasmaSvg) return;

    const wordEls = Array.from(root.querySelectorAll<HTMLElement>(".cyp-word"));
    const dustEls = Array.from(root.querySelectorAll<HTMLElement>(".cyp-dust"));
    const lineEls = Array.from(svg.querySelectorAll("line"));
    const plasmaEls = Array.from(plasmaSvg.querySelectorAll("path"));
    let yaw = 0;
    let pitch = 0.18;
    let raf = 0;
    let last = performance.now();
    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let activeId: number | null = null;
    // 좁은 화면일수록 글자·깊이 가산을 더 줄여 겹침을 막는다
    const sizeScale = () => {
      const w = root.clientWidth || window.innerWidth;
      if (w < 380) return 0.62;
      if (w < 520) return 0.74;
      if (w < 720) return 0.86;
      return 1;
    };

    const onDown = (event: PointerEvent) => {
      dragging = true;
      lastX = event.clientX;
      lastY = event.clientY;
      activeId = event.pointerId;
      root.classList.add("dragging");
      try {
        root.setPointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      event.preventDefault();
    };

    const onMove = (event: PointerEvent) => {
      if (!dragging || (activeId !== null && event.pointerId !== activeId)) return;
      const dx = event.clientX - lastX;
      const dy = event.clientY - lastY;
      lastX = event.clientX;
      lastY = event.clientY;
      yaw += dx * 0.008;
      pitch = Math.max(-1.05, Math.min(1.05, pitch + dy * 0.008));
      event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      if (activeId !== null && event.pointerId !== activeId) return;
      dragging = false;
      activeId = null;
      root.classList.remove("dragging");
      try {
        root.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      // 드래그 중이 아니면 현재 각도에서 Y축 자동 회전만 이어감
      if (!dragging) {
        yaw += (dt / 1000) * ((Math.PI * 2) / 90);
      }

      const R = 46;
      const scale = sizeScale();
      const projWords = base.map((p) => {
        const r = projectPoint(p, yaw, pitch);
        const depth = (r.z + 1) / 2;
        return {
          left: 50 + r.x * R,
          top: 50 - r.y * R,
          size: (p.sizeBase + depth * (p.example ? 1.2 : 2.8)) * scale,
          opacity: Math.min(
            1,
            (p.example ? 0.38 + depth * 0.42 : 0.45 + depth * 0.55) * p.glow,
          ),
          zIndex: Math.round(depth * 30) + 2,
          depth,
          glow: p.glow,
        };
      });

      const projDust = dust.map((p) => {
        const r = projectPoint(p, yaw, pitch);
        const depth = (r.z + 1) / 2;
        return {
          left: 50 + r.x * R,
          top: 50 - r.y * R,
          size: p.size * (0.7 + depth * 0.6),
          opacity: Math.min(0.95, (0.28 + depth * 0.65) * p.glow),
          zIndex: Math.round(depth * 20),
          depth,
        };
      });

      const all = [
        ...projWords.map((p) => ({ left: p.left, top: p.top, depth: p.depth })),
        ...projDust.map((p) => ({ left: p.left, top: p.top, depth: p.depth })),
      ];

      for (let i = 0; i < wordEls.length; i++) {
        const el = wordEls[i];
        const p = projWords[i];
        if (!el || !p) continue;
        el.style.left = `${p.left}%`;
        el.style.top = `${p.top}%`;
        el.style.fontSize = `${p.size}px`;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.zIndex);
        el.style.setProperty("--word-glow", String(0.35 + p.glow * 0.7));
      }

      for (let i = 0; i < dustEls.length; i++) {
        const el = dustEls[i];
        const p = projDust[i];
        if (!el || !p) continue;
        el.style.left = `${p.left}%`;
        el.style.top = `${p.top}%`;
        el.style.width = `${p.size}px`;
        el.style.height = `${p.size}px`;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.zIndex);
      }

      for (let k = 0; k < pairs.length; k++) {
        const line = lineEls[k];
        const pair = pairs[k];
        if (!line || !pair) continue;
        const a = all[pair.i];
        const b = all[pair.j];
        if (!a || !b) continue;
        const fade = 0.55 + ((a.depth + b.depth) / 2) * 0.55;
        const alpha = Math.min(0.85, pair.a * fade * (pair.kind === "word" ? 1.15 : 0.85));
        line.setAttribute("x1", String(a.left));
        line.setAttribute("y1", String(a.top));
        line.setAttribute("x2", String(b.left));
        line.setAttribute("y2", String(b.top));
        line.setAttribute("stroke", `rgba(28,255,138,${alpha})`);
      }

      for (let p = 0; p < plasma.length; p++) {
        const el = plasmaEls[p];
        const strand = plasma[p];
        if (!el || !strand) continue;
        const projected = strand.pts.map((pt) => {
          const r = projectPoint(pt, yaw, pitch);
          return {
            x: 50 + r.x * R,
            y: 50 - r.y * R,
            depth: (r.z + 1) / 2,
          };
        });
        const avgDepth = projected.reduce((s, q) => s + q.depth, 0) / projected.length;
        const d = projected
          .map((q, idx) => `${idx === 0 ? "M" : "L"}${q.x.toFixed(2)} ${q.y.toFixed(2)}`)
          .join(" ");
        el.setAttribute("d", d);
        el.setAttribute(
          "stroke",
          `rgba(60,255,160,${(strand.alpha * (0.45 + avgDepth * 0.7)).toFixed(3)})`,
        );
        el.setAttribute("stroke-width", String(strand.width * (0.7 + avgDepth * 0.5)));
        el.style.opacity = String(0.55 + avgDepth * 0.45);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      root.removeEventListener("pointerdown", onDown);
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointercancel", onUp);
    };
  }, [base, dust, pairs, plasma]);

  return (
    <div className="cyp-sphere" aria-hidden ref={rootRef}>
      <div className="cyp-sphere-core" />
      <svg
        className="cyp-sphere-plasma"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        ref={plasmaRef}
      >
        {plasma.map((_, index) => (
          <path
            key={`plasma-${index}`}
            d="M0 0"
            fill="none"
            stroke="rgba(60,255,160,0.15)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <svg
        className="cyp-sphere-wires"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        ref={svgRef}
      >
        {pairs.map((pair, index) => (
          <line
            key={index}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="rgba(28,255,138,0.2)"
            strokeWidth={pair.kind === "word" ? "0.12" : "0.08"}
          />
        ))}
      </svg>
      {dust.map((_, index) => (
        <i key={`dust-${index}`} className="cyp-dust" />
      ))}
      {base.map((word, index) => (
        <span
          key={`${word.example ? "ex" : "real"}-${word.text}-${index}`}
          className={word.example ? "cyp-word cyp-word-soft" : "cyp-word"}
          style={{
            left: "50%",
            top: "50%",
            fontSize: word.sizeBase,
            opacity: 0,
            transform: "translate(-50%, -50%)",
          }}
        >
          <i className="cyp-word-dot" />
          {word.text}
        </span>
      ))}
    </div>
  );
}
