import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {fromEvent} from 'rxjs';
import {map} from 'rxjs/operators';
import mediaPlayback from 'services/mediaPlayback';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useOnResize from 'hooks/useOnResize';
import VisualizerControls from './VisualizerControls';
import Interstitial from './Interstitial';
import './Media.scss';

console.log('component::Media');

export default function Media() {
    const ref = useRef<HTMLDivElement>(null);
    const [fullScreen, setFullScreen] = useState(false);
    const visualizer = useCurrentVisualizer();
    const noVisualizer = !visualizer || visualizer.provider === 'none';

    useLayoutEffect(() => {
        mediaPlayback.appendTo(ref.current!);
    }, []);

    useLayoutEffect(() => {
        const subscription = fromEvent(document, 'fullscreenchange')
            .pipe(map(() => document.fullscreenElement === ref.current!))
            .subscribe(setFullScreen);
        return () => subscription.unsubscribe();
    }, []);

    useOnResize(
        ref,
        useCallback(() => {
            const element = ref.current!;
            mediaPlayback.resize(element.clientWidth, element.clientHeight);
        }, [])
    );

    const toggleFullScreen = useCallback(() => {
        if (fullScreen) {
            document.exitFullscreen();
        } else {
            ref.current!.requestFullscreen();
        }
    }, [fullScreen]);

    return (
        <div
            className={`panel media ${noVisualizer ? 'no-visualizer' : ''}`}
            onDoubleClick={toggleFullScreen}
            ref={ref}
        >
            <div id="players" />
            <div id="visualizers" />
            <Interstitial />
            <VisualizerControls />
        </div>
    );
}
