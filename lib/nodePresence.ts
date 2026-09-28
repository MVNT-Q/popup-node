const KEY = "cyp-has-node";

/** 이 브라우저에 노드가 있다고 마지막으로 확인한 값. 서버를 기다리지 않고 홈 버튼을 고른다. */
export function rememberedNode(): boolean {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function rememberNode(has: boolean) {
  try {
    if (has) localStorage.setItem(KEY, "1");
    else localStorage.removeItem(KEY);
  } catch {
    // 저장이 막혀도 세션 조회로 다시 판정한다.
  }
}
