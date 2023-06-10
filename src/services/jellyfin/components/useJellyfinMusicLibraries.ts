import {useEffect, useState} from 'react';
import jellyfinApi from '../jellyfinApi';
import jellyfinSettings from '../jellyfinSettings';

interface JellyfinLibrary {
    readonly id: string;
    readonly title: string;
}

export default function useJellyfinMusicLibraries() {
    const [libraries, setLibraries] = useState<JellyfinLibrary[]>(jellyfinSettings.libraries);

    useEffect(() => {
        (async () => {
            const libraries = await jellyfinApi.getMusicLibraries();
            jellyfinSettings.libraries = libraries;
            setLibraries(jellyfinSettings.libraries);
        })();
    }, []);

    return libraries;
}
