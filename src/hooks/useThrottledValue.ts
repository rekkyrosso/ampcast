import {useEffect, useState} from 'react';
import {throttleTime, ThrottleConfig} from 'rxjs';
import useSubject from './useSubject';

export default function useThrottledValue<T>(
    initialValue: T,
    dueTime: number,
    {leading = true, trailing = false}: ThrottleConfig = {}
) {
    const [throttledValue, setThrottledValue] = useState<T>(initialValue);
    const [value$, nextValue] = useSubject<T>();

    useEffect(() => {
        const subscription = value$
            .pipe(throttleTime(dueTime, undefined, {leading, trailing}))
            .subscribe(setThrottledValue);
        return () => subscription.unsubscribe();
    }, [value$, dueTime, leading, trailing]);

    return [throttledValue, nextValue] as const;
}
