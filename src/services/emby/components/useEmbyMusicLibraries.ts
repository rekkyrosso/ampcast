import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import {EmbyLibrary, EmbySettings} from '../embySettings';
import embyApi from '../embyApi';

export default function useEmbyMusicLibraries(settings: EmbySettings) {
    const [libraries, setLibraries] = useState<readonly EmbyLibrary[]>(() =>
        getAudioLibraries(settings.libraries)
    );

    useEffect(() => {
        const subscription = from(embyApi.getMusicLibraries(settings)).subscribe((libraries) => {
            settings.libraries = libraries;
            setLibraries(getAudioLibraries(settings.libraries));
        });
        return () => subscription.unsubscribe();
    }, [settings]);

    return libraries;
}

function getAudioLibraries(libraries: readonly EmbyLibrary[]): readonly EmbyLibrary[] {
    return libraries.filter((library) => library.type !== 'musicvideos');
}
