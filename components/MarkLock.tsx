/** 목업 육각 잠상 — 제공 JPG에서 딴 기하 */
export function MarkLock({ variant = "landing" }: { variant?: "landing" | "born" }) {
  return (
    <div className={`mark-lock ${variant}`} aria-hidden>
      <img src="/poc-hex.png" alt="" width={120} height={120} />
    </div>
  );
}
