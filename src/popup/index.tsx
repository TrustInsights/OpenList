// Popup entry point: mounts the React app

import { App } from '@/popup/App';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './tokens.css';
import './main.css';
import './panels.css';
import './adapt.css';

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Root element not found');

createRoot(rootElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);
