import {useEffect} from 'react';
import {fromEvent, Subscription} from 'rxjs';

const app = document.getElementById('app')!;
const system = document.getElementById('system')!;

export default function useFocusClass(): void {
    useEffect(() => {
        const subscription = new Subscription();
        const subscribe = (root: HTMLElement) =>
            fromEvent(root, 'focusin').subscribe(() => {
                const prevActiveElement = root.querySelector('.focus');
                if (prevActiveElement !== document.activeElement) {
                    prevActiveElement?.classList.toggle('focus', false);
                    document.activeElement!.classList.toggle('focus', true);
                }
            });
        subscription.add(subscribe(app));
        subscription.add(subscribe(system));
        return () => subscription.unsubscribe();
    }, []);
}
