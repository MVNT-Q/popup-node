"use client";

import { NodeGroveShow } from "@/components/NodeGroveShow";

/** 유저용 그로브 보기 — 패드와 같고 뒤로·홈만 추가 */
export default function UserShowPage() {
  return <NodeGroveShow nav={true} />;
}
