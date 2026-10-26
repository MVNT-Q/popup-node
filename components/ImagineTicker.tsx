"use client";

import { useEffect, useRef } from "react";

const GAP = 72;
/** 문장 묶음이 한 바퀴 도는 시간. 두 줄·두 탭이 같은 픽셀 속도를 쓴다. */
const LOOP_SECONDS = 161;

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

function shuffle(lines: string[]) {
  const arr = [...lines];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i]!;
    arr[i] = arr[j]!;
    arr[j] = tmp;
  }
  return arr;
}

function fontSizePx() {
  if (typeof window === "undefined") return 15;
  if (window.matchMedia("(max-width: 800px)").matches) return 12;
  if (window.matchMedia("(orientation: landscape) and (max-height: 520px)").matches) return 12;
  return 15;
}

function measure(lines: string[], size: number) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) ctx.font = `400 ${size}px "IBM Plex Sans KR", sans-serif`;
  return lines.reduce((sum, line) => {
    const text = `· ${line}`;
    return sum + (ctx ? ctx.measureText(text).width : text.length * size * 0.55) + GAP;
  }, 0);
}

function TickerRow({ lines, speed }: { lines: string[]; speed: number }) {
  const rowRef = useRef<HTMLDivElement>(null);
  const signature = lines.join("\n");

  useEffect(() => {
    const row = rowRef.current;
    const track = row?.querySelector(".cyp-ticker-track");
    if (!row || !(track instanceof HTMLElement)) return;

    const source = signature.split("\n").filter(Boolean);
    if (!source.length) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = getComputedStyle(row).fontSize;
    track.replaceChildren();

    type Item = { el: HTMLSpanElement; left: number; width: number };
    const items: Item[] = [];
    let next = 0;
    let placed = 0;

    const append = () => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.textContent = `· ${source[next % source.length]}`;
      span.style.left = `${placed}px`;
      next += 1;
      track.appendChild(span);
      const width = Math.max(span.offsetWidth + GAP, 8);
      items.push({ el: span, left: placed, width });
      placed += width;
    };

    let view = row.clientWidth >= 40 ? row.clientWidth : 320;
    placed = reduced ? 0 : view;
    const ahead = view * 3 + 640;
    let guard = 0;
    while (placed < (reduced ? view : view + ahead) && guard < source.length * 4 + 8) {
      append();
      guard += 1;
    }

    if (reduced) return;

    const speedPx = Math.max(speed, 1);
    const distance = 240000;
    const anim = track.animate(
      [
        { transform: "translate3d(0,0,0)" },
        { transform: `translate3d(${-distance}px,0,0)` },
      ],
      { duration: (distance / speedPx) * 1000, easing: "linear", fill: "forwards" },
    );

    const pump = () => {
      const travel = (Number(anim.currentTime) / 1000) * speedPx;
      let drop = 0;
      while (items.length > 2 && drop < 8) {
        const first = items[0]!;
        if (first.left + first.width - travel > -24) break;
        first.el.remove();
        items.shift();
        drop += 1;
      }
      let extra = 0;
      while (placed < travel + view * 3 + 640 && extra < 4) {
        append();
        extra += 1;
      }
    };

    const onResize = () => {
      if (row.clientWidth >= 40) view = row.clientWidth;
    };
    window.addEventListener("resize", onResize);
    const timer = window.setInterval(pump, 400);
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearInterval(timer);
      anim.cancel();
    };
  }, [signature, speed]);

  return (
    <div className="cyp-ticker-row" ref={rowRef}>
      <div className="cyp-ticker-track" />
    </div>
  );
}

export function ImagineTicker({ lines }: { lines: string[] }) {
  // 새로고침할 때만 다시 뽑는다. 문장이 생기기 전에는 대기 문구를 그리지 않는다.
  const bag = useRef<{ sig: string; a: string[]; b: string[]; speed: number } | null>(null);
  const cleaned = cleanLines(lines);
  const sig = [...cleaned].sort().join("\n");
  if (cleaned.length && bag.current?.sig !== sig && typeof document !== "undefined") {
    const a = shuffle(cleaned);
    let b = shuffle(cleaned);
    let guard = 0;
    while (cleaned.length > 1 && b.join("\n") === a.join("\n") && guard < 4) {
      b = shuffle(cleaned);
      guard += 1;
    }
    bag.current = {
      sig,
      a,
      b,
      speed: Math.max(24, measure(cleaned, fontSizePx()) / LOOP_SECONDS),
    };
  }
  if (!bag.current) return null;

  return (
    <div className="cyp-ticker" aria-hidden>
      <TickerRow lines={bag.current.a} speed={bag.current.speed} />
      <TickerRow lines={bag.current.b} speed={bag.current.speed} />
    </div>
  );
}
