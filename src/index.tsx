import React, {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import 'styles/index.scss';
import App from 'components/App';

console.log('module::index');

createRoot(document.getElementById('app')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
