import {useRef} from 'react';

export default function useFirstValue<T>(value: T) {
    const valueRef = useRef<T>(value);
    if (valueRef.current == null && value != null) {
        valueRef.current = value;
    }
    return valueRef.current;
}
