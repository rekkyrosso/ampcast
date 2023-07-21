import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import PersonalMediaLibrary from 'types/PersonalMediaLibrary';
import PersonalMediaService from 'types/PersonalMediaService';
import useObservable from 'hooks/useObservable';

export default function useAudioLibraries(service: PersonalMediaService) {
    const isLoggedIn = useObservable(service.observeIsLoggedIn, false);
    const [libraries, setLibraries] = useState<readonly PersonalMediaLibrary[]>(
        () => service.audioLibraries || []
    );

    useEffect(() => {
        if (isLoggedIn && service.getLibraries) {
            const subscription = from(service.getLibraries()).subscribe((libraries) => {
                service.libraries = libraries;
                setLibraries(service.audioLibraries || []);
            });
            return () => subscription.unsubscribe();
        }
    }, [service, isLoggedIn]);

    return libraries;
}
