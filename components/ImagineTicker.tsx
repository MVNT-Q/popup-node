"use client";

import { useEffect, useRef } from "react";

const GAP = 72;

function cleanLines(lines: string[]) {
  const cleaned: string[] = [];
  const seen = new Set<string>();
  for (const raw of lines) {
    const line = raw.trim().replace(/\s+/g, " ");
    if (line.length < 2 || seen.has(line)) continue;
    seen.add(line);
    cleaned.push(line);
  }
  return cleaned;
}

function TickerRow({
  lines,
  loopSeconds,
}: {
  lines: string[];
  loopSeconds: number;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const signature = lines.join("\n");

  useEffect(() => {
    const row = rowRef.current;
    const track = trackRef.current;
    if (!row || !track) return;
    const source = signature ? signature.split("\n") : ["Waiting for imaginings…"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const style = getComputedStyle(track);
    const font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.font = font;
    const widthOf = (text: string) => (ctx ? ctx.measureText(text).width : text.length * 9);
    const full = source.reduce((sum, line) => sum + widthOf(`· ${line}`) + GAP, 0);
    const speed = full / loopSeconds;

    track.replaceChildren();
    let next = 0;
    const append = () => {
      const span = document.createElement("span");
      span.textContent = `· ${source[next % source.length]}`;
      next += 1;
      track.appendChild(span);
    };
    const fill = () => {
      const need = Math.max(row.clientWidth, 280) + 48;
      let guard = 0;
      while (track.scrollWidth < need && guard < source.length + 4) {
        append();
        guard += 1;
      }
    };
    fill();
    if (reduced) return;

    let offset = 0;
    let last = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      offset -= speed * dt;
      const first = track.firstElementChild as HTMLElement | null;
      if (first && -offset >= first.offsetWidth + GAP) {
        offset += first.offsetWidth + GAP;
        first.remove();
        append();
      }
      track.style.transform = `translate3d(${offset}px,0,0)`;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [signature, loopSeconds]);

  return (
    <div className="cyp-ticker-row" ref={rowRef}>
      <div className="cyp-ticker-track" ref={trackRef} />
    </div>
  );
}

export function ImagineTicker({ lines }: { lines: string[] }) {
  // 저장된 IMAGINE 문장 두 줄. 화면에 보이는 만큼만 붙여 두어 폰에서 긴 레이어가 사라지지 않게.
  const cleaned = cleanLines(lines);
  const rowA = cleaned.length ? cleaned : ["Waiting for imaginings…"];
  const rowB = cleaned.length > 1 ? [...cleaned].reverse() : rowA;

  return (
    <div className="cyp-ticker" aria-hidden>
      <TickerRow lines={rowA} loopSeconds={161} />
      <TickerRow lines={rowB} loopSeconds={196} />
    </div>
  );
}
