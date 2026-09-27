"use client";

import { useEffect, useRef } from "react";

/** 시드 고정 난수 — 새로고침해도 별 자리 안 흔들림 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/** 가장자리·여백 쪽을 더 자주 고른다. 가운데 폭격 금지. */
function edgeSpot(rand: () => number): { x: number; y: number } {
  // 가장자리 링에 더 많이
  if (rand() < 0.72) {
    const side = Math.floor(rand() * 4);
    const t = rand();
    const inset = 0.02 + rand() * 0.16;
    if (side === 0) return { x: t, y: inset };
    if (side === 1) return { x: t, y: 1 - inset };
    if (side === 2) return { x: inset, y: t };
    return { x: 1 - inset, y: t };
  }
  // 사이사이 — 중앙 코어는 거의 비움
  let x = rand();
  let y = rand();
  const nx = Math.abs(x - 0.5) * 2;
  const ny = Math.abs(y - 0.5) * 2;
  if (Math.min(nx, ny) < 0.28 && rand() > 0.12) {
    if (rand() < 0.5) x = rand() < 0.5 ? rand() * 0.22 : 0.78 + rand() * 0.22;
    else y = rand() < 0.5 ? rand() * 0.22 : 0.78 + rand() * 0.22;
  }
  return { x, y };
}

function paintStarSky(canvas: HTMLCanvasElement) {
  const parent = canvas.parentElement;
  if (!parent) return;
  const cssW = Math.max(1, parent.clientWidth);
  const cssH = Math.max(1, parent.clientHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.round(cssW * dpr);
  const h = Math.round(cssH * dpr);
  if (canvas.width === w && canvas.height === h && canvas.dataset.painted === "1") return;
  canvas.width = w;
  canvas.height = h;
  canvas.style.width = `${cssW}px`;
  canvas.style.height = `${cssH}px`;
  canvas.dataset.painted = "1";

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return;

  const rand = mulberry32(0xc003 ^ (w * 131 + h));

  // 1) 깊은 검정 바닥
  ctx.fillStyle = "#020403";
  ctx.fillRect(0, 0, w, h);

  // 2) 성운 — 옅은 초록 포인트만
  const blobs = [
    { x: 0.18, y: 0.22, rx: 0.36, ry: 0.28, a: 0.055 },
    { x: 0.78, y: 0.2, rx: 0.3, ry: 0.26, a: 0.04 },
    { x: 0.52, y: 0.72, rx: 0.4, ry: 0.32, a: 0.035 },
    { x: 0.28, y: 0.78, rx: 0.3, ry: 0.24, a: 0.045 },
  ];
  for (const blob of blobs) {
    const cx = blob.x * w;
    const cy = blob.y * h;
    const rx = blob.rx * w;
    const ry = blob.ry * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(40, 255, 140, ${blob.a})`);
    g.addColorStop(0.45, `rgba(12, 70, 40, ${blob.a * 0.35})`);
    g.addColorStop(0.8, `rgba(4, 20, 12, ${blob.a * 0.1})`);
    g.addColorStop(1, "rgba(2, 4, 3, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  const area = (w * h) / (dpr * dpr);

  // 3) 잔별 — 드문드문, 가장자리·사이사이. 십자/+ 없음.
  const tiny = Math.min(95, Math.floor(area * 0.00009));
  for (let i = 0; i < tiny; i++) {
    const spot = edgeSpot(rand);
    const x = spot.x * w;
    const y = spot.y * h;
    const bright = rand();
    const r = (bright > 0.85 ? 0.85 : 0.4) * dpr;
    const alpha = bright > 0.85 ? 0.55 : 0.12 + bright * 0.2;
    const green = bright > 0.92;
    ctx.fillStyle = green
      ? `rgba(140, 255, 190, ${alpha})`
      : `rgba(210, 235, 220, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // 4) 예쁜 별 — 흰 심 + 초록 bloom만 (가장자리·여백)
  const pretty = Math.min(28, Math.max(12, Math.floor(area * 0.000028)));
  for (let i = 0; i < pretty; i++) {
    const spot = edgeSpot(rand);
    const x = spot.x * w;
    const y = spot.y * h;
    const scale = (0.7 + rand() * 1.1) * dpr;
    const green = rand() > 0.35;
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, scale * 14);
    if (green) {
      bloom.addColorStop(0, "rgba(255, 255, 255, 0.95)");
      bloom.addColorStop(0.12, "rgba(200, 255, 220, 0.7)");
      bloom.addColorStop(0.35, "rgba(40, 255, 150, 0.28)");
      bloom.addColorStop(0.7, "rgba(28, 255, 138, 0.08)");
      bloom.addColorStop(1, "rgba(28, 255, 138, 0)");
    } else {
      bloom.addColorStop(0, "rgba(255, 255, 255, 0.9)");
      bloom.addColorStop(0.15, "rgba(230, 245, 235, 0.45)");
      bloom.addColorStop(0.5, "rgba(180, 220, 200, 0.1)");
      bloom.addColorStop(1, "rgba(180, 220, 200, 0)");
    }
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, scale * 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
    ctx.beginPath();
    ctx.arc(x, y, Math.max(0.6, scale * 0.9), 0, Math.PI * 2);
    ctx.fill();
  }

  // 5) 그레인 — 아주 약하게
  ctx.save();
  ctx.globalAlpha = 0.035;
  for (let i = 0; i < Math.floor(area * 0.015); i++) {
    const x = rand() * w;
    const y = rand() * h;
    const g = 70 + Math.floor(rand() * 90);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.4)}, ${g}, ${Math.floor(g * 0.5)})`;
    ctx.fillRect(x, y, dpr, dpr);
  }
  ctx.restore();
}

export function GroveBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let frame = 0;
    const paint = () => {
      canvas.dataset.painted = "";
      paintStarSky(canvas);
    };
    paint();
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(paint);
    });
    if (canvas.parentElement) ro.observe(canvas.parentElement);
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, []);

  return (
    <div className="grove-bg" aria-hidden>
      <div className="grove-bg-nebula" />
      {/* 캔버스는 배경 별만 — 구 장식·번호·콜사인 안 그림 */}
      <canvas ref={ref} className="grove-bg-canvas" />
    </div>
  );
}

export function ExperimentKicker() {
  return <p className="kicker">CYP3 | PROOF OF COEXISTENCE EXPERIMENT - 001</p>;
}

export function StepMark({ step }: { step: 1 | 2 }) {
  return (
    <p className="step-mark" aria-label={`${step} / 2`}>
      <i className={step === 1 ? "on" : ""} />
      <i className={step === 2 ? "on" : ""} />
      <span>
        {step} / 2
      </span>
    </p>
  );
}
