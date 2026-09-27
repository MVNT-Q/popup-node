"use client";

import { NodeGroveShow } from "@/components/NodeGroveShow";

/** 전시 패드 — 뒤로/홈 없음, 12초 자동 교차 */
export default function DevShowPage() {
  return <NodeGroveShow nav={false} />;
}
