import {useEffect, useState} from 'react';
import {defer} from 'rxjs';
import {getRedirectUri} from '../spotifyAuth';

export default function useRedirectUri() {
    const [redirectUri, setRedirectUri] = useState('');

    useEffect(() => {
        const subscription = defer(() => getRedirectUri()).subscribe(setRedirectUri);
        return () => subscription.unsubscribe();
    }, []);

    return redirectUri;
}
