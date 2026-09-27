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

  // 2) 초록 성운 — 큰 구름 여러 겹
  const blobs = [
    { x: 0.18, y: 0.22, rx: 0.55, ry: 0.38, a: 0.22 },
    { x: 0.72, y: 0.18, rx: 0.48, ry: 0.42, a: 0.18 },
    { x: 0.5, y: 0.48, rx: 0.7, ry: 0.55, a: 0.14 },
    { x: 0.28, y: 0.72, rx: 0.5, ry: 0.4, a: 0.2 },
    { x: 0.78, y: 0.78, rx: 0.45, ry: 0.36, a: 0.16 },
    { x: 0.08, y: 0.5, rx: 0.35, ry: 0.55, a: 0.12 },
    { x: 0.92, y: 0.42, rx: 0.32, ry: 0.48, a: 0.11 },
  ];
  for (const blob of blobs) {
    const cx = blob.x * w;
    const cy = blob.y * h;
    const rx = blob.rx * w;
    const ry = blob.ry * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(40, 255, 140, ${blob.a})`);
    g.addColorStop(0.35, `rgba(12, 90, 48, ${blob.a * 0.55})`);
    g.addColorStop(0.7, `rgba(4, 28, 14, ${blob.a * 0.2})`);
    g.addColorStop(1, "rgba(2, 4, 3, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) 가느다란 성운 실 — 목업의 섬유질 느낌
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (let i = 0; i < 14; i++) {
    const x0 = rand() * w;
    const y0 = rand() * h;
    const x1 = x0 + (rand() - 0.5) * w * 0.55;
    const y1 = y0 + (rand() - 0.5) * h * 0.35;
    const grad = ctx.createLinearGradient(x0, y0, x1, y1);
    const a = 0.04 + rand() * 0.07;
    grad.addColorStop(0, "rgba(28,255,138,0)");
    grad.addColorStop(0.5, `rgba(60,255,160,${a})`);
    grad.addColorStop(1, "rgba(28,255,138,0)");
    ctx.strokeStyle = grad;
    ctx.lineWidth = (8 + rand() * 28) * dpr;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo((x0 + x1) / 2 + (rand() - 0.5) * 80 * dpr, (y0 + y1) / 2, x1, y1);
    ctx.stroke();
  }
  ctx.restore();

  // 4) 저해상도 먼지 노이즈 → 확대 (성운 입자)
  const nw = Math.max(64, Math.floor(w / 6));
  const nh = Math.max(96, Math.floor(h / 6));
  const dust = ctx.createImageData(nw, nh);
  for (let i = 0; i < dust.data.length; i += 4) {
    const n = rand();
    const v = n > 0.62 ? Math.floor((n - 0.62) * 90) : 0;
    dust.data[i] = Math.floor(v * 0.35);
    dust.data[i + 1] = Math.floor(v * 1.1);
    dust.data[i + 2] = Math.floor(v * 0.55);
    dust.data[i + 3] = v > 0 ? 40 + Math.floor(rand() * 50) : 0;
  }
  const off = document.createElement("canvas");
  off.width = nw;
  off.height = nh;
  const octx = off.getContext("2d");
  if (octx) {
    octx.putImageData(dust, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);
    ctx.restore();
  }

  // 5) 배경 미세 별 밀집
  const area = (w * h) / (dpr * dpr);
  const count = Math.min(4200, Math.floor(area * 0.0042));
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const bright = rand();
    const r = (bright > 0.97 ? 1.6 : bright > 0.9 ? 1.1 : bright > 0.7 ? 0.7 : 0.4) * dpr;
    const alpha = bright > 0.97 ? 0.95 : bright > 0.85 ? 0.7 : 0.2 + bright * 0.35;
    const green = bright > 0.92;
    ctx.fillStyle = green
      ? `rgba(180, 255, 210, ${alpha})`
      : `rgba(230, 255, 240, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (bright > 0.985) {
      ctx.strokeStyle = `rgba(120, 255, 180, ${alpha * 0.55})`;
      ctx.lineWidth = 0.6 * dpr;
      ctx.beginPath();
      ctx.moveTo(x - r * 5, y);
      ctx.lineTo(x + r * 5, y);
      ctx.moveTo(x, y - r * 5);
      ctx.lineTo(x, y + r * 5);
      ctx.stroke();
    }
  }

  // 6) 미세 그레인 — 전 픽셀 스캔 대신 점 흩기
  ctx.save();
  ctx.globalAlpha = 0.12;
  for (let i = 0; i < Math.floor(area * 0.08); i++) {
    const x = rand() * w;
    const y = rand() * h;
    const g = 80 + Math.floor(rand() * 120);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.45)}, ${g}, ${Math.floor(g * 0.55)})`;
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
