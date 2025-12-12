import {useEffect, useState} from 'react';
import {filter, map, take} from 'rxjs';
import LinearType from 'types/LinearType';
import PlaylistItem from 'types/PlaylistItem';
import playback from 'services/mediaPlayback/playback';
import useCurrentTrack from 'hooks/useCurrentTrack';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useNextPlaylistItem from 'hooks/useNextPlaylistItem';

export interface CoverArtItems {
    readonly current: PlaylistItem | null;
    readonly next: PlaylistItem | null;
}

export default function useCoverArtItems(): CoverArtItems {
    const currentItem = useCurrentlyPlaying();
    const currentTrack = useCurrentTrack(); // Radio track.
    const nextItem = useNextPlaylistItem();
    const [items, setItems] = useState<CoverArtItems>(() => ({
        current: currentTrack,
        next: nextItem,
    }));

    useEffect(() => {
        const radioStation =
            currentItem?.linearType === LinearType.Station ? currentItem : undefined;
        if (radioStation) {
            // Show the radio station artwork for 15 seconds before transitioning to the track.
            const delayTime = 15_000;
            const state = playback.getPlaybackState();
            const elapsedTime = Date.now() - state.startedAt;
            if (elapsedTime > delayTime) {
                setItems({current: currentTrack, next: radioStation});
            } else {
                setItems({current: radioStation, next: currentTrack});
                const subscription = playback
                    .observePlaybackState()
                    .pipe(
                        map((state) => Date.now() - state.startedAt),
                        filter((elapsedTime) => elapsedTime > delayTime),
                        take(1),
                        map(() => ({current: currentTrack, next: radioStation}))
                    )
                    .subscribe(setItems);
                return () => subscription.unsubscribe();
            }
        } else {
            setItems({current: currentTrack, next: nextItem});
        }
    }, [currentTrack, nextItem, currentItem]);

    return items;
}
