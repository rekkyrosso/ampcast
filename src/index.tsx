import 'styles/index.scss';
import React from 'react';
import {createRoot} from 'react-dom/client';
import App from 'components/App';

console.log('module::index');

createRoot(document.getElementById('app')!).render(<App />);
