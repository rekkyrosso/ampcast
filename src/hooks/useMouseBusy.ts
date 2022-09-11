import {useEffect, useState} from 'react';
import {fromEvent} from 'rxjs';
import {debounceTime, tap} from 'rxjs/operators';

export default function useMouseBusy(element: HTMLElement | null, idleTime = 200): boolean {
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (element) {
            const subscription = fromEvent<MouseEvent>(element, 'mousemove')
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
