import { createHmac, timingSafeEqual } from "node:crypto";

const SITE = "https://node.cyp3.xyz";
const ID = /^[A-Za-z0-9_-]{1,80}$/;
const WEEK = 60 * 60 * 24 * 14;

function secret() {
  return process.env.TELEGRAM_WEBHOOK_SECRET?.trim() ?? "";
}

function sign(meId: string, withId: string, exp: number) {
  return createHmac("sha256", secret()).update(`${meId}.${withId}.${exp}`).digest("base64url");
}

/** 채팅 상대 없이 세션만 심을 때. meId+exp만 HMAC. */
function sessionSign(meId: string, exp: number) {
  return createHmac("sha256", secret()).update(`${meId}.${exp}`).digest("base64url");
}

/** 텔레그램 브라우저에는 노드 쿠키가 없다. 이 주소가 받는 노드로 들어온 뒤 채팅을 연다. */
export function chatOpenPath(meId: string, withId: string) {
  const key = secret();
  if (!key || !ID.test(meId) || !ID.test(withId)) return `/chat/${withId}`;
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const q = new URLSearchParams({
    me: meId,
    with: withId,
    exp: String(exp),
    sig: sign(meId, withId, exp),
  });
  return `/enter?${q}`;
}

export function chatOpenUrl(meId: string, withId: string) {
  return `${SITE}${chatOpenPath(meId, withId)}`;
}

/** /start 연결 성공 — 쿠키만 심고 /my-node로. with 없음. */
export function sessionOpenPath(meId: string) {
  const key = secret();
  if (!key || !ID.test(meId)) return "/my-node";
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  const q = new URLSearchParams({
    me: meId,
    exp: String(exp),
    sig: sessionSign(meId, exp),
  });
  return `/enter?${q}`;
}

export function sessionOpenUrl(meId: string) {
  return `${SITE}${sessionOpenPath(meId)}`;
}

function ticketSign(meId: string, exp: number) {
  return createHmac("sha256", secret()).update(`ticket.${meId}.${exp}`).digest("base64url");
}

/** 쿠키가 막혀도 이 값으로 받는 노드를 알아본다. */
export function issueTicket(meId: string) {
  const exp = Math.floor(Date.now() / 1000) + WEEK;
  return `${meId}.${exp}.${ticketSign(meId, exp)}`;
}

export function readTicket(ticket: string | null) {
  const key = secret();
  if (!key || !ticket) return null;
  const parts = ticket.split(".");
  if (parts.length !== 3) return null;
  const [meId, expRaw, sig] = parts;
  const exp = Number(expRaw);
  if (!ID.test(meId) || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return null;
  const expected = ticketSign(meId, exp);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  return meId;
}

export function openLinkOk(meId: string, withId: string, exp: number, sig: string) {
  const key = secret();
  if (!key || !ID.test(meId) || !ID.test(withId) || !Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sign(meId, withId, exp);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export function sessionLinkOk(meId: string, exp: number, sig: string) {
  const key = secret();
  if (!key || !ID.test(meId) || !Number.isFinite(exp)) return false;
  if (exp < Math.floor(Date.now() / 1000)) return false;
  const expected = sessionSign(meId, exp);
  const a = Buffer.from(expected);
  const b = Buffer.from(sig);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}
