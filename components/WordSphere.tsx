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

type Pair = { i: number; j: number; a: number; kind: "word" | "dust" };

function frac(seed: number) {
  const t = Math.sin(seed * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

function basePlace(words: SphereWord[]): Base[] {
  const n = words.length || 1;
  // 피보나치 구면: y(+위)를 [-1,1] 균등 → 투영에서 top=50-y*R 로 위·아래 대칭
  return words.map((word, index) => {
    const r1 = frac(index + 1.7);
    const r2 = frac(index * 3.1 + 0.4);
    const r3 = frac(index * 7.3 + 2.2);
    const i = index + 0.5;
    const y0 = 1 - (i / n) * 2;
    // 살짝만 흔들어 성긴 성단감. |y|를 한쪽으로 몰지 않음
    const y = Math.max(-0.98, Math.min(0.98, y0 + (r3 - 0.5) * 0.08));
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const golden = i * 2.399963229728653 + (r1 - 0.5) * 0.35;
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    // 무게·난수로 점 크기·발광을 크게 갈라 둔다 (목업 계층)
    const hub = !word.example && word.weight >= 2;
    const sizeBase = word.example
      ? 5 + r2 * 4
      : hub
        ? 18 + Math.min(18, word.weight * 3.5) + r1 * 8
        : 8 + Math.min(12, word.weight * 2.4) + r3 * 8;
    const glow = word.example ? 0.4 + r1 * 0.3 : hub ? 1.15 + r2 * 0.45 : 0.65 + r3 * 0.55;
    return { ...word, x, y, z, sizeBase, glow };
  });
}

function makeDust(count: number): Dust[] {
  const out: Dust[] = [];
  for (let i = 0; i < count; i++) {
    const r1 = frac(i * 2.17 + 9.1);
    const r2 = frac(i * 5.33 + 1.4);
    const r3 = frac(i * 11.7 + 3.8);
    const y = (r1 * 2 - 1) * 0.92;
    const shell = 0.35 + r2 * 0.7;
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * shell;
    const ang = r3 * Math.PI * 2;
    out.push({
      x: Math.cos(ang) * radius,
      y,
      z: Math.sin(ang) * radius,
      size: 1.2 + r1 * 2.4,
      glow: 0.35 + r2 * 0.55,
    });
  }
  return out;
}

function linkPairs(base: Base[], dust: Dust[]): Pair[] {
  // 가까운 점끼리 많이 이어서 그물. 단어↔단어 + 먼지 일부.
  const points = [
    ...base.map((p) => ({ x: p.x, y: p.y, z: p.z, w: p.example ? 0.4 : p.weight, word: true })),
    ...dust.map((p) => ({ x: p.x, y: p.y, z: p.z, w: 0.25, word: false })),
  ];
  const scored: { i: number; j: number; dist: number; prefer: number }[] = [];
  for (let i = 0; i < points.length; i++) {
    for (let j = i + 1; j < points.length; j++) {
      const a = points[i];
      const b = points[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      // 가까운 이웃만 — 먼 대각선은 줄인다
      if (dist > 0.58 || dist < 0.04) continue;
      const prefer = a.w + b.w + (1.2 - dist) * 2.2 + (a.word && b.word ? 0.8 : 0);
      const gate = frac(i * 17 + j * 31 + 0.9);
      if (prefer < 1.6 && gate > 0.55) continue;
      if (prefer < 2.4 && gate > 0.78) continue;
      scored.push({ i, j, dist, prefer });
    }
  }
  scored.sort((a, b) => b.prefer - a.prefer || a.dist - b.dist);
  const maxLinks = Math.max(48, Math.min(220, Math.floor(points.length * 2.4)));
  return scored.slice(0, maxLinks).map((row) => ({
    i: row.i,
    j: row.j,
    a: 0.14 + (1 - row.dist / 0.58) * 0.32,
    kind: row.i < base.length && row.j < base.length ? "word" : "dust",
  }));
}

export function WordSphere({ imagines }: { imagines: string[] }) {
  const base = useMemo(() => basePlace(sphereWords(imagines)), [imagines]);
  const dust = useMemo(() => makeDust(Math.max(90, base.length * 3)), [base.length]);
  const pairs = useMemo(() => linkPairs(base, dust), [base, dust]);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const wordEls = Array.from(root.querySelectorAll<HTMLElement>(".cyp-word"));
    const dustEls = Array.from(root.querySelectorAll<HTMLElement>(".cyp-dust"));
    const lineEls = Array.from(svg.querySelectorAll("line"));
    let angle = 0;
    let raf = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const dt = Math.min(48, now - last);
      last = now;
      // 한 바퀴 약 90초 — 붙여넣은 그림이 아니라 구 표면이 천천히 돈다
      angle += (dt / 1000) * ((Math.PI * 2) / 90);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);

      // x·y 같은 배율. 수학 y(+위) → CSS top은 아래로 커지므로 부호 반전
      const R = 47;
      const projWords = base.map((p) => {
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        const y = p.y;
        const depth = (z + 1) / 2;
        return {
          left: 50 + x * R,
          top: 50 - y * R,
          size: p.sizeBase + depth * (p.example ? 2.5 : 6),
          opacity: Math.min(1, (p.example ? 0.22 + depth * 0.28 : 0.42 + depth * 0.58) * p.glow),
          zIndex: Math.round(depth * 30) + 2,
          depth,
          glow: p.glow,
        };
      });

      const projDust = dust.map((p) => {
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        const y = p.y;
        const depth = (z + 1) / 2;
        return {
          left: 50 + x * R,
          top: 50 - y * R,
          size: p.size * (0.7 + depth * 0.6),
          opacity: Math.min(0.95, (0.25 + depth * 0.65) * p.glow),
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

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, dust, pairs]);

  return (
    <div className="cyp-sphere" aria-hidden ref={rootRef}>
      <div className="cyp-sphere-core" />
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
      {base.map((word) => (
        <span
          key={`${word.example ? "ex" : "real"}-${word.text}`}
          className={word.example ? "cyp-word example" : "cyp-word"}
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
