/** POC_7·8 헤더 — grove는 Orbitron, collective는 타이틀 PNG */

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
        <h1 className="cyp-sky-hero cyp-display-collective" aria-label="COLLECTIVE IMAGINATION">
          <img
            className="cyp-collective-title-img"
            src="/collective-imagination-title.png"
            alt="COLLECTIVE IMAGINATION"
            draggable={false}
          />
        </h1>
      )}
    </div>
  );
}
