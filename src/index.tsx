import {Logger} from 'utils';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';
import 'styles/index.scss';
import App from 'components/App';
import BSOD from 'components/BSOD';

const uncaught = new Logger('uncaught');

window.onerror = __dev__ ? uncaught.error : uncaught.warn;

if (location.protocol === 'https:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js');
    });
}

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={BSOD}>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
