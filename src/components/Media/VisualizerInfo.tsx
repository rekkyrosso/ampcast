import React from 'react';
import Visualizer from 'types/Visualizer';
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
        visualizer?.provider === 'video' && visualizer.preset.startsWith('youtube:');

    return isYouTubeVideo ? (
        <YouTubeVideoInfo visualizer={visualizer} />
    ) : visualizer?.preset ? (
        <h4>Name: {visualizer!.preset}</h4>
    ) : null;
}

function YouTubeVideoInfo({visualizer}: VisualizerInfoProps) {
    const video = useYouTubeVideoInfo(visualizer!.preset);

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
        case 'ampshader':
            return 'Ampshader';

        case 'audiomotion':
            return 'AudioMotion';

        case 'milkdrop':
            return 'Milkdrop';

        case 'video':
            return 'Ambient Video';

        case 'waveform':
            return 'Waveform';

        default:
            return 'none';
    }
}
