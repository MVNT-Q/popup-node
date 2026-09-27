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

  // 1) 깊은 검정 바닥 — POC처럼 검은 바탕이 주인공
  ctx.fillStyle = "#020403";
  ctx.fillRect(0, 0, w, h);

  // 2) 성운 — 옅은 초록 기운만 (짙은 구름·섬유 줄임)
  const blobs = [
    { x: 0.22, y: 0.28, rx: 0.42, ry: 0.32, a: 0.07 },
    { x: 0.72, y: 0.22, rx: 0.36, ry: 0.3, a: 0.055 },
    { x: 0.5, y: 0.55, rx: 0.5, ry: 0.4, a: 0.045 },
    { x: 0.3, y: 0.75, rx: 0.38, ry: 0.28, a: 0.06 },
    { x: 0.8, y: 0.72, rx: 0.32, ry: 0.26, a: 0.05 },
  ];
  for (const blob of blobs) {
    const cx = blob.x * w;
    const cy = blob.y * h;
    const rx = blob.rx * w;
    const ry = blob.ry * h;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(rx, ry));
    g.addColorStop(0, `rgba(40, 255, 140, ${blob.a})`);
    g.addColorStop(0.4, `rgba(12, 70, 40, ${blob.a * 0.4})`);
    g.addColorStop(0.75, `rgba(4, 20, 12, ${blob.a * 0.12})`);
    g.addColorStop(1, "rgba(2, 4, 3, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  // 3) 먼지 노이즈 — 거의 안 보이게
  const nw = Math.max(48, Math.floor(w / 10));
  const nh = Math.max(72, Math.floor(h / 10));
  const dust = ctx.createImageData(nw, nh);
  for (let i = 0; i < dust.data.length; i += 4) {
    const n = rand();
    const v = n > 0.88 ? Math.floor((n - 0.88) * 40) : 0;
    dust.data[i] = Math.floor(v * 0.3);
    dust.data[i + 1] = Math.floor(v * 1.0);
    dust.data[i + 2] = Math.floor(v * 0.45);
    dust.data[i + 3] = v > 0 ? 18 + Math.floor(rand() * 22) : 0;
  }
  const off = document.createElement("canvas");
  off.width = nw;
  off.height = nh;
  const octx = off.getContext("2d");
  if (octx) {
    octx.putImageData(dust, 0, 0);
    ctx.save();
    ctx.globalAlpha = 0.22;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, 0, 0, w, h);
    ctx.restore();
  }

  // 4) 배경 잔별 — POC처럼 듬성듬성 (구 표면 점과 구분)
  const area = (w * h) / (dpr * dpr);
  const count = Math.min(420, Math.floor(area * 0.00042));
  for (let i = 0; i < count; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const bright = rand();
    const r = (bright > 0.96 ? 1.4 : bright > 0.85 ? 0.9 : 0.45) * dpr;
    const alpha = bright > 0.96 ? 0.75 : bright > 0.8 ? 0.45 : 0.14 + bright * 0.22;
    const green = bright > 0.9;
    ctx.fillStyle = green
      ? `rgba(140, 255, 190, ${alpha})`
      : `rgba(200, 230, 210, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    if (bright > 0.985) {
      ctx.strokeStyle = `rgba(100, 255, 170, ${alpha * 0.5})`;
      ctx.lineWidth = 0.55 * dpr;
      ctx.beginPath();
      ctx.moveTo(x - r * 4, y);
      ctx.lineTo(x + r * 4, y);
      ctx.moveTo(x, y - r * 4);
      ctx.lineTo(x, y + r * 4);
      ctx.stroke();
    }
  }

  // 5) 그레인 — 아주 약하게
  ctx.save();
  ctx.globalAlpha = 0.04;
  for (let i = 0; i < Math.floor(area * 0.02); i++) {
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
      {/* 캔버스는 미세 별만 — 번호·콜사인 안 그림 */}
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
