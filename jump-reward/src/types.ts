/**
 * 플랫폼(발판)의 종류를 정의합니다.
 */
export export enum PlatformType {
  NORMAL = 'NORMAL', // 일반 (금색)
  BONUS = 'BONUS',   // 보너스 (아이템 보강)
  HARD = 'HARD'      // 위험 (빨간색 - 파괴되거나 빠름)
}

/**
 * 플랫폼 하나의 상태를 관리하는 인터페이스입니다.
 */
export interface Platform {
  id: string; // 고유 ID
  x: number;  // X 좌표
  y: number;  // Y 좌표
  type: PlatformType; // 종류
  speed: number;      // 이동 속도 (0이면 고정)
  direction: 1 | -1;  // 이동 방향 (오른쪽/왼쪽)
  hasItem: boolean;   // 아이템 소생 여부
}

/**
 * 전역 게임 상태 관리를 위한 인터페이스입니다.
 */
export interface GameState {
  score: number;      // 현재 점수 (도달한 높이)
  timeLeft: number;   // 남은 시간
  isGameOver: boolean; // 게임 종료 여부
  userId: string;     // 식별 가능한 사용자 ID
  usrKey: string;     // 외부 전달용 유저 키
  isAdPlaying: boolean; // 광고 시청 중 여부
  rewardEarned: boolean; // 보상 획득 완료 여부
}
