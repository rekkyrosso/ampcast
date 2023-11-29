import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'styles/index.scss';
import App from 'components/App';

if (!__electron__ && !__dev__) {
    window.addEventListener('load', () => {
        navigator.serviceWorker?.register('/service-worker.js');
    });
}

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
