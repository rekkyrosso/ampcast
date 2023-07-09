import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaService from 'types/MediaService';
import useObservable from 'hooks/useObservable';
import embyApi from '../embyApi';
import {EmbyLibrary, EmbySettings} from '../embySettings';

export default function useEmbyMusicLibraries(service: MediaService, settings: EmbySettings) {
    const isLoggedIn = useObservable(service.observeIsLoggedIn, false);
    const [libraries, setLibraries] = useState<readonly EmbyLibrary[]>(() =>
        getAudioLibraries(settings.libraries)
    );

    useEffect(() => {
        if (isLoggedIn) {
            const subscription = from(embyApi.getMusicLibraries(settings)).subscribe(
                (libraries) => {
                    settings.libraries = libraries;
                    setLibraries(getAudioLibraries(settings.libraries));
                }
            );
            return () => subscription.unsubscribe();
        }
    }, [isLoggedIn, settings]);

    return libraries;
}

function getAudioLibraries(libraries: readonly EmbyLibrary[]): readonly EmbyLibrary[] {
    return libraries.filter((library) => library.type !== 'musicvideos');
}
