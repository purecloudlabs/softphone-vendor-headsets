import React = require("react");
import ReactDOM = require("react-dom");
import { Suspense } from "react";
// import './index.css';
import App from './App';
import './configs/i18n';

ReactDOM.render(
    <React.StrictMode>
        <Suspense fallback={<div>Loading i18n</div>}>
            <App />
        </Suspense>
    </React.StrictMode>,
    document.getElementById('root')
);