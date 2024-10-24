import {useEffect} from 'react';
import PlaybackState from 'types/PlaybackState';
import {MAX_DURATION} from 'services/constants';
import {pause, play, seek, stop, prev, next} from 'services/mediaPlayback';
import {observePlaybackState} from 'services/mediaPlayback/playback';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
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
    const isLiveStreaming = duration === MAX_DURATION;
    if (isLiveStreaming) {
        duration = 1;
        position = position && 1;
    }

    if (miniPlayer.active) {
        mediaSession.metadata = null;
    } else {
        mediaSession.playbackState = paused ? (position ? 'paused' : 'none') : 'playing';
        if (position > duration) {
            console.warn(`MediaSession: position(${position}) > duration(${duration})`);
        } else {
            mediaSession.setPositionState({duration, position, playbackRate: 1});
        }

        mediaSession.metadata = new MediaMetadata({
            title: item?.title,
            artist: item?.artists?.join(', '),
            album: item?.album,
            artwork: item?.thumbnails?.map((thumbnail) => ({
                src: getThumbnailUrl(thumbnail),
                sizes: `${thumbnail.width}x${thumbnail.height}`,
            })),
        });
    }

    // These might get overwritten by MusicKit so keep them updated.
    mediaSession.setActionHandler('play', play);
    mediaSession.setActionHandler('pause', pause);
    mediaSession.setActionHandler('stop', stop);
    mediaSession.setActionHandler('previoustrack', prev);
    mediaSession.setActionHandler('nexttrack', next);
    mediaSession.setActionHandler('seekto', (details) => {
        if (!isLiveStreaming && details.seekTime != null) {
            seek(details.seekTime);
        }
    });
}
