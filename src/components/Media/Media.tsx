import React, {memo, useCallback, useEffect, useRef, useState} from 'react';
import {fromEvent, map} from 'rxjs';
import MediaType from 'types/MediaType';
import mediaPlayback from 'services/mediaPlayback';
import {observeFullscreenProgressEnabled} from 'services/visualizer/visualizerSettings';
import './Visualizer.scss';
import CoverArtVisualizer from 'components/CoverArtVisualizer';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMouseBusy from 'hooks/useMouseBusy';
import useObservable from 'hooks/useObservable';
import useOnResize from 'hooks/useOnResize';
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
    const [fullScreen, setFullScreen] = useState(false);
    const [newItem, setNewItem] = useState(false);
    const item = useCurrentlyPlaying();
    const itemId = item?.id;
    const isPlayingVideo = item?.mediaType === MediaType.Video;
    const visualizer = useCurrentVisualizer();
    const noVisualizer = !visualizer || visualizer.providerId === 'none';
    const isShowingCoverArt = !isPlayingVideo && visualizer?.providerId === 'coverart';
    const isIdle = !useMouseBusy(ref.current, 4000);
    const loadingState = useLoadingState();

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

    const toggleFullScreen = useCallback(() => {
        if (fullScreen) {
            document.exitFullscreen();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [fullScreen]);

    return (
        <div
            className={`panel media ${loadingState} ${
                isPlayingVideo ? 'is-playing-video' : 'is-playing-audio'
            } ${noVisualizer ? 'no-visualizer' : ''}  ${
                isShowingCoverArt ? 'is-showing-cover-art' : ''
            } ${isIdle ? 'idle' : ''} ${newItem ? 'is-new-item' : ''}`}
            onDoubleClick={toggleFullScreen}
            ref={ref}
        >
            <div className="players" ref={playbackRef} />
            <CoverArtVisualizer />
            <Interstitial />
            {fullscreenProgressEnabled && fullScreen ? <ProgressBar /> : null}
            <VisualizerControls />
        </div>
    );
});
