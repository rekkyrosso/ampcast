import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import plexSettings from '../plexSettings';
import plexApi from '../plexApi';

type PlexSection = Pick<plex.Directory, 'key' | 'title'>;

export default function usePlexMusicLibraries() {
    const [sections, setSections] = useState<PlexSection[]>(plexSettings.sections);

    useEffect(() => {
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
    }, []);

    return sections;
}
