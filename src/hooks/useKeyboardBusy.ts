import {useEffect, useState} from 'react';
import {fromEvent, merge, of, timer} from 'rxjs';
import {map, debounce} from 'rxjs/operators';

export default function useKeyboardBusy(debounceTime = 200): boolean {
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const fromKeyboardEvent = (type: string, busy: boolean) =>
            fromEvent<KeyboardEvent>(document, type, {capture: true}).pipe(map(() => busy));

        const busy$ = fromKeyboardEvent('keydown', true);
        const idle$ = fromKeyboardEvent('keyup', false);

        const subscription = merge(busy$, idle$)
            .pipe(debounce((busy) => (busy ? of(0) : timer(debounceTime))))
            .subscribe(setBusy);

        return () => subscription.unsubscribe();
    }, [debounceTime]);

    return busy;
}
