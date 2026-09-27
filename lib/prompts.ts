export const PROMPTS = [
  {
    key: "SEEK",
    title: "I SEEK",
    ko: "찾고 있는 것",
    guide: "같이할 프로젝트, 필요한 아티스트",
    placeholder: "밤 공연에 옷의 결을 같이 짤 텍스타일 아티스트",
  },
  {
    key: "OFFER",
    title: "I OFFER",
    ko: "내놓을 수 있는 것",
    guide: "손, 기술, 시간, 자리",
    placeholder: "몸을 쓰는 안무와 짧은 장면",
  },
  {
    key: "IMAGINE",
    title: "I IMAGINE",
    ko: "같이 살고 싶은 미래",
    guide: "What kind of world do you want to live in?",
    placeholder:
      "What does it look like? How do people live there? What kind of technology, nature, or relationships exist?",
  },
] as const;

export const IMAGINE_WORLDS = [
  "A peaceful ecological valley, something like a hidden world shaped by wind, ruins, and nature",
  "A luminous night world with bioluminescent plants and a quiet mystical atmosphere",
  "Floating islands and airborne cities surrounded by clouds and gardens",
  "A future-medieval world where ancient forms and advanced tools coexist",
  "A world that feels like a sacred forest civilization",
  "A moonlit society built around care, beauty, and autonomy",
] as const;

export const IMAGINE_COPY = {
  question: "What kind of world do you want to live in?",
  note: "It can be an idea, a feeling, a scene, a landscape, a city, a village, or a way of life.",
  optional: "Optional — describe it in your own words:",
} as const;

// SEEK 예시 — 원문 그대로 (자르지 않음, 4번 영어 마침표 없음)
export const SEEK_EXAMPLES = [
  {
    en: "A frontend developer who can help turn my interactive installation concept into a working web prototype.",
    ko: "인터랙티브 설치 아이디어를 실제 웹 프로토타입으로 구현해줄 프론트엔드 개발자.",
  },
  {
    en: "A filmmaker interested in documenting underground music and youth culture in Seoul.",
    ko: "서울의 언더그라운드 음악과 젊은 문화를 기록하는 데 관심 있는 영상 제작자.",
  },
  {
    en: "A researcher or technologist working on privacy-preserving AI who is open to collaborating with artists.",
    ko: "프라이버시를 보호하는 AI를 연구하며 아티스트와 협업에 열려 있는 연구자 또는 기술자.",
  },
  {
    en: "A collaborator from a completely different field, especially someone working in [architecture / biology / game design], who could take my idea somewhere I wouldn't reach alone",
    ko: "혼자서는 생각하지 못한 방향으로 아이디어를 확장시켜줄 전혀 다른 분야, 특히 [건축 / 생물학 / 게임 디자인] 분야의 협업자.",
  },
] as const;

export const OFFER_TAGS = [
  "CREATIVE / DESIGN",
  "TECH / AI",
  "KNOWLEDGE / RESEARCH",
  "BUSINESS / STRATEGY",
  "MAKING / PRODUCTION",
  "COMMUNITY / FACILITATION",
  "NETWORK / INTRODUCTIONS",
  "RESOURCES / SPACE / FUNDING",
  "PERSPECTIVE / IDEAS",
  "GOOD ENERGY / SPIRIT",
] as const;

// OFFER 예시 — 원문 그대로 (자르지 않음)
export const OFFER_EXAMPLES = [
  {
    en: "I run a small photo and event studio in Seoul and can offer space for workshops, product shoots, or gatherings of up to 15 people.",
    ko: "서울에서 소규모 촬영·이벤트 스튜디오를 운영하며, 최대 15명 규모의 워크숍·제품 촬영·모임 공간을 제공할 수 있습니다.",
  },
  {
    en: "I work on AI agents and decentralized infrastructure, with experience in multi-agent systems and peer-to-peer protocols, and can help prototype experimental technical concepts.",
    ko: "AI 에이전트와 탈중앙화 인프라를 다루며, 멀티에이전트 시스템과 P2P 프로토콜 경험을 바탕으로 실험적인 기술 아이디어의 프로토타이핑을 도울 수 있습니다.",
  },
  {
    en: "I work with apparel factories and material suppliers in Korea and can help with technical development, sourcing, sampling, and small-batch fashion production.",
    ko: "한국의 의류 공장과 소재 업체들과 일하고 있으며, 기술 개발·소재 소싱·샘플 제작·소량 패션 생산을 도울 수 있습니다.",
  },
  {
    en: "I run a creative-coding and digital-art community in Seoul and can introduce generative artists, creative technologists, developers, and organizers for collaborations or events.",
    ko: "서울에서 크리에이티브 코딩·디지털 아트 커뮤니티를 운영하며, 협업이나 이벤트를 위해 제너러티브 아티스트·크리에이티브 테크놀로지스트·개발자·기획자를 연결해줄 수 있습니다.",
  },
] as const;

// IMAGINE 예시 — 목업 POC_3_2 원문 (썸네일 없음)
export const IMAGINE_CARDS = [
  {
    scene: "valley",
    en: "I imagine a future where people live closely with nature, sharing energy, food, tools, and knowledge within small communities. Technology supports daily life quietly, protecting privacy without demanding constant attention. Something like the Valley in Nausicaä of the Valley of the Wind.",
    ko: "자연과 가까이 살아가며 작은 공동체 안에서 에너지, 음식, 도구와 지식을 나누는 미래. 기술은 끊임없이 주의를 요구하지 않고, 일상과 프라이버시를 조용히 지켜주는 《바람계곡의 나우시카》의 계곡 같은 세계.",
  },
  {
    scene: "float",
    en: "I imagine floating cities above the clouds, where gardens, workshops, homes, and public spaces are woven together instead of being divided by roads and advertisements. Moving through the city feels more like wandering through a shared landscape than commuting.",
    ko: "도로와 광고로 분리된 도시가 아니라, 정원과 작업실, 집과 공공 공간이 서로 이어진 구름 위의 부유 도시. 이동은 출퇴근이라기보다 하나의 공유된 풍경을 거니는 경험에 가까운 세계.",
  },
  {
    scene: "ritual",
    en: "I imagine a future that feels ancient and futuristic at the same time, where craft, rituals, shared meals, and slower rhythms become part of everyday life again. Advanced technology still exists, but it stays mostly invisible in the background.",
    ko: "공예와 의식, 함께하는 식사와 느린 삶의 리듬이 다시 일상의 중요한 부분이 되는 미래적 중세 같은 세계. 첨단 기술은 존재하지만 전면에 드러나기보다 보이지 않는 곳에서 조용히 작동하는 미래.",
  },
  {
    scene: "identity",
    en: "I imagine a world where identity is fluid across physical and digital spaces. People can use different names, personas, or levels of anonymity, and choose for themselves when to be visible, private, or somewhere in between.",
    ko: "물리적 공간과 디지털 공간을 오가며 정체성을 더 유동적으로 선택할 수 있는 세계. 서로 다른 이름과 페르소나를 사용하고, 언제 자신을 드러내고 언제 익명으로 존재할지 스스로 결정할 수 있는 미래.",
  },
  {
    scene: "craft",
    en: "I imagine a future where automation has removed most repetitive work, giving people much more time to learn, make things, care for others, explore, play, and create. Creativity is no longer reserved for a profession, but becomes part of everyday life for everyone.",
    ko: "자동화로 반복 노동 대부분이 사라지고, 사람들이 배우고, 만들고, 돌보고, 탐험하고, 놀고, 창작하는 데 더 많은 시간을 쓰는 미래. 창작이 일부 사람의 직업이 아니라 모두의 일상이 되는 세계.",
  },
] as const;

// 한 방향 짝. SEEK→상대 OFFER, OFFER→상대 SEEK, IMAGINE끼리.
// pickIndex는 이 목록 밖(특히 IMAGINE↔SEEK/OFFER)을 고르지 않는다.
export const SLOT_TARGETS: readonly (readonly number[])[] = [
  [1],
  [0],
  [2],
];

/** 카드 인용 칸 — 히트 방향과 같은 짝의 상대 문장 */
export const SLOT_COUNTERPART: readonly number[] = [1, 0, 2];

export function emptySlots() {
  return PROMPTS.map((prompt) => ({ question: prompt.key, answer: "" }));
}
