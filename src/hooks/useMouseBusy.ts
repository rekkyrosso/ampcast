import {useEffect, useState} from 'react';
import {debounceTime, fromEvent, tap} from 'rxjs';

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
