import { chatOpenUrl, sessionOpenUrl } from "./chatLink";
import { getNode, listNodes, saveNode } from "./store";
import type { NodeRecord } from "./types";

export function telegramConfigured() {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN && process.env.TELEGRAM_BOT_USERNAME);
}

export function botUsername() {
  return (process.env.TELEGRAM_BOT_USERNAME ?? "").replace(/^@/, "").trim();
}

function token() {
  return process.env.TELEGRAM_BOT_TOKEN?.trim() ?? "";
}

export function webhookSecretOk(header: string | null) {
  const secret = process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
  return Boolean(secret) && header === secret;
}

function linkCode() {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export async function beginTelegramLink(node: NodeRecord) {
  const name = botUsername();
  if (!token() || !name) return null;
  const code = linkCode();
  node.telegramLinkCode = code;
  node.telegramLinkUntil = new Date(Date.now() + 20 * 60 * 1000).toISOString();
  await saveNode(node);
  return `https://t.me/${name}?start=${code}`;
}

export async function bindTelegramStart(payload: string, chatId: string) {
  const code = payload.trim();
  if (!code || !chatId) return null;
  const nodes = await listNodes();
  const node = nodes.find((item) => item.telegramLinkCode === code);
  if (!node?.telegramLinkUntil) return null;
  if (Date.parse(node.telegramLinkUntil) < Date.now()) return null;
  node.telegramChatId = chatId;
  node.telegramLinkCode = null;
  node.telegramLinkUntil = null;
  await saveNode(node);
  return node;
}

export async function clearTelegram(node: NodeRecord) {
  node.telegramChatId = null;
  node.telegramLinkCode = null;
  node.telegramLinkUntil = null;
  await saveNode(node);
}

export async function sendTelegram(chatId: string, text: string) {
  const key = token();
  if (!key || !chatId || !text) return;
  await fetch(`https://api.telegram.org/bot${key}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: text.slice(0, 1200),
      disable_web_page_preview: true,
    }),
  });
}

const ALERT_ONLY = `채팅은 CYP3 사이트에서 하세요. 이 텔레그램은 알림만 오는 곳이고, 여기 적은 글은 상대에게 가지 않습니다.
Chat on the CYP3 site. This Telegram is only for alerts. Anything you type here is not sent to them.

노드를 만든 브라우저나 홈 화면 아이콘으로 돌아가세요. 이 텔레그램 안에서 링크를 열면 다른 브라우저가 열려 노드를 다시 만들게 됩니다.
Go back to the browser or home-screen icon where you created your node. Opening a link inside Telegram opens another browser, and you may be asked to create a node again.`;

export function linkedNotice(code: number, nodeId: string) {
  const label = String(code).padStart(3, "0");
  const url = sessionOpenUrl(nodeId);
  return `NODE #${label}에 연결됐습니다. 아래 주소를 열면 내 노드가 열립니다.
NODE #${label} is connected. Open the link below to land in your node.

${url}

채팅이 오면 여기로 옵니다. 이 텔레그램에 적은 글은 상대에게 가지 않습니다.
Chats arrive here. Anything you type in this Telegram is not sent to them.`;
}

export function expiredNotice() {
  return `연결 시간이 지났습니다. 알림 화면에서 텔레그램으로 받기를 다시 눌러 주세요.
This link expired. On the Alerts page, tap Telegram alerts again.

${ALERT_ONLY}`;
}

export function connectHint() {
  return `알림 화면의 텔레그램으로 받기 버튼으로 연결해 주세요.
Connect from the Alerts page, with the Telegram button.

${ALERT_ONLY}`;
}

export function roomNotice() {
  return ALERT_ONLY;
}

export function chatNotice(code: number, fromId: string, toId: string) {
  const label = String(code).padStart(3, "0");
  return `NODE #${label} 채팅이 왔습니다.
NODE #${label} sent a chat.
${chatOpenUrl(toId, fromId)}

채팅은 위 링크의 CYP3에서 하세요. 이 텔레그램은 알림만 옵니다.
Reply on CYP3 using the link above. This Telegram only sends alerts.`;
}

export async function nodeById(id: string) {
  return getNode(id);
}
