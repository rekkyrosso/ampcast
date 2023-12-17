import React from 'react';
import Visualizer, {AmbientVideoVisualizer, NoVisualizer} from 'types/Visualizer';
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
    if (visualizer) {
        if (isNoVisualizer(visualizer)) {
            return <p className="no-visualizer-reason">{getNoVisualizerReason(visualizer)}</p>;
        } else {
            const isYouTubeVideo =
                visualizer.providerId === 'ambientvideo' && visualizer.src.startsWith('youtube:');
            const externalUrl = visualizer
                ? visualizer.externalUrl ||
                  getVisualizerProvider(visualizer.providerId)?.externalUrl
                : undefined;

            return isYouTubeVideo ? (
                <YouTubeVideoInfo visualizer={visualizer} />
            ) : visualizer.name ? (
                <>
                    <h4>Name: {visualizer.name}</h4>
                    {externalUrl ? (
                        <p className="external-view">
                            <span>Url:</span> <ExternalLink href={externalUrl} />
                        </p>
                    ) : null}
                </>
            ) : null;
        }
    }
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
        if (isNoVisualizer(visualizer)) {
            return visualizer.name || 'none';
        } else {
            const provider = getVisualizerProvider(visualizer.providerId);
            if (provider) {
                return provider.name;
            }
        }
    }
    return 'none';
}

function getNoVisualizerReason(visualizer: Visualizer | null): string {
    if (isNoVisualizer(visualizer)) {
        switch (visualizer.reason) {
            case 'not supported':
                return 'Visualizer not supported for this media';

            case 'not found':
                return 'Visualizer not found';

            case 'error':
                return 'Visualizer error';
        }
    }
    return '';
}

function isNoVisualizer(visualizer: Visualizer | null): visualizer is NoVisualizer {
    return visualizer?.providerId === 'none';
}
