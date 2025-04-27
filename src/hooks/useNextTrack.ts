import {useEffect, useState} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import {observeNextTrack, getNextTrack} from 'services/playlist';

export default function useNextTrack(): PlaylistItem | null {
    const [value, setValue] = useState<PlaylistItem | null>(getNextTrack());

    useEffect(() => {
        const subscription = observeNextTrack().subscribe(setValue);
        return () => subscription.unsubscribe();
    }, []);

    return value;
}
