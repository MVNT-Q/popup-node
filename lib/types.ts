export type Slot = {
  question: string;
  answer: string;
  tags?: string[];
};

export type NodeKind = "agent" | "guest" | "prop";

export type PushSub = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

export type NodeRecord = {
  id: string;
  code: number;
  name: string;
  kind: NodeKind;
  tag: string | null;
  slots: Slot[];
  /** 행사 연락용. publicNode·그로브·정보 카드·타 참가자 API에 넣지 않음 */
  email?: string | null;
  /** 봇 대화방. 공개 API에 넣지 않음 */
  telegramChatId?: string | null;
  telegramLinkCode?: string | null;
  telegramLinkUntil?: string | null;
  push: PushSub | null;
  createdAt: string;
};

export type Message = {
  id: string;
  from: string;
  to: string;
  body: string;
  at: string;
};

export type Band = "weak" | "mid" | "strong";

export type Bag = {
  nodes: NodeRecord[];
  messages: Message[];
  reads: Record<string, string>;
  vectors: Record<string, number[]>;
  judgments?: Record<string, string>;
};
