import {useEffect, useState} from 'react';
import {debounceTime, fromEvent, merge, tap} from 'rxjs';

export default function useMouseBusy(element: HTMLElement | null, idleTime = 200): boolean {
    const [busy, setBusy] = useState(false);

    useEffect(() => {
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
    }, [element, idleTime]);

    return busy;
}
