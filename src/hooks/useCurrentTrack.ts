import {useEffect, useState} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import playback, {observeCurrentItem} from 'services/mediaPlayback/playback';

export default function useCurrentTrack(): PlaylistItem | null {
    const [value, setValue] = useState<PlaylistItem | null>(playback.currentItem);

    useEffect(() => {
        const subscription = observeCurrentItem().subscribe(setValue);
        return () => subscription.unsubscribe();
    }, []);

    return value;
}
