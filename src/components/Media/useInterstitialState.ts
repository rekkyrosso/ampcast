import {useEffect, useState} from 'react';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {getServiceFromSrc} from 'services/mediaServices';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import usePlaybackState from 'hooks/usePlaybackState';
import useVisualizerSettings from 'hooks/useVisualizerSettings';

export type InterstitialState = 'show' | 'hide' | 'fade-out';

export default function useInterstitialState(): InterstitialState {
    const [state, setState] = useState<InterstitialState>('show');
    const {paused, currentItem, currentTime} = usePlaybackState();
    const {provider} = useVisualizerSettings();
    const iframe =
        currentItem?.playbackType === PlaybackType.IFrame
            ? getServiceFromSrc(currentItem)?.iframeAudioPlayback
            : undefined;
    const visualizerHidden =
        currentItem?.mediaType === MediaType.Video || (provider !== 'none' && iframe?.showContent);
    const visualizerProvider = useCurrentVisualizer()?.providerId || 'none';
    const [isNewItem, setIsNewItem] = useState(true);
    const playbackStarted = currentTime >= 1;
    const miniPlayerActive = useMiniPlayerActive();

    useEffect(() => {
        setIsNewItem(true);
        if (playbackStarted) {
            const timerId = setTimeout(() => setIsNewItem(false), 10_000);
            return () => clearTimeout(timerId);
        }
    }, [playbackStarted]);

    useEffect(() => {
        if (paused || miniPlayerActive) {
            setState('show');
        } else if (visualizerProvider === 'coverart' && !visualizerHidden) {
            setState('hide');
        } else if (visualizerProvider === 'none' && !visualizerHidden) {
            setState('show');
        } else {
            if (playbackStarted) {
                if (isNewItem) {
                    setState('fade-out');
                } else {
                    setState('hide');
                }
            } else {
                setState('show');
            }
        }
    }, [
        paused,
        miniPlayerActive,
        visualizerProvider,
        visualizerHidden,
        playbackStarted,
        isNewItem,
    ]);

    return state;
}
