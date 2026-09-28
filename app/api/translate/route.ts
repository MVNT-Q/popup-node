import { NextRequest, NextResponse } from "next/server";
import { mymemoryTranslate, type Lang } from "@/lib/mymemory";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

  const translated = await mymemoryTranslate(q, to);
  // UI는 실패 시 원문 유지 (안내 문구 없음). 매칭 쪽은 null을 0으로 본다.
  return NextResponse.json({ text: translated ?? q });
}
