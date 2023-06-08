import {useEffect, useState} from 'react';
import plexSettings from '../plexSettings';
import plexApi from '../plexApi';

type PlexSection = Pick<plex.Directory, 'key' | 'title'>;

export default function usePlexMusicLibraries() {
    const [sections, setSections] = useState<PlexSection[]>(plexSettings.sections);

    useEffect(() => {
        (async () => {
            const {
                MediaContainer: {Directory: sections},
            } = await plexApi.fetchJSON<plex.DirectoryResponse>({
                path: '/library/sections',
            });
            const musicSections = sections.filter((section) => section.type === 'artist');
            plexSettings.sections = musicSections;
            setSections(plexSettings.sections);
        })();
    }, []);

    return sections;
}
