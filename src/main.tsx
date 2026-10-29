import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/App';
import { RecoveryBoundary } from './app/Recovery';
import './app/global.css';
import './app/shell.css';
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <RecoveryBoundary english={document.documentElement.lang === 'en'}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RecoveryBoundary>
  </React.StrictMode>,
);
