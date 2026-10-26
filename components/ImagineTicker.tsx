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

    const source = signature ? signature.split("\n") : ["Waiting for imaginings…"];
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const size = getComputedStyle(row).fontSize;
    track.replaceChildren();

    type Item = { el: HTMLSpanElement; width: number };
    const items: Item[] = [];
    let next = 0;

    const append = () => {
      const span = document.createElement("span");
      span.style.fontSize = size;
      span.textContent = `· ${source[next % source.length]}`;
      next += 1;
      track.appendChild(span);
      items.push({ el: span, width: Math.max(span.offsetWidth + GAP, 8) });
    };

    const contentWidth = () => items.reduce((sum, item) => sum + item.width, 0);

    const fill = (view: number) => {
      const need = view * 2 + 240;
      let guard = 0;
      while (guard < source.length * 4 + 8) {
        if (items.length >= 3 && contentWidth() >= need) break;
        append();
        guard += 1;
      }
    };

    let view = row.clientWidth >= 40 ? row.clientWidth : 320;
    fill(view);

    if (reduced) {
      track.style.transform = "translate3d(0,0,0)";
      return;
    }

    let startX = view;
    let anim: Animation | null = null;

    const play = (from: number) => {
      startX = from;
      const distance = 120000;
      anim = track.animate(
        [
          { transform: `translate3d(${from}px,0,0)` },
          { transform: `translate3d(${from - distance}px,0,0)` },
        ],
        { duration: (distance / Math.max(speed, 1)) * 1000, easing: "linear", fill: "forwards" },
      );
    };

    const currentX = () => {
      const t = typeof anim?.currentTime === "number" ? anim.currentTime : 0;
      return startX - (t / 1000) * speed;
    };

    play(view);

    const pump = () => {
      const nextView = row.clientWidth;
      if (nextView >= 40) view = nextView;
      let x = currentX();
      let moved = false;
      let guard = 0;
      while (items.length >= 2 && guard < 16) {
        const first = items[0]!;
        if (x + first.width > -8) break;
        x += first.width;
        first.el.remove();
        items.shift();
        append();
        moved = true;
        guard += 1;
      }
      let extra = 0;
      while (x + contentWidth() < view * 2 + 240 && extra < 8) {
        append();
        moved = true;
        extra += 1;
      }
      if (moved) {
        anim?.cancel();
        play(x);
      }
    };

    const timer = window.setInterval(pump, 180);
    return () => {
      window.clearInterval(timer);
      anim?.cancel();
    };
  }, [signature, speed]);

  return (
    <div className="cyp-ticker-row" ref={rowRef}>
      <div className="cyp-ticker-track" />
    </div>
  );
}

export function ImagineTicker({ lines }: { lines: string[] }) {
  // 새로고침할 때만 다시 뽑는다. 같은 문장 묶음이 다시 오면 순서를 유지한다.
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
    const size = fontSizePx();
    bag.current = {
      sig,
      a,
      b,
      speed: Math.max(24, measure(cleaned, size) / LOOP_SECONDS),
    };
  }
  const rowA = bag.current?.a ?? (cleaned.length ? cleaned : ["Waiting for imaginings…"]);
  const rowB = bag.current?.b ?? rowA;
  const speed = bag.current?.speed ?? 48;

  return (
    <div className="cyp-ticker" aria-hidden>
      <TickerRow lines={rowA} speed={speed} />
      <TickerRow lines={rowB} speed={speed} />
    </div>
  );
}
