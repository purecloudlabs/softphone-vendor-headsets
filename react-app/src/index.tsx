/* istanbul ignore file */
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom';
import './index.css';
import App from './App';
import './config/i18n';

import decorateCefClient from './decorate-cef-client';

const hostedContext = decorateCefClient();

ReactDOM.render(
  <React.StrictMode>
    <Suspense fallback={<div>Loading i18n</div>}>
      <App hostedContext={hostedContext}/>
    </Suspense>
  </React.StrictMode>,
  document.getElementById('root')
);