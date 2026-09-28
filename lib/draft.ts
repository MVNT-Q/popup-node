export const DRAFT_KEY = "cyp3-node-draft";

export type NodeDraft = {
  callsign: string;
  email: string;
  seek: string;
  offer: string;
  tags: string[];
};

export function readDraft(): NodeDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<NodeDraft>;
    if (!data.callsign || !data.seek) return null;
    return {
      callsign: String(data.callsign),
      email: String(data.email ?? ""),
      seek: String(data.seek),
      offer: String(data.offer ?? ""),
      tags: Array.isArray(data.tags) ? data.tags.map((tag) => String(tag)) : [],
    };
  } catch {
    return null;
  }
}

export function writeDraft(draft: NodeDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function clearDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}
