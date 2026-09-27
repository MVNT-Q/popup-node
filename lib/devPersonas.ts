import type { Slot } from "./types";

/** 15인 페르소나. /dev 슬라이더·운영 그로브 시드가 같은 목록을 쓴다. */
export type DevPersona = {
  id: string;
  code: number;
  name: string;
  slots: Slot[];
};

const GLOW =
  "A luminous night world with bioluminescent plants and a quiet mystical atmosphere";
const COURTYARD =
  "Copper roofs and shared courtyards where neighbors trade seeds every spring";

// tess↔tess2 강쌍. mira→orio→kade 사슬. nova↔reno IMAGINE만.
// lee는 tess에 SEEK 한 칸. jin은 약(별만). sol·ao·pix·umu·yen·quo 고독.
export const DEV_PERSONAS: DevPersona[] = [
  {
    id: "tess",
    code: 101,
    name: "tess",
    slots: [
      { question: "SEEK", answer: "밤 공연에 옷의 결을 같이 짤 텍스타일 아티스트" },
      { question: "OFFER", answer: "몸을 쓰는 안무와 짧은 장면 디렉션" },
      { question: "IMAGINE", answer: GLOW },
    ],
  },
  {
    id: "tess2",
    code: 102,
    name: "tess2",
    slots: [
      { question: "SEEK", answer: "몸과 장면을 같이 짤 안무가" },
      { question: "OFFER", answer: "밤 공연에 올릴 텍스타일과 옷의 결, 가까이 보이는 원단" },
      { question: "IMAGINE", answer: GLOW },
    ],
  },
  {
    id: "mira",
    code: 103,
    name: "mira",
    slots: [
      { question: "SEEK", answer: "전시에 같이할 사운드" },
      { question: "OFFER", answer: "포스터 캘리그라피" },
      { question: "IMAGINE", answer: "Tea steam over notebooks in a quiet loft" },
    ],
  },
  {
    id: "orio",
    code: 104,
    name: "orio",
    slots: [
      { question: "SEEK", answer: "회로 납땜과 센서 배선을 같이할 사람" },
      { question: "OFFER", answer: "전시에 올릴 사운드와 현장 믹스" },
      { question: "IMAGINE", answer: "Bicycle rides along empty harbor roads at dawn" },
    ],
  },
  {
    id: "kade",
    code: 105,
    name: "kade",
    slots: [
      { question: "SEEK", answer: "포스터만 그리는 외로운 작업" },
      { question: "OFFER", answer: "회로 납땜과 센서 배선 도움" },
      { question: "IMAGINE", answer: "Clay bowls drying on a sunny windowsill" },
    ],
  },
  {
    id: "nova",
    code: 106,
    name: "nova",
    slots: [
      { question: "SEEK", answer: "요리 레시피 교환" },
      { question: "OFFER", answer: "주말 빵 굽기" },
      { question: "IMAGINE", answer: COURTYARD },
    ],
  },
  {
    id: "reno",
    code: 107,
    name: "reno",
    slots: [
      { question: "SEEK", answer: "등산 메이트" },
      { question: "OFFER", answer: "트레킹 간식" },
      { question: "IMAGINE", answer: COURTYARD },
    ],
  },
  {
    id: "lee",
    code: 108,
    name: "lee",
    slots: [
      { question: "SEEK", answer: "짧은 장면 디렉션만 집중해서 배우고 싶음" },
      { question: "OFFER", answer: "간단한 간식 나눔" },
      { question: "IMAGINE", answer: "Library aisles that smell like old paper" },
    ],
  },
  {
    id: "jin",
    code: 109,
    name: "jin",
    slots: [
      { question: "SEEK", answer: "날씨 맑은 주말 산책" },
      { question: "OFFER", answer: "가끔 아티스트 친구의 피아노를 들어 준다" },
      { question: "IMAGINE", answer: "Soft rain on a tram window" },
    ],
  },
  {
    id: "sol",
    code: 110,
    name: "sol",
    slots: [
      { question: "SEEK", answer: "식물 분갈이 팁" },
      { question: "OFFER", answer: "허브 모종" },
      { question: "IMAGINE", answer: "Moonlit balconies with quiet conversations" },
    ],
  },
  {
    id: "ao",
    code: 111,
    name: "ao",
    slots: [
      { question: "SEEK", answer: "기타 줄 교체" },
      { question: "OFFER", answer: "중고 앰프 대여" },
      { question: "IMAGINE", answer: "Fog over rice fields before sunrise" },
    ],
  },
  {
    id: "pix",
    code: 112,
    name: "pix",
    slots: [
      { question: "SEEK", answer: "필름 현상소 추천" },
      { question: "OFFER", answer: "즉석 카메라 빌려줌" },
      { question: "IMAGINE", answer: "Neon reflections in puddles after midnight" },
    ],
  },
  {
    id: "umu",
    code: 113,
    name: "umu",
    slots: [
      { question: "SEEK", answer: "커피 머신 수리 팁" },
      { question: "OFFER", answer: "주말 보드게임 모임" },
      { question: "IMAGINE", answer: "Quiet mornings with tea and unread letters on a wooden table" },
    ],
  },
  {
    id: "yen",
    code: 114,
    name: "yen",
    slots: [
      { question: "SEEK", answer: "고양이 사료 추천" },
      { question: "OFFER", answer: "근처 세탁소 위치" },
      { question: "IMAGINE", answer: "A small apartment with too many houseplants and soft jazz" },
    ],
  },
  {
    id: "quo",
    code: 115,
    name: "quo",
    slots: [
      { question: "SEEK", answer: "버스 시간표 사진" },
      { question: "OFFER", answer: "우산 하나" },
      { question: "IMAGINE", answer: "Rainy Tuesday errands and a warm bakery queue" },
    ],
  },
];
