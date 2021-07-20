import {useEffect, useMemo, useState} from 'react';
import type {Observable} from 'rxjs';

export default function useObservable<T>(observe: () => Observable<T>, initialValue: T): T {
    const [value, setValue] = useState<T>(initialValue);
    const value$ = useMemo(observe, [observe]);

    useEffect(() => {
        const subscription = value$.subscribe(setValue);
        return () => subscription.unsubscribe();
    }, [value$]);

    return value;
}
