import { bindTelegramStart, sendTelegram, webhookSecretOk } from "@/lib/telegram";

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
  if (!text.startsWith("/start") || chatId == null) {
    return Response.json({ ok: true });
  }
  const payload = text.replace(/^\/start(?:@\w+)?/, "").trim();
  const node = payload ? await bindTelegramStart(payload, String(chatId)) : null;
  if (node) {
    await sendTelegram(String(chatId), `NODE #${String(node.code).padStart(3, "0")}에 연결됐습니다. 채팅이 오면 여기로 옵니다. 알림 탭을 닫아도 그대로 옵니다.`);
  } else if (payload) {
    await sendTelegram(String(chatId), "연결 시간이 지났습니다. 알림 화면에서 다시 열어 주세요.");
  } else {
    await sendTelegram(String(chatId), "알림 화면의 텔레그램으로 받기 버튼으로 연결해 주세요.");
  }
  return Response.json({ ok: true });
}
