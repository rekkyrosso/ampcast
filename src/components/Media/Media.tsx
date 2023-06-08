import React, {memo, useCallback, useEffect, useLayoutEffect, useRef, useState} from 'react';
import {fromEvent, map} from 'rxjs';
import MediaType from 'types/MediaType';
import mediaPlayback from 'services/mediaPlayback';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMouseBusy from 'hooks/useMouseBusy';
import useOnResize from 'hooks/useOnResize';
import VisualizerControls from './VisualizerControls';
import Interstitial from './Interstitial';
import 'fullscreen-api-polyfill';
import './Media.scss';

console.log('component::Media');

export default memo(function Media() {
    const ref = useRef<HTMLDivElement>(null);
    const [fullScreen, setFullScreen] = useState(false);
    const currentlyPlaying = useCurrentlyPlaying();
    const isPlayingVideo = currentlyPlaying?.mediaType === MediaType.Video;
    const isMouseBusy = useMouseBusy(ref.current, 4000);
    const visualizer = useCurrentVisualizer();
    const noVisualizer = !visualizer || visualizer.providerId === 'none';

    useLayoutEffect(() => {
        mediaPlayback.appendTo(ref.current!);
    }, []);

    useEffect(() => {
        const subscription = fromEvent(document, 'fullscreenchange')
            .pipe(map(() => document.fullscreenElement === ref.current))
            .subscribe(setFullScreen);
        return () => subscription.unsubscribe();
    }, []);

    useOnResize(ref, () => {
        const element = ref.current!;
        mediaPlayback.resize(element.clientWidth, element.clientHeight);
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
            className={`panel media ${isPlayingVideo ? 'is-playing-video' : ''} ${
                noVisualizer ? 'no-visualizer' : ''
            }  ${isMouseBusy ? '' : 'idle'}`}
            onDoubleClick={toggleFullScreen}
            ref={ref}
        >
            <div id="playback" />
            <Interstitial />
            <VisualizerControls />
        </div>
    );
});
