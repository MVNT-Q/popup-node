import { createHash, timingSafeEqual } from "crypto";
import { personaRecords, pickKeptReal } from "@/lib/pruneGrove";
import { deleteNode, listNodes, saveNode, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function keyOk(provided: string | null): boolean {
  const expect = (process.env.OPS_PRUNE_KEY || "").trim();
  if (!expect || !provided) return false;
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expect).digest();
  return timingSafeEqual(a, b);
}

/**
 * POST /api/ops/prune-grove
 * Header: x-ops-key: $OPS_PRUNE_KEY
 * 실제 참가자 최대 5 + 랩 15페르소나만 남기고 더티 노드 삭제.
 */
export async function POST(request: Request) {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  if (!keyOk(request.headers.get("x-ops-key"))) {
    return Response.json({ error: "forbidden" }, { status: 403 });
  }

  const before = await listNodes();
  const keptReal = pickKeptReal(before, 5);
  const personas = personaRecords();
  const personaIds = new Set(personas.map((p) => p.id));
  const keepIds = new Set([...keptReal.map((n) => n.id), ...personaIds]);

  const deleteTargets = before.filter((node) => !keepIds.has(node.id));
  let deleted = 0;
  for (const node of deleteTargets) {
    if (await deleteNode(node.id)) deleted += 1;
  }

  for (const person of personas) {
    await saveNode(person);
  }

  const after = await listNodes();
  return Response.json({
    ok: true,
    before: before.length,
    deleted,
    keptReal: keptReal.map((n) => ({ code: n.code, name: n.name })),
    personasInserted: personas.map((n) => n.name),
    after: after.length,
    afterCodes: after.map((n) => ({ code: n.code, name: n.name })),
  });
}
