import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import useObservable from 'hooks/useObservable';
import plexApi from '../plexApi';
import {observeIsLoggedIn} from '../plexAuth';
import plexSettings from '../plexSettings';

type PlexSection = Pick<plex.Directory, 'key' | 'title'>;

export default function usePlexMusicLibraries() {
    const isLoggedIn = useObservable(observeIsLoggedIn, false);
    const [sections, setSections] = useState<PlexSection[]>(plexSettings.sections);

    useEffect(() => {
        if (isLoggedIn) {
            const subscription = from(
                plexApi.fetchJSON<plex.DirectoryResponse>({
                    path: '/library/sections',
                })
            ).subscribe(({MediaContainer: {Directory: sections}}) => {
                const musicSections = sections.filter((section) => section.type === 'artist');
                plexSettings.sections = musicSections;
                setSections(plexSettings.sections);
            });
            return () => subscription.unsubscribe();
        }
    }, [isLoggedIn]);

    return sections;
}
