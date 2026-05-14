/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import JumpGame from './components/JumpGame';

/**
 * 애플리케이션의 메인 레이아웃 컴포넌트입니다.
 * 전체 화면 중앙에 점프 게임 컴포넌트를 배치합니다.
 */
export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 flex items-center justify-center">
      <JumpGame />
    </main>
  );
}
