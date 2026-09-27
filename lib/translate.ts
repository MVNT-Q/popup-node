import { guessTextLang, type SheetLang } from "@/lib/relation";

const cache = new Map<string, string>();

function cacheKey(text: string, lang: SheetLang) {
  return `${lang}\0${text}`;
}

async function translateOne(text: string, lang: SheetLang): Promise<string> {
  const raw = text.trim();
  if (!raw) return "";

  const hit = cache.get(cacheKey(raw, lang));
  if (hit !== undefined) return hit;

  const guessed = guessTextLang(raw);
  if (guessed === "empty" || guessed === lang) {
    cache.set(cacheKey(raw, lang), raw);
    return raw;
  }

  // mixed·다른 언어 → MyMemory. 실패하면 원문만.
  try {
    const response = await fetch(
      `/api/translate?q=${encodeURIComponent(raw)}&to=${encodeURIComponent(lang)}`,
      { cache: "no-store" },
    );
    if (!response.ok) {
      cache.set(cacheKey(raw, lang), raw);
      return raw;
    }
    const data = (await response.json()) as { text?: string };
    const out = (data.text ?? raw).trim() || raw;
    cache.set(cacheKey(raw, lang), out);
    return out;
  } catch {
    cache.set(cacheKey(raw, lang), raw);
    return raw;
  }
}

/** · 로 이은 문장은 조각마다 번역. 실패·이미 같은 언어면 원문. 안내 문구 없음. */
export async function translateQuote(quote: string, lang: SheetLang): Promise<string> {
  const raw = quote.trim();
  if (!raw) return "";

  const whole = cache.get(cacheKey(raw, lang));
  if (whole !== undefined) return whole;

  const parts = raw.split(/\s*·\s*/).map((part) => part.trim()).filter(Boolean);
  if (parts.length <= 1) {
    const out = await translateOne(raw, lang);
    cache.set(cacheKey(raw, lang), out);
    return out;
  }

  const translated = await Promise.all(parts.map((part) => translateOne(part, lang)));
  const out = translated.join(" · ");
  cache.set(cacheKey(raw, lang), out);
  return out;
}
