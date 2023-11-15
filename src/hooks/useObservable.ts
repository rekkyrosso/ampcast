import {useEffect, useState} from 'react';
import type {Observable} from 'rxjs';

export default function useObservable<T>(observe: () => Observable<T>, initialValue: T): T {
    const [value, setValue] = useState<T>(initialValue);

    useEffect(() => {
        const subscription = observe().subscribe(setValue);
        return () => subscription.unsubscribe();
    }, [observe]);

    return value;
}
