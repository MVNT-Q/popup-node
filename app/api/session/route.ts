import { cleanSlots, publicNode } from "@/lib/slots";
import { createGuest, getNode, saveNode, storageMissingMessage, storageReady } from "@/lib/store";
import { clearSessionId, readSessionId, setSessionId, testAgentsEnabled } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET() {
  if (!storageReady()) {
    return fail(storageMissingMessage(), 503);
  }
  const id = await readSessionId();
  const node = id ? await getNode(id) : null;
  return Response.json({
    me: node ? publicNode(node) : null,
    testAgents: testAgentsEnabled(),
  });
}

export async function POST(request: Request) {
  if (!storageReady()) {
    return fail(storageMissingMessage(), 503);
  }
  const body = (await request.json().catch(() => null)) as {
    agent?: string;
    name?: string;
    slots?: unknown;
    update?: boolean;
  } | null;
  if (!body) return fail("요청이 비어 있습니다.", 400);

  if (body.agent) {
    if (!testAgentsEnabled()) return fail("테스트 입구가 꺼져 있습니다.", 403);
    if (body.agent !== "a" && body.agent !== "b") return fail("에이전트는 a 또는 b 입니다.", 400);
    const node = await getNode(body.agent);
    if (!node) return fail("시드 노드가 없습니다.", 500);
    await setSessionId(node.id);
    return Response.json({ me: publicNode(node) });
  }

  const slots = cleanSlots(body.slots);
  if (!slots) {
    return fail("콜사인, SEEK, OFFER, IMAGINE을 두 글자 이상 적어 주세요.", 400);
  }
  const name = String(body.name ?? "").trim().slice(0, 20);
  if (name.length < 2) return fail("콜사인을 두 글자 이상 적어 주세요.", 400);

  if (body.update) {
    const id = await readSessionId();
    const node = id ? await getNode(id) : null;
    if (!node) return fail("로그인된 노드가 없습니다.", 401);
    node.name = name;
    node.slots = slots;
    await saveNode(node);
    return Response.json({ me: publicNode(node) });
  }

  const existingId = await readSessionId();
  const existing = existingId ? await getNode(existingId) : null;
  if (existing) return fail("이 브라우저에는 이미 노드가 있습니다.", 409);

  const node = await createGuest(name, slots);
  await setSessionId(node.id);
  return Response.json({ me: publicNode(node) });
}

export async function DELETE() {
  await clearSessionId();
  return Response.json({ ok: true });
}
