import {useEffect} from 'react';
import {browser} from 'utils';

export default function useBrowser(): void {
    useEffect(() => {
        const classList = document.body.classList;
        classList.add(`browser-${browser.name.replace(/\s+/g, '-')}`);
        if (browser.isElectron) {
            classList.add('electron');
            if (browser.os === 'Mac OS') {
                classList.add('electron-mac');
            }
        }
    }, []);
}
