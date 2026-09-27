import { redirect } from "next/navigation";

/** 옛 /grove 탐색 → 참가자 일반 플로우 */
export default function GrovePage() {
  redirect("/usershow");
}
