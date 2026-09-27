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

export const SEEK_EXAMPLES = [
  {
    en: "A front-end developer who can help turn my interactive installation concept into a working web prototype.",
    ko: "인터랙티브 설치 컨셉을 작동하는 웹 프로토타입으로 구현할 프론트엔드 개발자.",
  },
  {
    en: "A filmmaker interested in documenting underground music and youth culture in Seoul.",
    ko: "서울의 언더그라운드 음악과 청춘 문화를 기록하는 데 관심 있는 영상 제작자.",
  },
  {
    en: "A researcher or technologist working on privacy-preserving AI who is open to collaborating on real-world work.",
    ko: "프라이버시를 보호하는 AI 연구를 하며, 실제 현실 사례에 협업할 의사가 있는 연구자.",
  },
  {
    en: "A collaborator from a completely different field, especially someone working in hardware, biology, or game design, who could take my idea somewhere I wouldn't reach alone.",
    ko: "하드웨어, 생물, 게임처럼 전혀 다른 분야에서 와서, 혼자서는 못 가는 데로 아이디어를 가져갈 사람.",
  },
] as const;

export const OFFER_TAGS = [
  "CREATIVE / DESIGN",
  "TECH / AI",
  "KNOWLEDGE / RESEARCH",
  "BUSINESS / STRATEGY",
  "HACKING / PRODUCTION",
  "COMMUNITY / FACILITATION",
  "NETWORK / INTRODUCTIONS",
  "RESOURCES / SPACE / FUNDING",
  "PERSPECTIVE / IDEAS",
  "GOOD ENERGY / SPIRIT",
] as const;

export const OFFER_EXAMPLES = [
  {
    en: "I run a small photo zine print studio in Seoul and can offer space for workshops, product shoots, or gatherings of up to 15 people.",
    ko: "서울에서 소규모 사진집 스튜디오를 운영하고, 최대 15명 규모의 워크숍과 촬영, 모임을 열 수 있다.",
  },
  {
    en: "I work in strategy and can help early-stage teams with market research, user analysis, and positioning, so you can focus on building.",
    ko: "전략과 리서치로 초기 팀이 만드는 일에 집중하게 돕는다. 시장, 사용자, 포지션.",
  },
  {
    en: "I have an experimental background in sound and spatial media, and I can help with technical setup, software, or creative direction for installations.",
    ko: "사운드와 공간 미디어로 설치의 기술 세팅, 소프트웨어, 창작 방향을 돕는다.",
  },
  {
    en: "I have experience in policy and cultural research, and can help you find relevant people or resources within institutions, developers, and organisers.",
    ko: "정책과 문화 연구로, 기관과 만드는 사람, 행사를 잇는 사람과 자원을 찾는다.",
  },
] as const;

export const IMAGINE_CARDS = [
  {
    scene: "valley",
    en: "Imagine a future where people live closely with nature, sharing energy, food, tools, and knowledge within small communities. Technology supports daily life quietly. Something like the Valley of the Wind.",
    ko: "자연과 가까이 살며 작은 공동체 안에서 에너지, 음식, 도구와 지식을 나누는 미래. 기술은 조용히 하루를 돕는다. 바람계곡 같은 세계.",
  },
  {
    scene: "float",
    en: "Imagine floating cities above the clouds, where gardens, workshops, homes, and public spaces are woven together. Moving through the city feels like wandering a shared landscape.",
    ko: "정원과 작업실, 집과 공공 공간이 이어진 구름 위의 부유 도시. 이동은 출퇴근이 아니라 풍경을 거니는 일이다.",
  },
  {
    scene: "ritual",
    en: "Imagine a future that feels ancient and futuristic at once, where craft, rituals, shared meals, and slower rhythms are everyday again. Advanced technology stays mostly invisible.",
    ko: "공예와 의식, 함께하는 식사와 느린 리듬이 다시 일상이 되는 미래. 기술은 있지만 앞에 나서지 않는다.",
  },
  {
    scene: "identity",
    en: "Imagine identity moving between physical and digital spaces. People choose names, personas, and how visible or anonymous they want to be.",
    ko: "몸과 화면 사이를 오가며 이름과 페르소나를 고르는 세계. 드러낼지, 익명으로 있을지를 스스로 정한다.",
  },
  {
    scene: "craft",
    en: "Imagine automation taking the repetitive work, so people have time to learn, make, care, explore, play, and create. Making belongs to everyday life, not only to a profession.",
    ko: "반복 노동이 걷히고, 배우고 만들고 돌보고 노는 시간이 늘어나는 미래. 만들기는 일부의 직업이 아니라 모두의 일상이다.",
  },
] as const;

// 선호 짝. SEEK는 상대 OFFER, OFFER는 상대 SEEK, IMAGINE은 미래끼리.
// 점수가 더 높으면 다른 칸과도 겹친다. 차이는 lib/match.ts pickIndex.
export const SLOT_TARGETS: readonly (readonly number[])[] = [
  [1, 0],
  [0, 1],
  [2],
];

export function emptySlots() {
  return PROMPTS.map((prompt) => ({ question: prompt.key, answer: "" }));
}
