import {useEffect, useState} from 'react';

export default function useFirstValue<T>(value: T) {
    const [firstValue, setFirstValue] = useState<T>(value);

    useEffect(() => {
        if (firstValue == null && value != null) {
            setFirstValue(value);
        }
    }, [firstValue, value]);

    return firstValue;
}
