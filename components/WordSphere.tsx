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

type Pair = { i: number; j: number; a: number };

function frac(seed: number) {
  const t = Math.sin(seed * 12.9898) * 43758.5453;
  return t - Math.floor(t);
}

function basePlace(words: SphereWord[]): Base[] {
  const n = words.length || 1;
  return words.map((word, index) => {
    // 균일 피보나치가 아니라 성긴 성단처럼 흔든다
    const r1 = frac(index + 1.7);
    const r2 = frac(index * 3.1 + 0.4);
    const r3 = frac(index * 7.3 + 2.2);
    const golden = index * 2.399963 + r1 * 1.1;
    const yRaw = 1 - (index / Math.max(n - 1, 1)) * 2;
    const y = Math.max(-1, Math.min(1, yRaw * (0.78 + r2 * 0.45) + (r3 - 0.5) * 0.22));
    const shell = 0.62 + r1 * 0.5;
    const radius = Math.sqrt(Math.max(0, 1 - y * y)) * shell;
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    // 무게·난수로 점 크기·발광을 크게 갈라 둔다
    const hub = !word.example && word.weight >= 2;
    const sizeBase = word.example
      ? 6 + r2 * 5
      : hub
        ? 16 + Math.min(14, word.weight * 3) + r1 * 6
        : 9 + Math.min(10, word.weight * 2.2) + r3 * 7;
    const glow = word.example ? 0.35 + r1 * 0.25 : hub ? 0.95 + r2 * 0.35 : 0.55 + r3 * 0.45;
    return { ...word, x, y, z, sizeBase, glow };
  });
}

function linkPairs(base: Base[]): Pair[] {
  // 가까운 쌍 일부만. 허브는 더 잇고, 나머지는 점만 남긴다.
  const scored: { i: number; j: number; dist: number; prefer: number }[] = [];
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      const a = base[i];
      const b = base[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0.72 || dist < 0.08) continue;
      const prefer = (a.example ? 0 : a.weight) + (b.example ? 0 : b.weight) + (2 - dist);
      const gate = frac(i * 17 + j * 31 + 0.9);
      if (prefer < 2.2 && gate > 0.38) continue;
      if (prefer < 3.4 && gate > 0.62) continue;
      scored.push({ i, j, dist, prefer });
    }
  }
  scored.sort((a, b) => b.prefer - a.prefer || a.dist - b.dist);
  const maxLinks = Math.max(8, Math.min(36, Math.floor(base.length * 0.9)));
  return scored.slice(0, maxLinks).map((row) => ({
    i: row.i,
    j: row.j,
    a: 0.06 + (1 - row.dist / 0.72) * 0.16,
  }));
}

export function WordSphere({ imagines }: { imagines: string[] }) {
  const base = useMemo(() => basePlace(sphereWords(imagines)), [imagines]);
  const pairs = useMemo(() => linkPairs(base), [base]);
  const rootRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const svg = svgRef.current;
    if (!root || !svg) return;

    const wordEls = Array.from(root.querySelectorAll<HTMLElement>(".cyp-word"));
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

      // x·y 같은 배율 → 납작 타원이 아니라 원에 가깝게. 목업처럼 더 크게.
      const R = 46;
      const proj = base.map((p) => {
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        const y = p.y;
        const depth = (z + 1) / 2;
        return {
          left: 50 + x * R,
          top: 50 + y * R,
          size: p.sizeBase + depth * (p.example ? 2.5 : 5),
          opacity: Math.min(1, (p.example ? 0.12 + depth * 0.16 : 0.28 + depth * 0.62) * p.glow),
          zIndex: Math.round(depth * 30),
          depth,
          glow: p.glow,
        };
      });

      for (let i = 0; i < wordEls.length; i++) {
        const el = wordEls[i];
        const p = proj[i];
        if (!el || !p) continue;
        el.style.left = `${p.left}%`;
        el.style.top = `${p.top}%`;
        el.style.fontSize = `${p.size}px`;
        el.style.opacity = String(p.opacity);
        el.style.zIndex = String(p.zIndex);
        el.style.setProperty("--word-glow", String(0.2 + p.glow * 0.55));
      }

      for (let k = 0; k < pairs.length; k++) {
        const line = lineEls[k];
        const pair = pairs[k];
        if (!line || !pair) continue;
        const a = proj[pair.i];
        const b = proj[pair.j];
        if (!a || !b) continue;
        const fade = 0.45 + ((a.depth + b.depth) / 2) * 0.5;
        line.setAttribute("x1", String(a.left));
        line.setAttribute("y1", String(a.top));
        line.setAttribute("x2", String(b.left));
        line.setAttribute("y2", String(b.top));
        line.setAttribute("stroke", `rgba(28,255,138,${pair.a * fade})`);
      }

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [base, pairs]);

  return (
    <div className="cyp-sphere" aria-hidden ref={rootRef}>
      <div className="cyp-sphere-core" />
      <svg
        className="cyp-sphere-wires"
        viewBox="0 0 100 100"
        preserveAspectRatio="xMidYMid meet"
        ref={svgRef}
      >
        {pairs.map((_, index) => (
          <line
            key={index}
            x1="0"
            y1="0"
            x2="0"
            y2="0"
            stroke="rgba(28,255,138,0.1)"
            strokeWidth="0.1"
          />
        ))}
      </svg>
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
