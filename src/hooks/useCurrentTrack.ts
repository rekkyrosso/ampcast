import {useEffect, useState} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import {observeCurrentTrack, getCurrentTrack} from 'services/playlist';

export default function useCurrentTrack(): PlaylistItem | null {
    const [value, setValue] = useState<PlaylistItem | null>(getCurrentTrack());

    useEffect(() => {
        const subscription = observeCurrentTrack().subscribe(setValue);
        return () => subscription.unsubscribe();
    }, []);

    return value;
}
