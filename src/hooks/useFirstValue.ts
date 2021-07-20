import {useEffect, useState} from 'react';

export default function useFirstValue<T>(value: T | null | undefined) {
    const [firstValue, setFirstValue] = useState<T | null>(null);

    useEffect(() => {
        if (firstValue == null && value != null) {
            setFirstValue(value);
        }
    }, [firstValue, value]);

    return firstValue;
}
