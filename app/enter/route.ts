import { openLinkOk } from "@/lib/chatLink";
import { setSessionId } from "@/lib/session";
import { getNode, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 알림 링크. 받는 노드 쿠키를 심고 그 사람과의 채팅으로 보낸다. */
export async function GET(request: Request) {
  if (!storageReady()) return new Response(storageMissingMessage(), { status: 503 });
  const url = new URL(request.url);
  const meId = url.searchParams.get("me") ?? "";
  const withId = url.searchParams.get("with") ?? "";
  const exp = Number(url.searchParams.get("exp") ?? "");
  const sig = url.searchParams.get("sig") ?? "";
  if (!openLinkOk(meId, withId, exp, sig)) {
    return new Response("채팅 링크가 맞지 않습니다. 텔레그램의 링크를 다시 눌러 주세요.", { status: 400 });
  }
  const me = await getNode(meId);
  const other = await getNode(withId);
  if (!me || !other || me.id === other.id) {
    return new Response("채팅 상대를 찾지 못했습니다.", { status: 404 });
  }
  await setSessionId(me.id);
  return Response.redirect(new URL(`/chat/${other.id}`, request.url));
}
