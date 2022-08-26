import React from 'react';
import Visualizer, {AmbientVideoVisualizer} from 'types/Visualizer';
import useYouTubeVideoInfo from 'hooks/useYouTubeVideoInfo';
import {ExternalLink, Owner} from './MediaInfo';
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
        visualizer?.provider === 'ambient-video' && visualizer.src.startsWith('youtube:');

    return isYouTubeVideo ? (
        <YouTubeVideoInfo visualizer={visualizer} />
    ) : visualizer?.name ? (
        <>
            <h4>Name: {visualizer!.name}</h4>
            <ExternalLink url={visualizer.externalUrl} src="" />
        </>
    ) : null;
}

function YouTubeVideoInfo({visualizer}: {visualizer: AmbientVideoVisualizer}) {
    const video = useYouTubeVideoInfo(visualizer!.src);

    return video ? (
        <div className="youtube-video-info">
            <h4>Title: {video.title}</h4>
            <Owner owner={video.owner} src={video.src} />
            <ExternalLink url={video.externalUrl} src={video.src} />
        </div>
    ) : null;
}

function getProviderName(visualizer: Visualizer | null): string {
    switch (visualizer?.provider) {
        case 'ambient-video':
            return 'Ambient Video';

        case 'ampshader':
            return 'Ampshader';

        case 'audiomotion':
            return 'AudioMotion';

        case 'milkdrop':
            return 'Milkdrop';

        case 'spotify-viz':
            return 'SpotifyViz';

        case 'waveform':
            return 'Waveform';

        default:
            return 'none';
    }
}
