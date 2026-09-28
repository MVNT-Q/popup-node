import { readSessionId } from "@/lib/session";
import { getNode, storageMissingMessage, storageReady } from "@/lib/store";
import { beginTelegramLink, botUsername, clearTelegram, telegramConfigured } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function me() {
  if (!storageReady()) return null;
  const id = await readSessionId();
  return id ? getNode(id) : null;
}

export async function GET() {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  const node = await me();
  if (!node) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  return Response.json({
    configured: telegramConfigured(),
    linked: Boolean(node.telegramChatId),
    username: botUsername(),
  });
}

export async function POST() {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  const node = await me();
  if (!node) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  if (!telegramConfigured()) {
    return Response.json({ error: "텔레그램 봇이 아직 연결되지 않았습니다." }, { status: 503 });
  }
  const url = await beginTelegramLink(node);
  if (!url) return Response.json({ error: "연결 주소를 만들지 못했습니다." }, { status: 503 });
  return Response.json({ url });
}

export async function DELETE() {
  if (!storageReady()) {
    return Response.json({ error: storageMissingMessage() }, { status: 503 });
  }
  const node = await me();
  if (!node) return Response.json({ error: "노드가 없습니다." }, { status: 401 });
  await clearTelegram(node);
  return Response.json({ linked: false });
}
