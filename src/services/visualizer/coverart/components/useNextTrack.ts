import {useEffect, useState} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import {observeNextItem, getNextItem} from 'services/playlist';

export default function useNextTrack(): PlaylistItem | null {
    const [value, setValue] = useState<PlaylistItem | null>(getNextItem());

    useEffect(() => {
        const subscription = observeNextItem().subscribe(setValue);
        return () => subscription.unsubscribe();
    }, []);

    return value;
}
