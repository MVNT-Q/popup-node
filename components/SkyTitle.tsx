/** POC_7·8 헤더 — Orbitron 디스플레이, 콜렉티브 O는 링 */

function withRingO(text: string) {
  return text.split("").map((ch, index) =>
    ch === "O" || ch === "o" ? (
      <span key={index} className="cyp-ring-o">
        O
      </span>
    ) : (
      <span key={index}>{ch === " " ? "\u00a0" : ch}</span>
    ),
  );
}

export function SkyTitle({
  mode,
  nodes,
  connections,
}: {
  mode: "grove" | "collective";
  nodes: number;
  connections: number;
}) {
  return (
    <div className="cyp-sky-head-main">
      <p className="cyp-sky-kicker">CYP3 | PROOF OF COEXISTENCE EXPERIMENT - 001</p>
      {mode === "grove" ? (
        <>
          <h1 className="cyp-sky-hero cyp-display">NODE GROVE</h1>
          <p className="cyp-sky-ko">노드 그로브</p>
          <p className="cyp-sky-meta">
            {nodes} NODES · {connections} CONNECTIONS
          </p>
        </>
      ) : (
        <h1 className="cyp-sky-hero cyp-display cyp-display-collective" aria-label="COLLECTIVE IMAGINATION">
          <span className="cyp-display-line">{withRingO("COLLECTIVE")}</span>
          <span className="cyp-display-line">{withRingO("IMAGINATION")}</span>
        </h1>
      )}
    </div>
  );
}
