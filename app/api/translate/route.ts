import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Lang = "en" | "ko";

function asLang(value: string | null): Lang | null {
  if (value === "en" || value === "ko") return value;
  return null;
}

/** 키 없는 MyMemory — 짧은 SEEK/OFFER/IMAGINE 문장용 */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim();
  const to = asLang(request.nextUrl.searchParams.get("to"));
  if (!q || !to) {
    return NextResponse.json({ text: q }, { status: 400 });
  }
  if (q.length > 400) {
    return NextResponse.json({ text: q.slice(0, 400) }, { status: 400 });
  }

  const from: Lang = to === "ko" ? "en" : "ko";
  const langpair = `${from}|${to}`;
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(q)}&langpair=${encodeURIComponent(langpair)}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return NextResponse.json({ text: q });
    }
    const data = (await response.json()) as {
      responseStatus?: number;
      responseData?: { translatedText?: string };
    };
    const translated = data.responseData?.translatedText?.trim();
    if (!translated || data.responseStatus !== 200) {
      return NextResponse.json({ text: q });
    }
    // MyMemory 한도/오류 문구가 섞이면 원문 유지
    if (/MYMEMORY WARNING|INVALID SOURCE LANGUAGE|PLEASE SELECT/i.test(translated)) {
      return NextResponse.json({ text: q });
    }
    return NextResponse.json({ text: translated });
  } catch {
    return NextResponse.json({ text: q });
  }
}
