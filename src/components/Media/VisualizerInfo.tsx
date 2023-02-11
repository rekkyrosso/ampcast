import React from 'react';
import Visualizer, {AmbientVideoVisualizer} from 'types/Visualizer';
import {getVisualizerProvider} from 'services/visualizer/visualizerProviders';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import useYouTubeVideoInfo from 'hooks/useYouTubeVideoInfo';
import {Owner} from './MediaInfo';
import './VisualizerInfo.scss';

export interface VisualizerInfoProps {
    visualizer: Visualizer | null;
}

export default function VisualizerInfo({visualizer}: VisualizerInfoProps) {
    return (
        <article className="visualizer-info">
            <VisualizerProvider visualizer={visualizer} />
            <VisualizerDetail visualizer={visualizer} />
        </article>
    );
}

function VisualizerProvider({visualizer}: VisualizerInfoProps) {
    return <h3>Visualizer: {getProviderName(visualizer)}</h3>;
}

function VisualizerDetail({visualizer}: VisualizerInfoProps) {
    const isYouTubeVideo =
        visualizer?.providerId === 'ambientvideo' && visualizer.src.startsWith('youtube:');
    const externalUrl = visualizer
        ? visualizer.externalUrl || getVisualizerProvider(visualizer.providerId)?.externalUrl
        : undefined;

    return isYouTubeVideo ? (
        <YouTubeVideoInfo visualizer={visualizer} />
    ) : visualizer?.name ? (
        <>
            <h4>Name: {visualizer.name}</h4>
            {externalUrl ? (
                <p className="external-view">
                    Url: <ExternalLink href={externalUrl} />
                </p>
            ) : null}
        </>
    ) : null;
}

function YouTubeVideoInfo({visualizer}: {visualizer: AmbientVideoVisualizer}) {
    const video = useYouTubeVideoInfo(visualizer!.src);

    return video ? (
        <div className="youtube-video-info">
            <h4>Title: {video.title}</h4>
            <Owner owner={video.owner} src={video.src} />
            <p className="external-view">
                View on YouTube: <Icon name="youtube" /> <ExternalLink href={video.externalUrl} />
            </p>
        </div>
    ) : null;
}

function getProviderName(visualizer: Visualizer | null): string {
    if (visualizer) {
        const provider = getVisualizerProvider(visualizer.providerId);
        if (provider) {
            return provider.name;
        }
    }
    return 'none';
}
