import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import SoyaAIApp from './SoyaAIApp.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SoyaAIApp />
  </StrictMode>,
);
