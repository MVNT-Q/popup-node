"use client";

import { NodeGroveShow } from "@/components/NodeGroveShow";

/** 참가자 일반 그로브 탐색 — 뒤로·홈 있음, 자동 교차 없음. 전시 패드는 /devshow(주소줄만). */
export default function UserShowPage() {
  return <NodeGroveShow nav={true} />;
}
