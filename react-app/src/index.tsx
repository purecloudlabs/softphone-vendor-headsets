import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import './config/i18n'

ReactDOM.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading i18n</div>}>
      <App />
    </Suspense>
  </React.StrictMode>,
  document.getElementById('root')
);