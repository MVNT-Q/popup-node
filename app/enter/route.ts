import { NextResponse } from "next/server";
import { issueTicket, openLinkOk, sessionLinkOk } from "@/lib/chatLink";
import { COOKIE, setSessionId } from "@/lib/session";
import { getNode, storageMissingMessage, storageReady } from "@/lib/store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** 알림 링크. with 있으면 채팅, 없으면 세션만 심고 /my-node. */
export async function GET(request: Request) {
  if (!storageReady()) return new Response(storageMissingMessage(), { status: 503 });
  const url = new URL(request.url);
  const meId = url.searchParams.get("me") ?? "";
  const withId = url.searchParams.get("with");
  const exp = Number(url.searchParams.get("exp") ?? "");
  const sig = url.searchParams.get("sig") ?? "";

  if (!withId) {
    if (!sessionLinkOk(meId, exp, sig)) {
      return new Response("링크가 맞지 않습니다. 텔레그램의 링크를 다시 눌러 주세요.", { status: 400 });
    }
    const me = await getNode(meId);
    if (!me) {
      return new Response("노드를 찾지 못했습니다.", { status: 404 });
    }
    await setSessionId(me.id);
    return NextResponse.redirect(new URL("/my-node", request.url));
  }

  if (!openLinkOk(meId, withId, exp, sig)) {
    return new Response("채팅 링크가 맞지 않습니다. 텔레그램의 링크를 다시 눌러 주세요.", { status: 400 });
  }
  const me = await getNode(meId);
  const other = await getNode(withId);
  if (!me || !other || me.id === other.id) {
    return new Response("채팅 상대를 찾지 못했습니다.", { status: 404 });
  }
  const dest = new URL(`/chat/${other.id}`, request.url);
  dest.searchParams.set("t", issueTicket(me.id));
  const response = NextResponse.redirect(dest);
  response.cookies.set(COOKIE, me.id, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}
