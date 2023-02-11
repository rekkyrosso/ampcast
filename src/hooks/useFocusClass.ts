import {useEffect} from 'react';
import {fromEvent, Subscription} from 'rxjs';
import {stopPropagation} from 'utils';

const app = document.getElementById('app')!;
const system = document.getElementById('system')!;

export default function useFocusClass(): void {
    useEffect(() => {
        const subscription = new Subscription();
        const subscribe = (root: HTMLElement) =>
            fromEvent<FocusEvent>(root, 'focusin').subscribe(() => {
                const prevActiveElement = root.querySelector('.focus');
                if (prevActiveElement !== document.activeElement) {
                    prevActiveElement?.classList.toggle('focus', false);
                    document.activeElement!.classList.toggle('focus', true);
                }
            });
        subscription.add(
            fromEvent<FocusEvent>(document, 'focusout').subscribe((event: FocusEvent) => {
                if (!event.relatedTarget) {
                    const activeElements = document.querySelectorAll('.focus');
                    for (const activeElement of activeElements) {
                        activeElement.classList.toggle('focus', false);
                    }
                }
            })
        );
        subscription.add(fromEvent(system, 'mousedown').subscribe(stopPropagation));
        subscription.add(subscribe(app));
        subscription.add(subscribe(system));
        return () => subscription.unsubscribe();
    }, []);
}
