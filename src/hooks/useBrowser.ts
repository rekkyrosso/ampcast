import {useEffect} from 'react';
import {browser} from 'utils';

export default function useBrowser(): void {
    useEffect(() => {
        document.body.classList.add(`browser-${browser.name.replace(/\s+/g, '-')}`);
        if (__electron__) {
            document.body.classList.add('electron');
        }
    }, []);
}
