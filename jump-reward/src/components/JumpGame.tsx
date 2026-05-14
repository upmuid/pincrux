import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RefreshCcw } from 'lucide-react';
import confetti from 'canvas-confetti';
import { 
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  orderBy,
  limit,
  serverTimestamp,
  type DocumentData
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  GAME_WIDTH, 
  GAME_HEIGHT, 
  PLAYER_RADIUS, 
  PLATFORM_WIDTH, 
  PLATFORM_HEIGHT, 
  JUMP_VELOCITY, 
  GRAVITY,
  INITIAL_TIME, 
  PLATFORM_GAP 
} from '../constants';

// --- Types ---
/** 플랫폼의 종류: 일반, 위험, 보너스 */
enum PlatformType {
  NORMAL = 'NORMAL',
  HARD = 'HARD',
  BONUS = 'BONUS'
}

/** Firestore 작업 종류 정의 (에러 로깅용) */
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
  }
}

const handleFirestoreError = (error: unknown, operationType: OperationType, path: string | null) => {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: null, // No auth integrated yet beyond password
      email: null,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
};

interface Platform {
  id: string;
  x: number;
  y: number;
  type: PlatformType;
  speed: number;
  direction: number;
  hasItem: boolean;
  isFalling?: boolean;
}

// --- Main Wrapper ---
/**
 * JumpGame Component
 * 
 * 플랫폼을 딛고 올라가는 물리 기반 점프 게임입니다.
 * 주요 기능:
 * - 사용자 식별 및 ID 매핑 (usrkey -> random 8자 ID)
 * - 일회성 플레이 제한 (3회) 및 광고 시청을 통한 충전
 * - 실시간 글로벌 랭킹 연동 (Firestore)
 * - 관리자 패널을 통한 게임 밸런스 조정 (속도, 난이도 등)
 */
const JumpGame: React.FC = () => {
  const [gameKey, setGameKey] = useState(0);
  const [usrKey, setUsrKey] = useState<string>('');
  const [pinKey, setPinKey] = useState<string>('');
  const [yourKey, setYourKey] = useState<string>('');
  const [playsUsed, setPlaysUsed] = useState(0);
  const [rechargedToday, setRechargedToday] = useState(false);
  const playsUsedRef = useRef(0);
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  
  // High score persistent storage
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('ari_jump_high_score');
    return saved ? parseInt(saved, 10) : 0;
  });

  // 110: 컴포넌트 마운트 시 사용자 데이터 로드
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const uKey = params.get('usrkey') || 'test_user';
    const pKey = params.get('pinkey') || '';
    setUsrKey(uKey);
    setPinKey(pKey);

    const initUserData = async () => {
      try {
        // 1. 사용자 Unique ID 매핑 (사용자 개인정보 보호를 위해 내부 ID 사용)
        const mappingDoc = await getDoc(doc(db, 'userMappings', uKey));
        let yKey = '';
        if (mappingDoc.exists()) {
          yKey = mappingDoc.data().yourKey;
        } else {
          // 일관된 ID 생성을 위한 간단한 해시 로직
          const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; 
          let hashValue = 0;
          for (let i = 0; i < uKey.length; i++) {
            hashValue = ((hashValue << 5) - hashValue) + uKey.charCodeAt(i);
            hashValue |= 0;
          }
          hashValue = Math.abs(hashValue);
          
          let result = '';
          for (let i = 0; i < 8; i++) {
            result += chars.charAt((hashValue + i * 31) % chars.length);
          }
          yKey = result;
          await setDoc(doc(db, 'userMappings', uKey), { yourKey: yKey, originalKey: uKey, createdAt: serverTimestamp() });
        }
        setYourKey(yKey);

        // 2. 오늘의 플레이 횟수 확인 (Daily Limit)
        if (uKey === 'test_user') {
          setPlaysUsed(0);
          playsUsedRef.current = 0;
          setRechargedToday(false);
        } else {
          const today = new Date().toISOString().split('T')[0];
          const statsId = `${uKey}_${today}`;
          const statsDoc = await getDoc(doc(db, 'dailyStats', statsId));
          if (statsDoc.exists()) {
            const data = statsDoc.data();
            const used = data.playsCount || 0;
            setPlaysUsed(used);
            playsUsedRef.current = used;
            setRechargedToday(data.rechargedToday || false);
          }
        }
        setIsDataLoaded(true);
      } catch (err) {
        console.error('Data init failed:', err);
        setYourKey(uKey.substring(0, 8).toUpperCase().replace(/[^A-Z0-9]/g, 'X'));
        setIsDataLoaded(true);
      }
    };

    initUserData();
  }, []);

  const handleSetHighScore = (newScore: number) => {
    if (newScore > highScore) {
      setHighScore(newScore);
      localStorage.setItem('ari_jump_high_score', newScore.toString());
    }
  };

  const handleReset = () => {
    setGameKey(prev => prev + 1);
  };

  const updatePlaysUsed = (newUsed: number) => {
    setPlaysUsed(newUsed);
    playsUsedRef.current = newUsed;
  };

  return (
    <div className="fixed inset-0 h-[100dvh] bg-[#f0f9f4] flex items-center justify-center font-sans overflow-hidden select-none">
      <GameInstance 
        key={gameKey} 
        highScore={highScore} 
        onSetHighScore={handleSetHighScore} 
        onReset={handleReset}
        usrKey={usrKey}
        pinKey={pinKey}
        yourKey={yourKey}
        playsUsed={playsUsed}
        rechargedToday={rechargedToday}
        setRechargedToday={setRechargedToday}
        updatePlaysUsed={updatePlaysUsed}
        isDataLoaded={isDataLoaded}
      />
    </div>
  );
};

interface GameInstanceProps {
  highScore: number;
  onSetHighScore: (score: number) => void;
  onReset: () => void;
  usrKey: string;
  pinKey: string;
  yourKey: string;
  playsUsed: number;
  updatePlaysUsed: (count: number) => void;
  rechargedToday: boolean;
  setRechargedToday: (val: boolean) => void;
  isDataLoaded: boolean;
}

const GameInstance: React.FC<GameInstanceProps> = ({ 
  highScore, onSetHighScore, onReset, usrKey, pinKey, yourKey, playsUsed, updatePlaysUsed, rechargedToday, setRechargedToday, isDataLoaded 
}) => {
  // State
  const [gameState, setGameState] = useState<'START' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER'>('START');
  const [countdownValue, setCountdownValue] = useState(0);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [playerY, setPlayerY] = useState(Math.round(GAME_HEIGHT * 0.66) - PLAYER_RADIUS);
  const [playerX, setPlayerX] = useState(GAME_WIDTH / 2);
  const [cameraY, setCameraY] = useState(0);
  const [isAdPlaying, setIsAdPlaying] = useState(false);
  const [rewardEarned, setRewardEarned] = useState(false);
  const [showRanking, setShowRanking] = useState(false);
  
  const [showAdPopup, setShowAdPopup] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const playsUsedRef = useRef(playsUsed);
  useEffect(() => {
    playsUsedRef.current = playsUsed;
  }, [playsUsed]);

  // Admin Settings State
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [isAdminPanelOpen, setIsAdminPanelOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [adminSettings, setAdminSettings] = useState({
    allowedTypes: [PlatformType.NORMAL, PlatformType.HARD, PlatformType.BONUS],
    speedMultiplier: 1.0,
    startHeightFactor: 0.66,
  });

  const [fireRankings, setFireRankings] = useState<any[]>([]);

  // --- INITIALIZATION ---
  useEffect(() => {
    const initGameConfig = async () => {
      try {
        // 0. Fetch Admin Config
        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
        if (settingsDoc.exists()) {
          const data = settingsDoc.data();
          setAdminSettings({
            allowedTypes: data.allowedTypes || [PlatformType.NORMAL, PlatformType.HARD, PlatformType.BONUS],
            speedMultiplier: data.speedMultiplier ?? 1.0,
            startHeightFactor: data.startHeightFactor ?? 0.66,
          });
        }
      } catch (err) {
        console.error('Config fetch failed:', err);
      }
    };

    initGameConfig();
  }, []);

  const fetchRankings = useCallback(async () => {
    try {
      const q = query(collection(db, 'rankings'), orderBy('score', 'desc'), limit(10));
      const querySnapshot = await getDocs(q);
      let rankings: any[] = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Fallback mock data if empty
      if (rankings.length === 0) {
        rankings = [
          { id: 'mock-1', name: 'R8X2K9P1', score: 10, yourKey: 'R8X2K9P1', timestamp: new Date() },
          { id: 'mock-2', name: 'J4N7M3V5', score: 8, yourKey: 'J4N7M3V5', timestamp: new Date() },
          { id: 'mock-3', name: 'L2B6Q9W4', score: 5, yourKey: 'L2B6Q9W4', timestamp: new Date() },
          { id: 'mock-4', name: 'T5Z1H8Y2', score: 3, yourKey: 'T5Z1H8Y2', timestamp: new Date() },
          { id: 'mock-5', name: 'A3C7E9G4', score: 1, yourKey: 'A3C7E9G4', timestamp: new Date() },
        ];
      }
      
      setFireRankings(rankings);
    } catch (error) {
       console.error('Rankings fetch failed, using fallback:', error);
       // Ensure we have something even on error
       setFireRankings([
         { id: 'mock-1', name: 'R8X2K9P1', score: 10, yourKey: 'R8X2K9P1', timestamp: new Date() },
         { id: 'mock-2', name: 'J4N7M3V5', score: 8, yourKey: 'J4N7M3V5', timestamp: new Date() },
         { id: 'mock-3', name: 'L2B6Q9W4', score: 5, yourKey: 'L2B6Q9W4', timestamp: new Date() },
         { id: 'mock-4', name: 'T5Z1H8Y2', score: 3, yourKey: 'T5Z1H8Y2', timestamp: new Date() },
         { id: 'mock-5', name: 'A3C7E9G4', score: 1, yourKey: 'A3C7E9G4', timestamp: new Date() },
       ]);
    }
  }, []);
  
  // Refs for physics (to avoid re-renders on every animation frame)
  const playerRef = useRef({
    x: GAME_WIDTH / 2,
    y: Math.round(GAME_HEIGHT * 0.66) - PLAYER_RADIUS,
    vy: 0,
    radius: PLAYER_RADIUS,
    hasJumped: false // Added to restrict multi-jumps
  });
  
  const platformsRef = useRef<Platform[]>([]);
  const gameStateRef = useRef<'START' | 'COUNTDOWN' | 'PLAYING' | 'GAMEOVER'>('START');
  const cameraYRef = useRef(0);
  const targetCameraYRef = useRef(0);
  const frameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const scoreRef = useRef(0);
  const highestPlatformIndexRef = useRef(0);
  const currentPlatformIdRef = useRef<string | null>(null);
  
  // Initialize World
  useEffect(() => {
    const startY = Math.round(GAME_HEIGHT * adminSettings.startHeightFactor);
    const initialPlatforms: Platform[] = [];
    // Start PlatformstartY - 230
    initialPlatforms.push({
      id: 'start',
      x: GAME_WIDTH / 2,
      y: startY,
      type: PlatformType.NORMAL,
      speed: 0,
      direction: 0,
      hasItem: false
    });

    // Initial sequence
    let prevWasStatic = true;
    for (let i = 1; i <= 10; i++) {
      const p = generatePlatform(startY - i * PLATFORM_GAP, prevWasStatic);
      initialPlatforms.push(p);
      prevWasStatic = p.speed === 0;
    }

    platformsRef.current = initialPlatforms;
    setPlatforms([...initialPlatforms]);
    currentPlatformIdRef.current = 'start';
  }, [adminSettings.startHeightFactor, adminSettings.allowedTypes]);

  /**
   * 새로운 플랫폼(발판)을 생성합니다.
   * @param y 생성할 높이(Y 좌표)
   * @param forceMoving 무조건 움직이는 발판으로 생성할지 여부
   */
  const generatePlatform = (y: number, forceMoving: boolean = false): Platform => {
    const typeRoll = Math.random();
    let type = PlatformType.NORMAL;
    
    // 관리자 설정에 따른 가용한 난이도 필터링
    const availableTypes = adminSettings.allowedTypes;
    if (availableTypes.length > 0) {
      if (typeRoll < 0.2 && availableTypes.includes(PlatformType.BONUS)) type = PlatformType.BONUS;
      else if (typeRoll < 0.7 && availableTypes.includes(PlatformType.HARD)) type = PlatformType.HARD;
      else if (availableTypes.includes(PlatformType.NORMAL)) type = PlatformType.NORMAL;
      else type = availableTypes[0]; // 폴백
    }

    // 발판 이동 속도 결정 로직
    let isMoving = forceMoving || type !== PlatformType.NORMAL || Math.random() < 0.5;

    return {
      id: Math.random().toString(36).substr(2, 9),
      x: Math.random() * (GAME_WIDTH - PLATFORM_WIDTH) + PLATFORM_WIDTH / 2,
      y,
      type,
      // 관리자 설정의 속도 배율 적용
      speed: isMoving ? ( (Math.random() * 2.5 + 1.5) * adminSettings.speedMultiplier ) : 0,
      direction: Math.random() > 0.5 ? 1 : -1,
      hasItem: type === PlatformType.NORMAL && Math.random() < 0.3
    };
  };

  // --- CORE GAME ACTIONS ---
  
  /**
   * Triggers a jump.
   * If game hasn't started, initializes the play session.
   */
  const startGame = () => {
    if (playsUsed >= 3) {
      handleBonusPlayRequest();
      return;
    }
    setGameState('COUNTDOWN');
    gameStateRef.current = 'COUNTDOWN';
    setCountdownValue(3); 
    
    setTimeout(() => {
      setGameState('PLAYING');
      gameStateRef.current = 'PLAYING';
      lastTimeRef.current = performance.now(); // Reset time sync
    }, 1000);
  };

  /**
   * 점프 동작을 실행합니다.
   * 첫 번째 점프인 경우 게임을 시작 상태로 전환합니다.
   */
  const jump = () => {
    if (gameStateRef.current === 'GAMEOVER' || gameStateRef.current === 'COUNTDOWN' || isAdPlaying) return;
    
    // 초기 화면에서 탭 시 게임 시작
    if (gameStateRef.current === 'START') {
      startGame();
      return;
    }

    // 무한 점프 방지 (바닥에 있거나 이미 발판을 딛고 있을 때만 가능)
    if (!playerRef.current.hasJumped) {
      // 발판에서 뛰어오를 때 해당 발판이 떨어지도록 설정 (난이도 요소)
      if (currentPlatformIdRef.current) {
         const pIdx = platformsRef.current.findIndex(p => p.id === currentPlatformIdRef.current);
         if (pIdx !== -1) {
           platformsRef.current[pIdx].isFalling = true;
         }
      }
      
      playerRef.current.vy = JUMP_VELOCITY;
      playerRef.current.hasJumped = true; // 착지할 때까지 추가 점프 불가
      currentPlatformIdRef.current = null; // 공중 상태로 전환
    }
  };

  const closeGame = () => {
    // Attempt to close the window
    window.close();
    // Fallback for environments where window.close() is blocked
    onReset();
  };

  /**
   * Submit current score to the global ranking table.
   * Uses 'yourKey' (the internal random-ish ID) for display to protect privacy.
   */
  const handleRankingRegistration = async () => {
    setIsSyncing(true);
    try {
      const rankingId = `${usrKey}_${Date.now()}`;
      await setDoc(doc(db, 'rankings', rankingId), {
        userKey: usrKey,
        yourKey: yourKey,
        name: yourKey, 
        score: scoreRef.current,
        timestamp: serverTimestamp()
      });

      await fetchRankings();
      setShowRanking(true);
      setRewardEarned(true);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'rankings');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleBonusPlayRequest = () => {
    if (rechargedToday) {
      alert('오늘은 이미 충전하셨습니다. 내일 다시 시도해주세요!');
      return;
    }
    setShowAdPopup(true);
  };

  const handleAdClick = async () => {
    setIsAdPlaying(true);
    // Mark that we are awaiting a recharge from naver redirect
    sessionStorage.setItem(`recharge_pending_${usrKey}`, 'true');
    
    // Redirect to Naver as requested
    setTimeout(() => {
      window.location.href = 'https://www.naver.com';
    }, 1000);
  };

  // Check for pending recharge on mount and focus
  useEffect(() => {
    const checkRecharge = async () => {
      if (sessionStorage.getItem(`recharge_pending_${usrKey}`) === 'true') {
        sessionStorage.removeItem(`recharge_pending_${usrKey}`);
        
        const today = new Date().toISOString().split('T')[0];
        const statsId = `${usrKey}_${today}`;
        
        try {
          if (usrKey !== 'test_user') {
            await setDoc(doc(db, 'dailyStats', statsId), {
              playsCount: 0,
              rechargedToday: true
            }, { merge: true });
          }
    
          updatePlaysUsed(0);
          setRechargedToday(true);
          setToast('플레이 기회가 충전되었습니다! 🍊');
          setTimeout(() => setToast(null), 3000);
        } catch (err) {
          console.error('Auto recharge failed:', err);
        }
      }
    };

    const handleFocus = () => checkRecharge();
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') checkRecharge();
    });
    
    checkRecharge();
    return () => {
      window.removeEventListener('focus', handleFocus);
    };
  }, [usrKey, updatePlaysUsed]);

  // Timer
  useEffect(() => {
    if (gameState !== 'PLAYING') return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          endGame();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  /**
   * --- GAME OVER LOGIC ---
   * Called when player falls off screen or time runs out.
   * Handles score saving, play count increment, and automatic ranking submission.
   */
  const endGame = async () => {
    if (gameStateRef.current === 'GAMEOVER') return;
    setGameState('GAMEOVER');
    gameStateRef.current = 'GAMEOVER';
    onSetHighScore(scoreRef.current);

    // Increment play count
    const newCount = playsUsedRef.current + 1;
    updatePlaysUsed(newCount);
    
    // 1. Sync daily stats
    try {
      if (usrKey !== 'test_user') {
        const today = new Date().toISOString().split('T')[0];
        const statsId = `${usrKey}_${today}`;
        await setDoc(doc(db, 'dailyStats', statsId), { playsCount: newCount }, { merge: true });
      }

      if (newCount === 3) {
        // Actual postback trigger simulation
        const postbackUrl = `https://tracking.example.com/postback?usrkey=${usrKey}&pinkey=${pinKey}`;
        console.log('Triggering postback:', postbackUrl);
        setToast(`POSBACK SENT: 3rd Play Completed!`);
        
        // Use fetch for real postback attempt
        fetch(postbackUrl, { mode: 'no-cors' }).catch(e => console.log('Postback failed ignored', e));
        
        setTimeout(() => setToast(null), 5000);
      }
    } catch (err) {
      console.error('Stats sync failed:', err);
    }

    // 2. Auto-Submit Ranking
    try {
      const rankingId = `${usrKey}_${Date.now()}`;
      await setDoc(doc(db, 'rankings', rankingId), {
        userKey: usrKey,
        yourKey: yourKey,
        name: yourKey, 
        score: scoreRef.current,
        timestamp: serverTimestamp()
      });
      // Explicitly wait for refresh to ensure ranking shows up on 3rd round too
      await fetchRankings();
    } catch (err) {
      console.error('Auto-ranking failed:', err);
    }
  };

  // 607: 핵심 게임 루프 (RAF 기반 물리 시뮬레이션)
  useEffect(() => {
    const loop = (time: number) => {
      if (gameStateRef.current === 'GAMEOVER') {
        lastTimeRef.current = 0;
        return;
      }

      // Delta Time 계산 (기기 성별에 따른 프레임 편차 보정)
      if (!lastTimeRef.current) lastTimeRef.current = time;
      const rawDt = time - lastTimeRef.current;
      const dt = Math.min(rawDt / 16.67, 3); // 탭 전환 등으로 인한 비정상적인 dt 폭주 방지
      lastTimeRef.current = time;
      
      // 1. 플레이어 물리 계산
      if (gameStateRef.current !== 'START') {
        playerRef.current.vy += GRAVITY * dt;
        playerRef.current.y += playerRef.current.vy * dt;

        // 발판 고착 물리 (발판을 딛고 있을 때 이동 동기화)
        if (currentPlatformIdRef.current) {
          const currentP = platformsRef.current.find(p => p.id === currentPlatformIdRef.current);
          if (currentP) {
            // 발판의 좌우 이동량을 플레이어에게 전달
            playerRef.current.x += currentP.speed * currentP.direction * dt;
            
            // 발판 표면에 플레이어 고정
            playerRef.current.y = currentP.y - PLATFORM_HEIGHT / 2 - playerRef.current.radius;
            playerRef.current.vy = 0;

            // 좌우 범위를 벗어났는지 체크 (낙하 유발)
            if (
              playerRef.current.x + 5 < currentP.x - PLATFORM_WIDTH / 2 ||
              playerRef.current.x - 5 > currentP.x + PLATFORM_WIDTH / 2
            ) {
              currentPlatformIdRef.current = null;
            }
          } else {
            currentPlatformIdRef.current = null;
          }
        }
        
        // 화면 좌우 벽 충돌 처리
        playerRef.current.x = Math.max(PLAYER_RADIUS, Math.min(GAME_WIDTH - PLAYER_RADIUS, playerRef.current.x));
      }

      // 2. 충돌 감지 (낙하 중일 때만 체크)
      if (playerRef.current.vy > 0) {
        for (const p of platformsRef.current) {
          const px = p.x;
          const py = p.y;
          
          const slipMargin = 20; // 발판 끝자락에서 미끄러지는 효과 마진
          const distFromCenter = Math.abs(playerRef.current.x - px);

          if (distFromCenter < PLATFORM_WIDTH / 2) {
            // 수직 방향 충돌 체크
            const prevY = playerRef.current.y - playerRef.current.vy * dt;
            if (prevY <= py - PLATFORM_HEIGHT / 2 && playerRef.current.y >= py - PLATFORM_HEIGHT / 2) {
              
              // 발판 끝자락 낙차 처리
              if (distFromCenter > PLATFORM_WIDTH / 2 - slipMargin) {
                playerRef.current.vy = 2; // 살짝 밀어내어 낙하 가속
                continue;
              }

              // 착지 성공!
              playerRef.current.y = py - PLATFORM_HEIGHT / 2 - playerRef.current.radius;
              playerRef.current.vy = 0;
              playerRef.current.hasJumped = false; 
              currentPlatformIdRef.current = p.id; 

              // 아이템(귤) 획득 처리
              if (p.hasItem) {
                p.hasItem = false;
                setTimeLeft(t => t + 5); // 시간 5초 연장
                confetti({ particleCount: 30, spread: 50, origin: { y: 0.7 } });
              }

              // 카메라 추적 로직 (일정 높이 이상 올라가면 화면 스크롤)
              const startY = Math.round(GAME_HEIGHT * adminSettings.startHeightFactor);
              const desiredCameraY = Math.max(cameraYRef.current, (startY - 80) - py);
              if (desiredCameraY > cameraYRef.current) {
                targetCameraYRef.current = desiredCameraY;
                
                // 도달한 높이에 기반한 점수 계산
                const platformIndex = Math.round((startY - py) / PLATFORM_GAP);
                if (platformIndex > highestPlatformIndexRef.current) {
                  highestPlatformIndexRef.current = platformIndex;
                  setScore(platformIndex);
                  scoreRef.current = platformIndex;
                }
              }
              break;
            }
          }
        }
      }

      // 3. Platform Movement & Falling
      platformsRef.current.forEach(p => {
        if (p.isFalling) {
          p.y += 10 * dt; // Fall speed
        } else if (p.speed > 0) {
          p.x += p.speed * p.direction * dt;
          if (p.x > GAME_WIDTH - PLATFORM_WIDTH / 2) p.direction = -1;
          if (p.x < PLATFORM_WIDTH / 2) p.direction = 1;
        }
      });
      
      // Filter out platforms that fell too far
      platformsRef.current = platformsRef.current.filter(p => !p.isFalling || p.y + cameraYRef.current < GAME_HEIGHT + 100);

      // 4. Camera Smoothing - Consistent arrival time
      if (cameraYRef.current < targetCameraYRef.current) {
        const dist = targetCameraYRef.current - cameraYRef.current;
        cameraYRef.current += dist * 0.12 * dt; 
        setCameraY(cameraYRef.current);
      }

      // 5. Infinite Platform Generation
      const highestP = platformsRef.current[platformsRef.current.length - 1];
      if (highestP && highestP.y + cameraYRef.current > -200) {
        const prevWasStatic = highestP.speed === 0;
        const nextP = generatePlatform(highestP.y - PLATFORM_GAP, prevWasStatic);
        platformsRef.current.push(nextP);
        
        // Clean up old platforms
        if (platformsRef.current.length > 30) {
          platformsRef.current.shift();
        }
      }

      // 6. Death Check (Falling off screen)
      if (playerRef.current.y + cameraYRef.current > GAME_HEIGHT) {
        endGame();
      }

      // Update Visuals
      setPlayerX(playerRef.current.x);
      setPlayerY(playerRef.current.y);
      setPlatforms([...platformsRef.current]);

      frameRef.current = requestAnimationFrame(loop);
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [adminSettings.startHeightFactor, generatePlatform]);

  const resetRankings = async () => {
    if (!window.confirm('모든 랭킹 데이터를 초기화하시겠습니까?')) return;
    setIsSyncing(true);
    try {
      const q = query(collection(db, 'rankings'));
      const querySnapshot = await getDocs(q);
      // Firestore client doesn't have batch delete for collections easily, so we loop
      // For a small number of ranks, this is fine.
      for (const d of querySnapshot.docs) {
        await deleteDoc(doc(db, 'rankings', d.id));
      }
      setFireRankings([]);
      alert('랭킹 초기화 완료.');
    } finally {
      setIsSyncing(false);
    }
  };

  const saveAdminSettings = async () => {
    setIsSyncing(true);
    try {
      await setDoc(doc(db, 'settings', 'global'), {
        ...adminSettings,
        updatedAt: serverTimestamp()
      });
      setIsAdminPanelOpen(false);
      onReset();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'settings/global');
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePasswordSubmit = () => {
    if (passwordInput === '1322') {
      setIsAdminPanelOpen(true);
      setShowPasswordInput(false);
    } else {
      setPasswordInput('');
      alert('비밀번호가 틀렸습니다.');
    }
  };

  useEffect(() => {
    fetchRankings();
  }, [fetchRankings]);

  const togglePlatformType = (type: PlatformType) => {
    setAdminSettings(prev => {
      const isIncluded = prev.allowedTypes.includes(type);
      if (isIncluded && prev.allowedTypes.length === 1) return prev; // Must have at least one
      return {
        ...prev,
        allowedTypes: isIncluded 
          ? prev.allowedTypes.filter(t => t !== type)
          : [...prev.allowedTypes, type]
      };
    });
  };

  const buttonLabel = (() => {
    if (showRanking) return 'CLOSE';
    const remaining = Math.max(0, 3 - playsUsed);
    if (gameState === 'START') {
       if (playsUsed < 3) return `START (${remaining}/3)`;
       return rechargedToday ? '내일 다시 만나요' : '광고보고 기회 충전 📺';
    }
    if (gameState === 'GAMEOVER') {
      if (playsUsed < 3) return `RETRY (${remaining}/3)`;
      return rechargedToday ? '내일 다시 만나요' : '광고보고 기회 충전 📺';
    }
    return 'JUMP';
  })();

  const buttonAction = () => {
    if (showRanking) {
      setShowRanking(false);
    } else if (gameState === 'GAMEOVER') {
      if (playsUsed < 3) {
        onReset();
      } else {
        handleBonusPlayRequest();
      }
    } else if (gameState === 'START') {
      startGame();
    } else {
      jump();
    }
  };

  return (
    <div id="game-instance-container" className="w-full h-full flex items-center justify-center overflow-hidden bg-[#f0f9f4]">
      <div id="game-frame" className="w-full h-full max-w-[500px] relative bg-[#036635] shadow-2xl overflow-hidden flex flex-col">
        
        {/* 1. Top Banner (Fixed) */}
        <div id="game-top-banner" className="w-full h-12 bg-gradient-to-r from-[#024d28] to-[#036635] shrink-0 flex items-center justify-center border-b border-white/20 z-[100] relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
          <div className="flex items-center gap-2 relative z-10 px-4 text-center">
             <div className="w-6 h-6 bg-white/20 rounded-lg flex items-center justify-center text-sm shadow-inner ring-1 ring-white/30 backdrop-blur-sm shrink-0">🏆</div>
             <p className="text-white font-black text-[10px] sm:text-xs uppercase tracking-wider drop-shadow-sm leading-tight">
               높이 올라갈수록 더 큰 보상이 기다립니다!
             </p>
          </div>
        </div>

        {/* 2. Main Game/Overlay Area (Flexible) */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          
          {/* HUD (Overlays the stage) */}
          <div id="game-hud" className="absolute top-0 left-0 right-0 z-30 p-3 pt-6 text-center pointer-events-none">
            <div className="flex flex-col items-center gap-2">
              <div className="flex items-center gap-3">
                <h2 className="text-white text-lg font-bold drop-shadow-sm italic">TIME: {timeLeft}S</h2>
                <div className="w-24 h-2 bg-white/20 rounded-full border border-white/40 overflow-hidden shadow-inner">
                    <motion.div 
                      className="h-full bg-white"
                      animate={{ width: `${(timeLeft / INITIAL_TIME) * 100}%` }}
                      transition={{ ease: 'linear' }}
                    />
                </div>
              </div>
              <span className="text-white text-5xl font-black italic drop-shadow-md leading-none">{score}</span>
            </div>
          </div>

          {/* Game Stage (The physics world) */}
          <div 
            className="flex-1 relative cursor-pointer"
            onClick={jump}
          >
            <div 
              className="absolute inset-0 transition-transform duration-75 ease-out"
              style={{ transform: `translateY(${cameraY}px)` }}
            >
              {platforms.map(p => (
                <motion.div 
                  key={p.id}
                  initial={false}
                  animate={p.isFalling ? { opacity: 0.5, scale: 0.95 } : {}}
                  className="absolute border-b-2 border-black/10 overflow-hidden shadow-sm transition-opacity"
                  style={{
                    left: p.x - PLATFORM_WIDTH / 2,
                    top: p.y - PLATFORM_HEIGHT / 2,
                    width: PLATFORM_WIDTH,
                    height: PLATFORM_HEIGHT,
                    backgroundColor: p.type === PlatformType.NORMAL ? '#fbbf24' : p.type === PlatformType.HARD ? '#ef4444' : '#4fc3f7',
                    borderRadius: '10px',
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 15px, rgba(255,255,255,0.2) 15px, rgba(255,255,255,0.4) 30px)'
                  }}
                >
                  {p.hasItem && !p.isFalling && (
                     <motion.div 
                      animate={{ y: [0, -4, 0], scale: [1, 1.1, 1] }}
                      transition={{ repeat: Infinity, duration: 2 }}
                      className="absolute -top-10 left-1/2 -translate-x-1/2 w-8 h-8 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center text-[10px] shadow-lg"
                     >
                       🍊
                     </motion.div>
                  )}
                </motion.div>
              ))}

              {/* High Score Line */}
              {highScore > 0 && (
                <div 
                  className="absolute w-full border-t-2 border-dashed border-white/30 flex items-center justify-end pr-4"
                  style={{ top: Math.round(GAME_HEIGHT * adminSettings.startHeightFactor) - (highScore * PLATFORM_GAP) }}
                >
                  <span className="text-white/40 text-[10px] font-black uppercase tracking-widest bg-white/10 px-2 py-0.5 rounded">Best Score</span>
                </div>
              )}

              {/* Character */}
              <div 
                className="absolute z-10"
                style={{
                  left: playerX - PLAYER_RADIUS,
                  top: playerY - PLAYER_RADIUS,
                  width: PLAYER_RADIUS * 2,
                  height: PLAYER_RADIUS * 2
                }}
              >
                <div className="relative w-full h-full bg-yellow-300 rounded-full border-2 border-black/10 shadow-lg overflow-hidden flex items-center justify-center">
                  <div className="absolute top-[30%] left-[20%] w-2 h-3 bg-black rounded-full overflow-hidden">
                     <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="absolute top-[30%] right-[20%] w-2 h-3 bg-black rounded-full overflow-hidden">
                     <div className="absolute top-0.5 right-0.5 w-1 h-1 bg-white rounded-full" />
                  </div>
                  <div className="absolute top-[50%] left-0 w-3 h-1.5 bg-pink-400/50 rounded-full blur-[1px]" />
                  <div className="absolute top-[50%] right-0 w-3 h-1.5 bg-pink-400/50 rounded-full blur-[1px]" />
                  <div className="absolute top-[55%] left-1/2 -translate-x-1/2 w-3.5 h-2.5 bg-orange-500 rounded-full shadow-inner" />
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4 h-2 bg-pink-500 rounded-b-full opacity-60" />
                </div>
                {gameState === 'PLAYING' && (
                  <>
                    <motion.div animate={{ rotate: [-20, 20, -20] }} transition={{ repeat: Infinity, duration: 0.2 }} className="absolute -left-2 top-1/2 w-4 h-3 bg-yellow-400 rounded-full origin-right" />
                    <motion.div animate={{ rotate: [20, -20, 20] }} transition={{ repeat: Infinity, duration: 0.2 }} className="absolute -right-2 top-1/2 w-4 h-3 bg-yellow-400 rounded-full origin-left" />
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Overlays (Only cover the game stage + hud, not banner/bottom button) */}
          <AnimatePresence>
            {gameState === 'COUNTDOWN' && (
              <motion.div 
                initial={{ opacity: 0, scale: 2 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-40 bg-black/20 flex flex-col items-center justify-center pointer-events-none"
              >
                <motion.div 
                  initial={{ scale: 1.5 }} animate={{ scale: 1 }}
                  className="text-white text-8xl font-black italic drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"
                >
                  READY?
                </motion.div>
              </motion.div>
            )}

            {gameState === 'START' && (
               <motion.div 
                 id="start-screen"
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                 className="absolute inset-0 z-40 bg-[#036635]/80 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
                 onClick={(e) => { e.stopPropagation(); jump(); }}
               >
                  <h1 className="text-white text-7xl font-black italic tracking-tighter mb-4 drop-shadow-2xl">JUMP<br/>REWARD</h1>
                  <div className="bg-[#036635]/40 px-10 py-8 rounded-[3rem] border border-white/40 backdrop-blur-2xl shadow-2xl text-center max-w-[320px] mx-auto ring-1 ring-white/20">
                    <div className="relative">
                      <p className="text-white/70 text-[11px] font-black uppercase tracking-[0.2em] mb-3 leading-none drop-shadow-sm">USER IDENTIFIER</p>
                      <p className="text-white text-3xl font-mono font-black tracking-widest leading-tight break-all drop-shadow-md select-all">
                        {yourKey || <span className="opacity-40 animate-pulse">GENERATING...</span>}
                      </p>
                    </div>
                  </div>
                  <motion.p animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.5 }} className="mt-8 text-white font-black italic tracking-[0.25em] text-sm opacity-90 drop-shadow-lg">
                    {!isDataLoaded ? 'LOADING...' : (playsUsed < 3 ? 'TAP TO START' : (rechargedToday ? '내일 다시 만나요' : '광고보고 기회 충전'))}
                  </motion.p>
                  
                  {/* Hidden Admin Trigger */}
                  <div className="absolute top-0 right-0 w-20 h-20 z-[60]" onClick={(e) => { e.stopPropagation(); setShowPasswordInput(true); }} />
               </motion.div>
            )}

            {gameState === 'GAMEOVER' && (
              <motion.div 
                id="game-over-screen"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-[#036635]/95 flex flex-col items-center justify-center p-6 text-center backdrop-blur-md"
              >
                <div className="w-full max-w-xs overflow-y-auto max-h-full py-2">
                  <h2 id="game-over-title" className="text-white text-4xl font-black italic mb-4 drop-shadow-lg leading-tight uppercase">GAME OVER</h2>
                  
                  <div id="game-over-score-card" className="bg-white/20 p-4 rounded-2xl w-full mb-4 backdrop-blur-sm border border-white/30 shadow-lg text-white grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Score</p>
                      <p className="text-3xl font-black italic tracking-tighter">{score}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">Best</p>
                      <p className="text-3xl font-black italic tracking-tighter">{highScore}</p>
                    </div>
                  </div>

                  <div className="w-full mb-4">
                    <h3 className="text-white/80 text-[10px] font-black uppercase tracking-widest mb-1 shadow-sm text-left px-2">TOP RANKING</h3>
                    <div className="bg-black/20 rounded-2xl p-2 space-y-1 border border-white/10 shadow-inner max-h-[160px] overflow-y-auto">
                      {fireRankings.map((r, idx) => {
                        const isMe = r.yourKey === yourKey && yourKey !== '' && yourKey !== 'test_user';
                        // Special handling for test_user: only count as 'ME' if we are matching the specific record (though it's unlikely to be useful)
                        // Actually, let's keep it simple: if yourKey matches, it's YOU.
                        const finalIsMe = r.yourKey === yourKey && yourKey !== '';
                        
                        return (
                          <div key={idx} className={`flex items-center justify-between p-2 rounded-xl border ${finalIsMe ? 'bg-yellow-400 border-yellow-300 shadow-md transform scale-[1.02]' : 'bg-white/5 border-transparent'}`}>
                            <div className="flex items-center gap-2">
                              <span className={`text-[10px] font-black italic w-4 ${finalIsMe ? 'text-slate-900 opacity-60' : 'text-white opacity-50'}`}>#{idx + 1}</span>
                              <span className={`text-[11px] font-black tracking-tight truncate max-w-[120px] ${finalIsMe ? 'text-slate-900 bg-black/10 px-2 py-0.5 rounded-lg' : 'text-white'}`}>
                                {finalIsMe ? 'YOU' : (r.yourKey || 'GUEST')}
                              </span>
                            </div>
                            <span className={`text-[11px] font-black italic tracking-tighter ${finalIsMe ? 'text-slate-900' : 'text-white'}`}>{r.score}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div id="user-badges" className="flex items-center justify-center py-2 px-4 bg-[#024d28]/40 rounded-xl border border-white/10 mb-2 shadow-sm">
                     <p className="text-white/90 text-[10px] font-black uppercase tracking-widest shadow-sm">
                       MY RANKING: <span className="text-yellow-300 font-bold tracking-tight bg-black/20 px-2 py-0.5 rounded ml-1">
                         {fireRankings.findIndex(r => r.yourKey === yourKey) !== -1 
                           ? `#${fireRankings.findIndex(r => r.yourKey === yourKey) + 1}` 
                           : '-'}
                       </span>
                     </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* 3. Bottom Action Area (Fixed) */}
        <div id="bottom-action-container" className="p-4 pb-12 shrink-0 bg-white/20 z-[60] relative border-t border-white/20">
          <button 
            id="main-action-button"
            onMouseDown={(e) => { e.stopPropagation(); buttonAction(); }}
            onTouchStart={(e) => { e.stopPropagation(); e.preventDefault(); buttonAction(); }}
            className={`w-full h-16 rounded-full border-2 transition-all flex items-center justify-center shadow-[0_4px_0_#cbd5e1] active:translate-y-1 active:shadow-none ${
              playsUsed >= 3 ? 'bg-yellow-400 text-white border-yellow-300 shadow-lg' : 'bg-white text-[#036635] border-slate-200'
            }`}
          >
            <span className="text-2xl font-black italic uppercase tracking-tighter">
              {!isDataLoaded ? '...' : buttonLabel}
            </span>
          </button>
        </div>

        {/* Global Overlays (Cover EVERYTHING) */}
        <AnimatePresence>
          {showAdPopup && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[200] bg-black/90 flex flex-col items-center justify-center p-8 text-center">
              <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm space-y-6 shadow-2xl relative">
                <button onClick={() => setShowAdPopup(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600">✕</button>
                <div className="w-20 h-20 bg-[#f0f9f4] rounded-3xl mx-auto flex items-center justify-center text-4xl">📺</div>
                <div>
                  <h3 className="text-xl font-black text-slate-900 mb-2">무료 플레이를 위해<br/>광고를 시청하세요!</h3>
                  <p className="text-slate-500 text-sm">광고를 보고 돌아오면<br/>3회 플레이가 다시 충전됩니다.<br/><span className="text-[#036635] font-bold">(1일 1회 한정)</span></p>
                </div>
                <button onClick={handleAdClick} disabled={isAdPlaying} className="w-full bg-[#036635] text-white font-black py-4 rounded-2xl shadow-lg transform transition active:scale-95 disabled:opacity-50">
                  {isAdPlaying ? '시청 중...' : '광고 보러가기'}
                </button>
              </div>
            </motion.div>
          )}

          {isAdPlaying && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 z-[210] bg-black flex flex-col items-center justify-center p-8">
              <div className="w-full max-w-xs bg-white/10 rounded-2xl p-8 text-white text-center">
                 <div className="w-16 h-16 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-6" />
                 <h3 className="text-xl font-bold mb-2">AD Loading...</h3>
                 <p className="text-white/60 text-sm">잠시만 기다려주세요</p>
              </div>
            </motion.div>
          )}

          {showPasswordInput && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[220] bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8">
              <div className="bg-white rounded-3xl p-8 w-full max-w-xs shadow-2xl">
                <h3 className="text-slate-900 text-xl font-black mb-6 text-center">ADMIN AUTH</h3>
                <input type="password" placeholder="Password" value={passwordInput} autoFocus onChange={(e) => setPasswordInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()} className="w-full bg-slate-100 p-4 rounded-2xl mb-4 border-2 border-slate-200 outline-none focus:border-[#036635] transition-all font-mono text-center tracking-widest" />
                <div className="flex gap-2">
                  <button onClick={() => { setShowPasswordInput(false); setPasswordInput(''); }} className="flex-1 bg-slate-200 py-4 rounded-2xl font-bold text-slate-600 hover:bg-slate-300 transition-all">CANCEL</button>
                  <button onClick={handlePasswordSubmit} className="flex-1 bg-[#036635] py-4 rounded-2xl font-bold text-white shadow-lg hover:bg-[#036635]/80 transition-all">ACCESS</button>
                </div>
              </div>
            </motion.div>
          )}

          {isAdminPanelOpen && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-[230] bg-slate-900 flex flex-col p-8 overflow-y-auto">
              <h2 className="text-white text-3xl font-black mb-8 italic italic tracking-tight">ADMIN SETTINGS</h2>
              <div className="space-y-8 text-white">
                <section>
                  <h4 className="text-white/60 text-xs font-black uppercase tracking-widest mb-4">Platform Types</h4>
                  <div className="flex flex-wrap gap-2">
                    {Object.values(PlatformType).map(type => (
                      <button key={type} onClick={() => togglePlatformType(type)} className={`px-4 py-2 rounded-xl font-bold border-2 transition-all ${adminSettings.allowedTypes.includes(type) ? 'bg-[#036635] border-[#036635]/80 text-white' : 'bg-white/5 border-white/10 text-white/40'}`}>{type}</button>
                    ))}
                  </div>
                </section>
                <section>
                  <div className="flex justify-between items-end mb-4"><h4 className="text-white/60 text-xs font-black uppercase tracking-widest">Speed Multiplier</h4><span className="text-[#036635] font-bold">{adminSettings.speedMultiplier.toFixed(1)}x</span></div>
                  <input type="range" min="0" max="5" step="0.1" value={adminSettings.speedMultiplier} onChange={(e) => setAdminSettings(prev => ({ ...prev, speedMultiplier: parseFloat(e.target.value) }))} className="w-full accent-[#036635]" />
                </section>
                <section>
                  <div className="flex justify-between items-end mb-4"><h4 className="text-white/60 text-xs font-black uppercase tracking-widest">Initial Height</h4><span className="text-[#036635] font-bold">{(adminSettings.startHeightFactor * 100).toFixed(0)}%</span></div>
                  <input type="range" min="0.2" max="0.9" step="0.01" value={adminSettings.startHeightFactor} onChange={(e) => setAdminSettings(prev => ({ ...prev, startHeightFactor: parseFloat(e.target.value) }))} className="w-full accent-[#036635]" />
                </section>
                <section className="pt-4 border-t border-white/10">
                  <h4 className="text-white/60 text-xs font-black uppercase tracking-widest mb-4">Danger Zone</h4>
                  <button onClick={resetRankings} className="w-full bg-red-500 py-3 rounded-2xl font-bold flex items-center justify-center gap-2">
                    <RefreshCcw size={16} /> RESET RANKINGS
                  </button>
                </section>
                <div className="pt-8 mb-12">
                  <button onClick={saveAdminSettings} disabled={isSyncing} className="w-full bg-white text-slate-900 py-5 rounded-3xl font-black text-xl hover:bg-[#036635] hover:text-white transition-all shadow-xl disabled:opacity-50">{isSyncing ? 'SYNCING...' : 'SAVE & APPLY ALL'}</button>
                </div>
              </div>
            </motion.div>
          )}

          {toast && (
            <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 100 }} className="absolute bottom-32 left-6 right-6 z-[250] bg-slate-900 border-2 border-[#036635] p-4 rounded-2xl shadow-2xl">
              <p className="text-[#036635] text-[10px] font-black italic tracking-widest mb-1 uppercase">Postback Simulation</p>
              <p className="text-white font-mono text-xs break-all">{toast}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default JumpGame;
