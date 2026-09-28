import { bindTelegramStart, connectHint, expiredNotice, linkedNotice, roomNotice, sendTelegram, webhookSecretOk } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Update = {
  message?: {
    text?: string;
    chat?: { id?: number };
  };
};

/** 봇 웹훅. secret_token 이 맞을 때만 시작 코드를 이 노드에 붙인다. */
export async function POST(request: Request) {
  if (!webhookSecretOk(request.headers.get("x-telegram-bot-api-secret-token"))) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await request.json().catch(() => null)) as Update | null;
  const text = update?.message?.text?.trim() ?? "";
  const chatId = update?.message?.chat?.id;
  if (chatId == null) return Response.json({ ok: true });
  if (!text.startsWith("/start")) {
    if (text) await sendTelegram(String(chatId), roomNotice());
    return Response.json({ ok: true });
  }
  const payload = text.replace(/^\/start(?:@\w+)?/, "").trim();
  const node = payload ? await bindTelegramStart(payload, String(chatId)) : null;
  if (node) {
    await sendTelegram(String(chatId), linkedNotice(node.code, node.id));
  } else if (payload) {
    await sendTelegram(String(chatId), expiredNotice());
  } else {
    await sendTelegram(String(chatId), connectHint());
  }
  return Response.json({ ok: true });
}
