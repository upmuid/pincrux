import { initializeApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

// Firebase 앱 초기화 및 서비스 내보내기
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); // Firestore DB 인스턴스
export const auth = getAuth(app); // 인증 서비스 (현재는 수동 익명 처리 위주)

/**
 * 가이드라인에 따른 Firestore 연결성 체크 함수입니다.
 * 앱 부팅 시 최소 1회 실행되어 DB 연결 상태를 확인합니다.
 */
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error: any) {
    if (error?.message?.includes('the client is offline')) {
      console.error("Firebase 설정을 확인해주세요 (오프라인 상태이거나 구성 오류).");
    }
  }
}
testConnection();
