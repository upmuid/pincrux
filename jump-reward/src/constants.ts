import { PlatformType } from './types';

// 게임의 가상 너비와 높이 (반응형 대응을 위한 기준 좌표계)
export const GAME_WIDTH = 400;
export const GAME_HEIGHT = 700;

// 캐릭터(플레이어) 크기 설정
export const PLAYER_RADIUS = 22;

// 플랫폼(발판) 크기 설정
export const PLATFORM_WIDTH = 140;
export const PLATFORM_HEIGHT = 20;

// 물리 엔진 관련 상수 (조심해서 수정하세요)
export const JUMP_VELOCITY = -18; // 점프 시 초기 속도 (낮을수록 높이 뜀)
export const GRAVITY = 0.8;      // 중력 가속도
export const INITIAL_TIME = 30;   // 게임 시작 시 주어지는 시간 (초)
export const PLATFORM_GAP = 170;  // 플랫폼 사이의 수직 간격

// UI 색상 정의
export const COLORS = {
  BACKGROUND: '#87ceeb', // 배경
  PLAYER: '#ffeb3b',     // 플레이어
  PLATFORM_NORMAL: '#fbbf24', // 일반 발판 (노란색)
  PLATFORM_HARD: '#ff5252',   // 어려운 발판 (빨간색)
  PLATFORM_BONUS: '#4fc3f7',  // 보너스 발판 (파란색)
  ITEM: '#ffa726',           // 보상 아이템 (오렌지)
};
