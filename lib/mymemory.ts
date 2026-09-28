/** 키 없는 MyMemory. 짧은 SEEK/OFFER/IMAGINE용. 프로세스 메모리 캐시. */

export type Lang = "en" | "ko";

const cache = new Map<string, string | null>();

function keyOf(q: string, to: Lang) {
  return `${to}\0${q}`;
}

/** 성공 시 번역문. 실패·경고·빈 결과는 null (원문 재사용 금지 — 매칭은 0). */
export async function mymemoryTranslate(q: string, to: Lang): Promise<string | null> {
  const raw = q.trim().slice(0, 400);
  if (!raw) return null;

  const hit = cache.get(keyOf(raw, to));
  if (hit !== undefined) return hit;

  const from: Lang = to === "ko" ? "en" : "ko";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(raw)}&langpair=${encodeURIComponent(`${from}|${to}`)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      cache.set(keyOf(raw, to), null);
      return null;
    }
    const data = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || data.responseStatus !== 200) {
      cache.set(keyOf(raw, to), null);
      return null;
    }
    if (/MYMEMORY WARNING|INVALID SOURCE LANGUAGE|PLEASE SELECT/i.test(translated)) {
      cache.set(keyOf(raw, to), null);
      return null;
    }
    cache.set(keyOf(raw, to), translated);
    return translated;
  } catch {
    cache.set(keyOf(raw, to), null);
    return null;
  }
}

/** 한글이 있는 쪽만 영어로. 이미 영어면 그대로. 실패·번역문에 한글 남으면 null. */
export async function toEnglishForMatch(text: string): Promise<string | null> {
  const raw = text.trim();
  if (!raw) return null;
  if (!/[가-힣]/.test(raw)) return raw;
  const translated = await mymemoryTranslate(raw, "en");
  if (!translated || /[가-힣]/.test(translated)) return null;
  return translated;
}
