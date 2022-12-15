import {useEffect} from 'react';
import {
    observeCurrentTime,
    observeDuration,
    pause,
    play,
    seek,
    stop,
    prev,
    next,
} from 'services/mediaPlayback';
import {getThumbnailUrl} from 'components/ThumbnailImage';
import useCurrentlyPlaying from './useCurrentlyPlaying';
import useObservable from './useObservable';

// This works shockingly badly. Oh well.

const mediaSession = navigator.mediaSession;

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

export default function useMediaSession() {
    const item = useCurrentlyPlaying();
    const position = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);

    useEffect(() => {
        mediaSession.setPositionState({duration, position, playbackRate: 1});
    }, [duration, position]);

    useEffect(() => {
        mediaSession.metadata = item
            ? new MediaMetadata({
                  title: item.title,
                  artist: item.artists?.join(', '),
                  // Windows 10 seems to favour `album` over `artist`.
                  // So suppress `album` if `artist` is available.
                  album: item.artists ? '' : item.album,
                  artwork:
                      item.thumbnails?.map((thumbnail) => ({
                          src: getThumbnailUrl(thumbnail),
                          sizes: `${thumbnail.width}x${thumbnail.height}`,
                      })) || [],
              })
            : null;
    }, [item]);
}
