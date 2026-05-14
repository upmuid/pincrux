import { PlatformType } from '../types';

/**
 * 플레이어에게 보상을 지급하기 위한 포스트백 서버 연동 함수 (시뮬레이션)
 * 실제 환경에서는 fetch API 등을 통해 서버로 점수 및 식별자 전송
 */
export async function sendRewardPostback(userId: string, usrKey: string, amount: number) {
  console.log(`[Reward Service] 포스트백 시작 - User: ${userId} (Key: ${usrKey})`);
  console.log(`[Reward Service] 지급 예정 금액: ${amount} KRW`);
  
  // 네트워크 지연 시뮬레이션
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  // 실제 구현 예시 (주석 처리됨):
  // const response = await fetch('/api/reward', {
  //   method: 'POST',
  //   body: JSON.stringify({ userId, usrKey, amount })
  // });
  
  return { success: true, message: '보상이 성공적으로 지급되었습니다!' };
}

/**
 * 중복 없는 임시 사용자 ID 생성을 위한 유틸리티 함수
 * 영문 대문자와 숫자가 섞인 6자리 ID 반환
 */
export function generateUserId() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}
