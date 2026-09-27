export function SceneThumb({ scene }: { scene: string }) {
  if (scene === "float") {
    return (
      <svg viewBox="0 0 88 72" aria-hidden>
        <ellipse cx="44" cy="58" rx="26" ry="6" fill="#06331c" />
        <path d="M18 40h52l-8 12H26z" fill="none" stroke="#7dffb4" strokeWidth="1" />
        <circle cx="44" cy="28" r="10" fill="none" stroke="#d8ffe8" strokeWidth="1" />
        <path d="M30 24c6-10 22-10 28 0" fill="none" stroke="#1cff8a" strokeWidth="1" />
      </svg>
    );
  }
  if (scene === "ritual") {
    return (
      <svg viewBox="0 0 88 72" aria-hidden>
        <path d="M16 58h56" stroke="#1cff8a" strokeWidth="1" />
        <path d="M28 58V34h32v24" fill="none" stroke="#b8ffd8" strokeWidth="1" />
        <path d="M36 58V42h16v16" fill="none" stroke="#7dffb4" strokeWidth="1" />
        <circle cx="44" cy="22" r="6" fill="none" stroke="#1cff8a" strokeWidth="1" />
      </svg>
    );
  }
  if (scene === "identity") {
    return (
      <svg viewBox="0 0 88 72" aria-hidden>
        <circle cx="44" cy="28" r="8" fill="none" stroke="#d8ffe8" strokeWidth="1" />
        <path d="M28 58c2-12 30-12 32 0" fill="none" stroke="#1cff8a" strokeWidth="1" />
        <path d="M58 20h14M65 13v14" stroke="#7dffb4" strokeWidth="1" />
      </svg>
    );
  }
  if (scene === "craft") {
    return (
      <svg viewBox="0 0 88 72" aria-hidden>
        <rect x="22" y="34" width="44" height="20" rx="2" fill="none" stroke="#b8ffd8" strokeWidth="1" />
        <path d="M30 34V26h28v8" fill="none" stroke="#1cff8a" strokeWidth="1" />
        <path d="M18 54h52" stroke="#7dffb4" strokeWidth="1" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 88 72" aria-hidden>
      <path d="M8 58c12-16 20-8 28-18s14-6 22 4 16 8 22-2" fill="none" stroke="#1cff8a" strokeWidth="1" />
      <circle cx="44" cy="30" r="8" fill="none" stroke="#d8ffe8" strokeWidth="1" />
      <path d="M44 38v10" stroke="#7dffb4" strokeWidth="1" />
    </svg>
  );
}
