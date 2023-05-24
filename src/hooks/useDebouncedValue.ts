import {useEffect, useState} from 'react';
import {debounceTime} from 'rxjs';
import useSubject from './useSubject';

export default function useDebouncedValue<T>(initialValue: T, dueTime: number) {
    const [debouncedValue, setDebouncedValue] = useState<T>(initialValue);
    const [value$, nextValue] = useSubject<T>();

    useEffect(() => {
        const subscription = value$.pipe(debounceTime(dueTime)).subscribe(setDebouncedValue);
        return () => subscription.unsubscribe();
    }, [value$, dueTime]);

    return [debouncedValue, nextValue] as const;
}
