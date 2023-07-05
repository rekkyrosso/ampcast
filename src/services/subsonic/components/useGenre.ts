import {useMemo} from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaSource from 'types/MediaSource';
import useSource from 'hooks/useSource';

export default function useGenre<T extends MediaObject>(
    source: MediaSource<T> | null,
    genre: Subsonic.Genre | undefined
) {
    const params = useMemo(
        () => ({
            genre: genre?.value,
            total: source?.itemType === ItemType.Album ? genre?.albumCount : genre?.songCount,
        }),
        [genre, source]
    );
    const pager = useSource(source, params);
    return pager;
}
