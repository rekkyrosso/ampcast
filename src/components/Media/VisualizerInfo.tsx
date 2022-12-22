import React from 'react';
import Visualizer, {AmbientVideoVisualizer} from 'types/Visualizer';
import useYouTubeVideoInfo from 'hooks/useYouTubeVideoInfo';
import {ExternalView, Owner} from './MediaInfo';
import './VisualizerInfo.scss';

interface VisualizerInfoProps {
    visualizer: Visualizer | null;
}

export default function VisualizerInfo({visualizer}: VisualizerInfoProps) {
    return (
        <article className="visualizer-info">
            <VisualizerProvider visualizer={visualizer} />
            <VisualizerPreset visualizer={visualizer} />
        </article>
    );
}

function VisualizerProvider({visualizer}: VisualizerInfoProps) {
    return <h3>Visualizer: {getProviderName(visualizer)}</h3>;
}

function VisualizerPreset({visualizer}: VisualizerInfoProps) {
    const isYouTubeVideo =
        visualizer?.providerId === 'ambientvideo' && visualizer.src.startsWith('youtube:');

    return isYouTubeVideo ? (
        <YouTubeVideoInfo visualizer={visualizer} />
    ) : visualizer?.name ? (
        <>
            <h4>Name: {visualizer!.name}</h4>
            <ExternalView url={visualizer.externalUrl} src="" />
        </>
    ) : null;
}

function YouTubeVideoInfo({visualizer}: {visualizer: AmbientVideoVisualizer}) {
    const video = useYouTubeVideoInfo(visualizer!.src);

    return video ? (
        <div className="youtube-video-info">
            <h4>Title: {video.title}</h4>
            <Owner owner={video.owner} src={video.src} />
            <ExternalView url={video.externalUrl} src={video.src} />
        </div>
    ) : null;
}

function getProviderName(visualizer: Visualizer | null): string {
    switch (visualizer?.providerId) {
        case 'ambientvideo':
            return 'Ambient Video';

        case 'ampshader':
            return 'Ampshader';

        case 'audiomotion':
            return 'audioMotion-analyzer';

        case 'milkdrop':
            return 'Milkdrop';

        case 'spotifyviz':
            return 'SpotifyViz';

        case 'waveform':
            return 'Waveform';

        default:
            return 'none';
    }
}
