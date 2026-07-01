import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import {isMiniPlayer} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import mediaPlayback from 'services/mediaPlayback';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import './Visualizer.scss';
import CoverArtVisualizer from 'components/CoverArtVisualizer';
import useBaseFontSize from 'hooks/useBaseFontSize';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useIsFullscreen from 'hooks/useIsFullscreen';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import useMouseBusy from 'hooks/useMouseBusy';
import useOnResize from 'hooks/useOnResize';
import usePaused from 'hooks/usePaused';
import useVisualizerSettings from 'hooks/useVisualizerSettings';
import Interstitial from './Interstitial';
import ProgressBar from './ProgressBar';
import VisualizerControls from './VisualizerControls';
import useLoadingState from './useLoadingState';
import './Media.scss';

export default memo(function Media() {
    const ref = useRef<HTMLDivElement>(null);
    const [style, setStyle] = useState<React.CSSProperties>({});
    const baseFontSize = useBaseFontSize();
    const playersRef = useRef<HTMLDivElement>(null);
    const {fullscreenProgress, provider} = useVisualizerSettings();
    const miniPlayerActive = useMiniPlayerActive();
    const isFullscreen = useIsFullscreen();
    const item = useCurrentlyPlaying();
    const isPlayingVideo = item?.mediaType === MediaType.Video;
    const visualizer = useCurrentVisualizer();
    const noVisualizer = !visualizer || visualizer.providerId === 'none';
    const loadingState = useLoadingState();
    const iframePlayback =
        item?.playbackType === PlaybackType.IFrame
            ? getServiceFromSrc(item)?.iframeAudioPlayback
            : undefined;
    const isShowingCoverArt =
        !isPlayingVideo &&
        (visualizer?.providerId === 'coverart' ||
            (provider !== 'none' &&
                iframePlayback?.showContent &&
                iframePlayback.isCoverArt &&
                loadingState !== 'loading'));
    const isIdle = !useMouseBusy(ref.current, 4000);
    const paused = usePaused();

    useEffect(() => {
        mediaPlayback.appendTo(playersRef.current!);
    }, []);

    useOnResize(ref, ({width, height}) => {
        setStyle({
            fontSize: `${Math.max(Math.sqrt(width * height) * 0.03, baseFontSize)}px`,
        } as React.CSSProperties);
        mediaPlayback.resize(width, height);
    });

    const handleDoubleClick = useCallback(() => {
        if (isFullscreen) {
            document.exitFullscreen();
        } else if (!miniPlayer.closed) {
            miniPlayer.focus();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [isFullscreen]);

    const toggleFullscreen = useCallback(() => {
        if (isFullscreen) {
            document.exitFullscreen();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [isFullscreen]);

    return (
        <div
            className={`panel media ${paused ? 'paused' : ''} ${loadingState} ${
                isPlayingVideo ? 'is-playing-video' : 'is-playing-audio'
            } ${noVisualizer ? 'no-visualizer' : ''}  ${
                isShowingCoverArt ? 'is-showing-cover-art' : ''
            } ${isIdle ? 'idle' : ''} ${
                isFullscreen || isMiniPlayer ? 'fullscreen' : ''
            } ${miniPlayerActive ? 'mini-player-active' : ''}`}
            id="media"
            onDoubleClick={handleDoubleClick}
            style={style}
            ref={ref}
        >
            <div id="players" ref={playersRef} />
            <CoverArtVisualizer />
            <Interstitial />
            {(isFullscreen || isMiniPlayer) && fullscreenProgress ? <ProgressBar /> : null}
            <VisualizerControls fullscreen={isFullscreen} onFullscreenToggle={toggleFullscreen} />
        </div>
    );
});
