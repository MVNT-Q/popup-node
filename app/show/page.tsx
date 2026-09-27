import { redirect } from "next/navigation";

/** 주소줄로 친 옛 /show만 → 전시 패드. UI에서는 /show·/devshow로 보내지 않음. */
export default function ShowRedirectPage() {
  redirect("/devshow");
}
