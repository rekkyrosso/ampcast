import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import PersonalMediaService from 'types/PersonalMediaService';
import useIsLoggedIn from 'hooks/useIsLoggedIn';

export default function useServerInfo(service: PersonalMediaService) {
    const isLoggedIn = useIsLoggedIn(service);
    const [serverInfo, setServerInfo] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isLoggedIn && service.getServerInfo) {
            const subscription = from(service.getServerInfo()).subscribe(setServerInfo);
            return () => subscription.unsubscribe();
        }
    }, [service, isLoggedIn]);

    return serverInfo;
}
