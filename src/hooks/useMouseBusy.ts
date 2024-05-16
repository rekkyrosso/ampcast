import {useEffect, useState} from 'react';
import {debounceTime, fromEvent, merge, tap} from 'rxjs';

export default function useMouseBusy(
    target: React.RefObject<HTMLElement> | HTMLElement | null,
    idleTime = 200
): boolean {
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const element = getElement(target);
        if (element) {
            const fromMouseEvent = (type: string) => fromEvent<MouseEvent>(element, type);
            const subscription = merge(
                fromMouseEvent('mousemove'),
                fromMouseEvent('mousedown'),
                fromMouseEvent('mouseup')
            )
                .pipe(
                    tap(() => setBusy(true)),
                    debounceTime(idleTime),
                    tap(() => setBusy(false))
                )
                .subscribe();

            return () => subscription.unsubscribe();
        } else {
            setBusy(false);
        }
    }, [target, idleTime]);

    return busy;
}

function getElement(target: React.RefObject<HTMLElement> | HTMLElement | null): HTMLElement | null {
    return target && 'current' in target ? target.current : target;
}
