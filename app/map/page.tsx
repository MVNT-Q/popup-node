import { redirect } from "next/navigation";

// 예전 하늘. 참가 경로는 /my-node 로만 간다.
export default function MapPage() {
  redirect("/my-node");
}
