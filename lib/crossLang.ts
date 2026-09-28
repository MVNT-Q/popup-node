/** 한쪽만 한글·다른 쪽은 라틴이면 교차 언어. 둘 다 한글/둘 다 영어면 같은 언어. */
export function hasHangul(text: string): boolean {
  return /[가-힣]/.test(text);
}

export function hasLatin(text: string): boolean {
  return /[A-Za-z]/.test(text);
}

export function isCrossLingual(a: string, b: string): boolean {
  const aKo = hasHangul(a);
  const bKo = hasHangul(b);
  if (aKo === bKo) return false;
  return aKo ? hasLatin(b) : hasLatin(a);
}
