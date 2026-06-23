import { registerElements } from 'genesys-spark-components';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './config/i18n';

registerElements();
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Suspense fallback="i18n is loading">
      <App />
    </Suspense>
  </React.StrictMode>
)