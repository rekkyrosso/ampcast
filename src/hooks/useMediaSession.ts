import {useEffect} from 'react';
import {timer} from 'rxjs';
import {take, tap} from 'rxjs/operators';
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
import useObservable from 'hooks/useObservable';
import useCurrentlyPlaying from './useCurrentlyPlaying';
import usePaused from './usePaused';
import MediaItem from 'types/MediaItem';

// https://w3c.github.io/mediasession
const mediaSession = navigator.mediaSession;

export default function useMediaSession() {
    const item = useCurrentlyPlaying();
    const paused = usePaused();
    const position = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);

    // This works shockingly badly. Oh well.

    useEffect(() => {
        mediaSession.setPositionState({duration, position, playbackRate: 1});
    }, [duration, position]);

    useEffect(() => {
        const playbackState = item ? (paused ? 'paused' : 'playing') : 'none';
        const update = () => {
            setMetadata(item);
            setActionHandlers();
            mediaSession.playbackState = playbackState;
        };
        const subscription = timer(0, 100).pipe(take(2), tap(update)).subscribe();
        return () => subscription.unsubscribe();
    }, [item, paused]);
}

function setActionHandlers() {
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

function setMetadata(item: MediaItem | null) {
    mediaSession.metadata = item
        ? new MediaMetadata({
              title: item.title,
              artist: item.artist,
              // Windows 10 seems to favour `album` over `artist`.
              // So suppress `album` if `artist` is available.
              album: item.artist ? '' : item.album,
              artwork:
                  item.thumbnails?.map((thumbnail) => ({
                      src: thumbnail.url,
                      sizes: `${thumbnail.width}x${thumbnail.height}`,
                  })) || [],
          })
        : null;
}
