"use client";

import { useMemo } from "react";
import { sphereWords, type SphereWord } from "@/lib/words";

function place(words: SphereWord[]) {
  const n = words.length || 1;
  return words.map((word, index) => {
    const t = index / n;
    const golden = index * 2.399963;
    const y = 1 - (index / Math.max(n - 1, 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const x = Math.cos(golden) * radius;
    const z = Math.sin(golden) * radius;
    const depth = (z + 1) / 2;
    const size = word.example ? 11 : 12 + Math.min(10, word.weight * 2);
    return {
      ...word,
      left: 50 + x * 38,
      top: 50 + y * 34,
      size,
      opacity: word.example ? 0.22 + depth * 0.15 : 0.45 + depth * 0.55,
      z: Math.round(depth * 20),
      rotate: ((t * 40) % 20) - 10,
    };
  });
}

export function WordSphere({ imagines }: { imagines: string[] }) {
  const placed = useMemo(() => place(sphereWords(imagines)), [imagines]);

  return (
    <div className="cyp-sphere" aria-hidden>
      <div className="cyp-sphere-core" />
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
            transform: `translate(-50%, -50%) rotate(${word.rotate}deg)`,
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}
