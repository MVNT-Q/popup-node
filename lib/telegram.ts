import { getNode, listNodes, saveNode } from "./store";
import type { NodeRecord } from "./types";

const SITE = "https://node.cyp3.xyz";

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
      text: text.slice(0, 500),
      disable_web_page_preview: true,
    }),
  });
}

export function chatNotice(code: number, fromId: string) {
  const label = String(code).padStart(3, "0");
  return `NODE #${label}가 말을 걸었습니다.\n${SITE}/chat/${fromId}`;
}

export async function nodeById(id: string) {
  return getNode(id);
}
