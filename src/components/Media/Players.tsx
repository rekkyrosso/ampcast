import React, {useEffect, useRef} from 'react';
import mediaPlayer from 'services/mediaPlayback/mediaPlayer';
import visualizerPlayer from 'services/mediaPlayback/visualizerPlayer';
import CoverArtVisualizer from './CoverArtVisualizer';
import './Visualizer.scss';

export default function Players() {
    const mediaPlayerRef = useRef<HTMLDivElement>(null);
    const visualizerPlayerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        mediaPlayer.useElement(mediaPlayerRef.current!);
        visualizerPlayer.useElement(visualizerPlayerRef.current!);
    }, []);

    return (
        <div id="players">
            <div id="mediaPlayer" ref={mediaPlayerRef} />
            <div id="visualizerPlayer" ref={visualizerPlayerRef}>
                <CoverArtVisualizer />
            </div>
        </div>
    );
}
