"use client";

import { useEffect, useRef } from "react";

/** 시드 고정 난수 — 새로고침해도 성운 결이 안 흔들림 */
function mulberry32(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

type Blob = { x: number; y: number; rx: number; ry: number; a: number };

/** 성운 타원 안에만 먼지 점을 뿌린다. 가장자리 장식 별 금지. */
function inNebula(nx: number, ny: number, blobs: Blob[]) {
  for (const blob of blobs) {
    const dx = (nx - blob.x) / blob.rx;
    const dy = (ny - blob.y) / blob.ry;
    if (dx * dx + dy * dy <= 0.85) return true;
  }
  return false;
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

  // 사진 백플레이트가 보이도록 투명 캔버스 — 성운·먼지만 아주 옅게
  const ctx = canvas.getContext("2d", { alpha: true });
  if (!ctx) return;

  const rand = mulberry32(0xc003 ^ (w * 131 + h));
  ctx.clearRect(0, 0, w, h);

  // 성운 — 옅은 초록 기운만 (노드처럼 빛나는 점 없음). 사진 위를 가리지 않게 약하게
  const blobs: Blob[] = [
    { x: 0.22, y: 0.28, rx: 0.42, ry: 0.32, a: 0.035 },
    { x: 0.72, y: 0.22, rx: 0.36, ry: 0.3, a: 0.028 },
    { x: 0.5, y: 0.55, rx: 0.5, ry: 0.4, a: 0.022 },
    { x: 0.3, y: 0.75, rx: 0.38, ry: 0.28, a: 0.03 },
    { x: 0.8, y: 0.72, rx: 0.32, ry: 0.26, a: 0.025 },
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

  const area = (w * h) / (dpr * dpr);

  // 3) 아주 작은 먼지 — 성운 안에만. 가장자리·여백에 큰 점/bloom 별 두지 않음
  const dust = Math.min(140, Math.floor(area * 0.00011));
  let placed = 0;
  let guard = 0;
  while (placed < dust && guard < dust * 8) {
    guard += 1;
    const nx = rand();
    const ny = rand();
    if (!inNebula(nx, ny, blobs)) continue;
    const x = nx * w;
    const y = ny * h;
    const bright = rand();
    const r = (0.25 + bright * 0.35) * dpr;
    const alpha = 0.08 + bright * 0.18;
    ctx.fillStyle =
      bright > 0.7
        ? `rgba(140, 255, 190, ${alpha})`
        : `rgba(200, 230, 210, ${alpha * 0.85})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    placed += 1;
  }

  // 4) 그레인 — 아주 약하게
  ctx.save();
  ctx.globalAlpha = 0.03;
  for (let i = 0; i < Math.floor(area * 0.012); i++) {
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
      {/* 풀블리드 별하늘 사진 — 성좌·스피어·제목·틱커 뒤 백플레이트 */}
      <img
        className="grove-bg-photo"
        src="/sky-field.jpg"
        alt=""
        draggable={false}
      />
      <div className="grove-bg-nebula" />
      {/* 캔버스는 성운+먼지뿐 — 장식 별·번호·콜사인 안 그림 */}
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
