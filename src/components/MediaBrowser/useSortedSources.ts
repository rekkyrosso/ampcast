import {useMemo} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import usePreferences from 'hooks/usePreferences';

// Sorted by preference. */
export default function useSortedSources<T extends MediaObject>(
    sources: readonly MediaSource<T>[]
): readonly MediaSource<T>[] {
    const {albumsOrTracks} = usePreferences();

    return useMemo(() => {
        if (albumsOrTracks === 'albums') {
            const albums = sources.find((source) => source.itemType === ItemType.Album);
            if (albums) {
                return [albums, ...sources.filter((source) => source !== albums)];
            }
        }
        return sources;
    }, [sources, albumsOrTracks]);
}
