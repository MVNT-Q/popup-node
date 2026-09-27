"use client";

import { useMemo } from "react";
import { sphereWords, type SphereWord } from "@/lib/words";

type Placed = SphereWord & {
  left: number;
  top: number;
  size: number;
  opacity: number;
  z: number;
  x3: number;
  y3: number;
  z3: number;
};

function place(words: SphereWord[]): Placed[] {
  const n = words.length || 1;
  return words.map((word, index) => {
    const golden = index * 2.399963;
    const y = 1 - (index / Math.max(n - 1, 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    const depth = (z + 1) / 2;
    // POC_8: 얇은 노드·영어 단어. 구는 크고 성기게.
    const size = word.example ? 9 + depth * 3 : 11 + Math.min(8, word.weight * 2) + depth * 4;
    return {
      ...word,
      left: 50 + x * 46,
      top: 50 + y * 44,
      size,
      opacity: word.example ? 0.14 + depth * 0.14 : 0.42 + depth * 0.55,
      z: Math.round(depth * 30),
      x3: x,
      y3: y,
      z3: z,
    };
  });
}

function links(placed: Placed[]) {
  const lines: { x1: number; y1: number; x2: number; y2: number; a: number }[] = [];
  for (let i = 0; i < placed.length; i++) {
    for (let j = i + 1; j < placed.length; j++) {
      const a = placed[i];
      const b = placed[j];
      const dx = a.x3 - b.x3;
      const dy = a.y3 - b.y3;
      const dz = a.z3 - b.z3;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist > 0.55) continue;
      lines.push({
        x1: a.left,
        y1: a.top,
        x2: b.left,
        y2: b.top,
        a: 0.08 + (1 - dist / 0.55) * 0.18,
      });
    }
  }
  return lines.slice(0, 120);
}

export function WordSphere({ imagines }: { imagines: string[] }) {
  const placed = useMemo(() => place(sphereWords(imagines)), [imagines]);
  const wires = useMemo(() => links(placed), [placed]);

  return (
    <div className="cyp-sphere" aria-hidden>
      <div className="cyp-sphere-core" />
      <svg className="cyp-sphere-wires" viewBox="0 0 100 100" preserveAspectRatio="none">
        {wires.map((line, index) => (
          <line
            key={index}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={`rgba(28,255,138,${line.a})`}
            strokeWidth="0.12"
          />
        ))}
      </svg>
      {placed.map((word) => (
        <span
          key={`${word.example ? "ex" : "real"}-${word.text}`}
          className={word.example ? "cyp-word example" : "cyp-word"}
          style={{
            left: `${word.left}%`,
            top: `${word.top}%`,
            fontSize: word.size,
            opacity: word.opacity,
            zIndex: word.z,
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
