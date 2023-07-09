import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {getGsiClient} from '../youtubeAuth';

export default function useGoogleClientLibrary() {
    const [client, setClient] = useState<typeof google.accounts.oauth2 | null>(null);
    const [error, setError] = useState<any>(null);

    useEffect(() => {
        const subscription = from(getGsiClient()).subscribe({next: setClient, error: setError});
        return () => subscription.unsubscribe();
    }, []);

    return {client, error};
}
