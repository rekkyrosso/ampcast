import {useEffect, useState} from 'react';
import {defer, tap} from 'rxjs';
import MediaItem from 'types/MediaItem';
import listenbrainzApi from 'services/listenbrainz/listenbrainzApi';

export default function usePlaylistItems<T extends MediaItem>(items: readonly T[]): readonly T[] {
    const [currentItems, setCurrentItems] = useState<readonly T[]>(items);
    const [currentSrcs, setCurrentSrcs] = useState('');

    useEffect(() => {
        const newSrcs = items.map((item) => item.src).join('|');
        if (newSrcs !== currentSrcs) {
            const subscription = defer(() => listenbrainzApi.addMetadata(items))
                .pipe(tap(() => setCurrentSrcs(newSrcs)))
                .subscribe(setCurrentItems);
            return () => subscription.unsubscribe();
        }
    }, [items, currentSrcs]);

    return currentItems;
}
