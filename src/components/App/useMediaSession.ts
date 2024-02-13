import {useEffect} from 'react';
import {observePlaybackState, pause, play, seek, stop, prev, next} from 'services/mediaPlayback';
import PlaybackState from 'types/PlaybackState';
import {getThumbnailUrl} from 'components/CoverArt';
import useObservable from 'hooks/useObservable';

// This doesn't really work for Spotify and YouTube because they play in an iframe.

export default function useMediaSession() {
    const state = useObservable(observePlaybackState, undefined);
    useEffect(() => updateSession(state), [state]);
}

function updateSession({
    currentItem: item,
    currentTime: position = 0,
    duration = 0,
    paused = true,
}: Partial<PlaybackState> = {}): void {
    const mediaSession = navigator.mediaSession;

    mediaSession.playbackState = paused ? (position ? 'paused' : 'none') : 'playing';
    mediaSession.setPositionState({duration, position, playbackRate: 1});

    mediaSession.metadata = new MediaMetadata({
        title: item?.title,
        artist: item?.artists?.join(', '),
        album: item?.album,
        artwork: item?.thumbnails?.map((thumbnail) => ({
            src: getThumbnailUrl(thumbnail),
            sizes: `${thumbnail.width}x${thumbnail.height}`,
        })),
    });

    // These might get overwritten by MusicKit so keep them updated.
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
