import {useEffect, useState} from 'react';
import MediaType from 'types/MediaType';
import {observePlaybackState} from 'services/mediaPlayback/playback';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useObservable from 'hooks/useObservable';

export type InterstitialState = 'show' | 'hide' | 'fade-out';

export default function useInterstitialState(): InterstitialState {
    const [state, setState] = useState<InterstitialState>('show');
    const playbackState = useObservable(observePlaybackState, null);
    const paused = playbackState?.paused ?? true;
    const item = playbackState?.currentItem;
    const currentTime = playbackState?.currentTime || 0;
    const isPlayingVideo = item?.mediaType === MediaType.Video;
    const visualizerProvider = useCurrentVisualizer()?.providerId || 'none';
    const [isNewItem, setIsNewItem] = useState(true);
    const loaded = currentTime > 0;

    useEffect(() => {
        setIsNewItem(true);
        if (loaded) {
            const timerId = setTimeout(() => setIsNewItem(false), 10_000);
            return () => clearTimeout(timerId);
        }
    }, [loaded]);

    useEffect(() => {
        if (paused) {
            setState('show');
        } else if (visualizerProvider === 'coverart' && !isPlayingVideo) {
            setState('hide');
        } else if (visualizerProvider === 'none' && !isPlayingVideo) {
            setState('show');
        } else {
            if (loaded) {
                if (isNewItem) {
                    setState('fade-out');
                } else {
                    setState('hide');
                }
            } else {
                setState('show');
            }
        }
    }, [paused, visualizerProvider, isPlayingVideo, loaded, isNewItem]);

    return state;
}
