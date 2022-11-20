import React, {useCallback, useLayoutEffect, useRef, useState} from 'react';
import {fromEvent} from 'rxjs';
import {map} from 'rxjs/operators';
import MediaType from 'types/MediaType';
import mediaPlayback from 'services/mediaPlayback';
import {observeProvider} from 'services/visualizer';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useMouseBusy from 'hooks/useMouseBusy';
import useObservable from 'hooks/useObservable';
import useOnResize from 'hooks/useOnResize';
import VisualizerControls from './VisualizerControls';
import Interstitial from './Interstitial';
import 'fullscreen-api-polyfill';
import './Media.scss';

console.log('component::Media');

export default function Media() {
    const ref = useRef<HTMLDivElement>(null);
    const [fullScreen, setFullScreen] = useState(false);
    const busy = useMouseBusy(ref.current, 10_000);
    const currentlyPlaying = useCurrentlyPlaying();
    const playingVideo = currentlyPlaying?.mediaType === MediaType.Video;
    const visualizerProvider = useObservable(observeProvider, 'none');
    const noVisualizer = visualizerProvider === 'none';

    useLayoutEffect(() => {
        mediaPlayback.appendTo(ref.current!);
    }, []);

    useLayoutEffect(() => {
        const subscription = fromEvent(document, 'fullscreenchange')
            .pipe(map(() => document.fullscreenElement === ref.current))
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
            className={`panel media ${playingVideo ? 'playing-video' : ''} ${
                noVisualizer ? 'no-visualizer' : ''
            }  ${busy ? '' : 'idle'}`}
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
