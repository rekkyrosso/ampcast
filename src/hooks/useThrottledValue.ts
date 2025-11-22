import {useEffect, useState} from 'react';
import {throttleTime, ThrottleConfig} from 'rxjs';
import useSubject from './useSubject';

export default function useThrottledValue<T>(
    initialValue: T,
    duration: number,
    {leading = true, trailing = false}: ThrottleConfig = {}
) {
    const [throttledValue, setThrottledValue] = useState<T>(initialValue);
    const [value$, nextValue] = useSubject<T>();

    useEffect(() => {
        const subscription = value$
            .pipe(throttleTime(duration, undefined, {leading, trailing}))
            .subscribe(setThrottledValue);
        return () => subscription.unsubscribe();
    }, [value$, duration, leading, trailing]);

    return [throttledValue, nextValue] as const;
}
