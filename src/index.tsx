import 'styles/index.scss';
import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from 'react-error-boundary';
import {Logger} from 'utils';
import {createErrorReport} from 'services/reporting';
import App from 'components/App';
import BSOD from 'components/Errors/BSOD';
import './registerServiceWorker';

Logger.createErrorReport = createErrorReport;

const uncaught = new Logger('uncaught');

window.onerror = __dev__ ? uncaught.error : uncaught.warn;

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <ErrorBoundary FallbackComponent={BSOD}>
            <App />
        </ErrorBoundary>
    </StrictMode>
);
