import { redirect } from "next/navigation";

/** 옛 /show 링크 → 전시 패드 */
export default function ShowRedirectPage() {
  redirect("/devshow");
}
