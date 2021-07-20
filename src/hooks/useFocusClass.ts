import {useEffect} from 'react';
import {fromEvent} from 'rxjs';

export default function useFocusClass(): void {
    useEffect(() => {
        const subscription = fromEvent(document, 'focusin').subscribe(() => {
            const prevActiveElement = document.querySelector('.focus');
            if (prevActiveElement !== document.activeElement) {
                prevActiveElement?.classList.toggle('focus', false);
                document.activeElement!.classList.toggle('focus', true);
            }
        });
        return () => subscription.unsubscribe();
    }, []);
}
