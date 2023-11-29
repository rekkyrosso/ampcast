import {useEffect} from 'react';
import MediaItem from 'types/MediaItem';
import {
    observeCurrentTime,
    observeDuration,
    observePlaybackStart,
    pause,
    play,
    seek,
    stop,
    prev,
    next,
} from 'services/mediaPlayback';
import {getThumbnailUrl} from 'components/CoverArt';
import useCurrentlyPlaying from './useCurrentlyPlaying';
import useObservable from './useObservable';

// This works shockingly badly. Oh well.
export default function useMediaSession() {
    const item = useCurrentlyPlaying();
    const state = useObservable(observePlaybackStart, null);
    const position = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);

    useEffect(() => {
        navigator.mediaSession?.setPositionState({duration, position, playbackRate: 1});
    }, [duration, position]);

    useEffect(() => updateSession(state?.currentItem), [state]);
    useEffect(() => updateSession(item), [item]);
}

function updateSession(item: MediaItem | null = null): void {
    const mediaSession = navigator.mediaSession;
    if (mediaSession) {
        if (item) {
            mediaSession.metadata = new MediaMetadata({
                title: item.title,
                artist: item.artists?.join(', '),
                // Windows 10 seems to favour `album` over `artist`.
                // So suppress `album` if `artist` is available.
                album: item.artists ? '' : item.album,
                artwork: item.thumbnails?.map((thumbnail) => ({
                    src: getThumbnailUrl(thumbnail),
                    sizes: `${thumbnail.width}x${thumbnail.height}`,
                })),
            });
        }

        // NOt really sure these updating every time but nothing else works particularly well.
        mediaSession.setActionHandler('play', play);
        mediaSession.setActionHandler('pause', pause);
        mediaSession.setActionHandler('stop', stop);
        mediaSession.setActionHandler('previoustrack', prev);
        mediaSession.setActionHandler('nexttrack', next);
        mediaSession.setActionHandler('seekto', (details) => {
            if (details.seekTime != null) {
                seek(details.seekTime);
            }
        });
    }
}
