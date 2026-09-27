"use client";

import { useEffect, useMemo, useRef } from "react";
import { sphereWords, type SphereWord } from "@/lib/words";

type Base = SphereWord & {
  x: number;
  y: number;
  z: number;
  sizeBase: number;
};

type Pair = { i: number; j: number; a: number };

function basePlace(words: SphereWord[]): Base[] {
  const n = words.length || 1;
  return words.map((word, index) => {
    const golden = index * 2.399963;
    const y = 1 - (index / Math.max(n - 1, 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    // POC_8: 얇은 노드·영어 단어. 구는 크고 성기게.
    const sizeBase = word.example ? 9 : 11 + Math.min(8, word.weight * 2);
    return { ...word, x, y, z, sizeBase };
  });
}

function linkPairs(base: Base[]): Pair[] {
  const pairs: Pair[] = [];
  for (let i = 0; i < base.length; i++) {
    for (let j = i + 1; j < base.length; j++) {
      const a = base[i];
      const b = base[j];
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dz = a.z - b.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0.55) continue;
      pairs.push({
        i,
        j,
        a: 0.08 + (1 - dist / 0.55) * 0.18,
      });
      if (pairs.length >= 120) return pairs;
    }
  }
  return pairs;
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

      const proj = base.map((p) => {
        const x = p.x * cos + p.z * sin;
        const z = -p.x * sin + p.z * cos;
        const y = p.y;
        const depth = (z + 1) / 2;
        return {
          left: 50 + x * 46,
          top: 50 + y * 44,
          size: p.example ? p.sizeBase + depth * 3 : p.sizeBase + depth * 4,
          opacity: p.example ? 0.14 + depth * 0.14 : 0.42 + depth * 0.55,
          zIndex: Math.round(depth * 30),
          depth,
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
      }

      for (let k = 0; k < pairs.length; k++) {
        const line = lineEls[k];
        const pair = pairs[k];
        if (!line || !pair) continue;
        const a = proj[pair.i];
        const b = proj[pair.j];
        if (!a || !b) continue;
        const fade = 0.55 + ((a.depth + b.depth) / 2) * 0.45;
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
        preserveAspectRatio="none"
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
            strokeWidth="0.12"
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
