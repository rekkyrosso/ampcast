import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'styles/index.scss';
import App from 'components/App';
import {Logger} from 'utils';

window.onerror = new Logger('window').error;

if (location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
    });
}

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
