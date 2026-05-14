import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

/**
 * 애플리케이션의 진입점(Entry Point)입니다.
 * React StrictMode를 활성화하여 root 엘리먼트에 App 컴포넌트를 렌더링합니다.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
