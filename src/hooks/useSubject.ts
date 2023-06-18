import {useCallback, useRef} from 'react';
import type {Observable} from 'rxjs';
import {Subject} from 'rxjs';

export default function useSubject<T>(): [Observable<T>, (next: T) => void] {
    const ref = useRef<Subject<T> | null>(null);

    if (ref.current === null) {
        ref.current = new Subject<T>();
    }

    const next = useCallback((value: T) => {
        ref.current!.next(value);
    }, []);

    return [ref.current, next];
}
