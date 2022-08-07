import {useEffect} from 'react';

export default function useStoragePersistence() {
    useEffect(() => {
        (async () => {
            const {state = 'granted'} =
                (await navigator.permissions?.query({name: 'persistent-storage'})) || {};
            let persisted = await navigator.storage?.persisted?.();
            if (state === 'granted' && !persisted) {
                persisted = await navigator.storage?.persist();
            }
            console.log('Persisted storage:', {state, persisted});
        })();
    }, []);
}
