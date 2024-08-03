import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {fromEvent, map} from 'rxjs';
import MediaType from 'types/MediaType';
import {isMiniPlayer} from 'utils';
import mediaPlayback from 'services/mediaPlayback';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {observeFullscreenProgressEnabled} from 'services/visualizer/visualizerSettings';
import './Visualizer.scss';
import CoverArtVisualizer from 'components/CoverArtVisualizer';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import useMouseBusy from 'hooks/useMouseBusy';
import useObservable from 'hooks/useObservable';
import useOnResize from 'hooks/useOnResize';
import usePaused from 'hooks/usePaused';
import VisualizerControls from './VisualizerControls';
import Interstitial from './Interstitial';
import ProgressBar from './ProgressBar';
import useLoadingState from './useLoadingState';
import 'fullscreen-api-polyfill';
import './Media.scss';

export default memo(function Media() {
    const ref = useRef<HTMLDivElement>(null);
    const playbackRef = useRef<HTMLDivElement>(null);
    const fullscreenProgressEnabled = useObservable(observeFullscreenProgressEnabled, false);
    const miniPlayerActive = useMiniPlayerActive();
    const [fullscreen, setFullScreen] = useState(false);
    const [newItem, setNewItem] = useState(false);
    const item = useCurrentlyPlaying();
    const itemId = item?.id;
    const isPlayingVideo = item?.mediaType === MediaType.Video;
    const visualizer = useCurrentVisualizer();
    const noVisualizer = !visualizer || visualizer.providerId === 'none';
    const isShowingCoverArt = !isPlayingVideo && visualizer?.providerId === 'coverart';
    const isIdle = !useMouseBusy(ref.current, 4000);
    const loadingState = useLoadingState();
    const paused = usePaused();

    useEffect(() => {
        const timerId = setTimeout(() => setNewItem(false), 10_000);
        setNewItem(true);
        return () => clearTimeout(timerId);
    }, [itemId]);

    useEffect(() => {
        mediaPlayback.appendTo(playbackRef.current!);
    }, []);

    useEffect(() => {
        const subscription = fromEvent(document, 'fullscreenchange')
            .pipe(map(() => document.fullscreenElement === ref.current))
            .subscribe(setFullScreen);
        return () => subscription.unsubscribe();
    }, []);

    useOnResize(ref, ({width, height}) => {
        mediaPlayback.resize(width, height);
    });

    const handleDoubleClick = useCallback(() => {
        if (fullscreen) {
            document.exitFullscreen();
        } else if (!miniPlayer.closed) {
            miniPlayer.focus();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [fullscreen]);

    const toggleFullscreen = useCallback(() => {
        if (fullscreen) {
            document.exitFullscreen();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [fullscreen]);

    return (
        <div
            className={`panel media ${paused ? 'paused' : ''} ${loadingState} ${
                isPlayingVideo ? 'is-playing-video' : 'is-playing-audio'
            } ${noVisualizer ? 'no-visualizer' : ''}  ${
                isShowingCoverArt ? 'is-showing-cover-art' : ''
            } ${isIdle ? 'idle' : ''} ${newItem ? 'is-new-item' : ''} ${
                fullscreen || isMiniPlayer ? 'fullscreen' : ''
            } ${miniPlayerActive ? 'mini-player-active' : ''}`}
            id="media"
            onDoubleClick={handleDoubleClick}
            ref={ref}
        >
            <div id="players" ref={playbackRef} />
            <CoverArtVisualizer />
            <Interstitial />
            {(fullscreen || isMiniPlayer) && fullscreenProgressEnabled ? <ProgressBar /> : null}
            <VisualizerControls fullscreen={fullscreen} onFullscreenToggle={toggleFullscreen} />
        </div>
    );
});
