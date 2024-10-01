import React, {useCallback, useMemo, useState} from 'react';
import Visualizer, {AmbientVideoVisualizer, NoVisualizer} from 'types/Visualizer';
import {t} from 'services/i18n';
import {getVisualizerProvider} from 'services/visualizer/visualizerProviders';
import visualizerStore from 'services/visualizer/visualizerStore';
import IconButtons from 'components/Button/IconButtons';
import IconButton from 'components/Button';
import ExternalLink from 'components/ExternalLink';
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
            {visualizer ? <VisualizerDetail visualizer={visualizer} /> : null}
        </article>
    );
}

function VisualizerProvider({visualizer}: VisualizerInfoProps) {
    return <h3>Visualizer: {getProviderName(visualizer)}</h3>;
}

function VisualizerDetail({visualizer}: {visualizer: Visualizer}) {
    if (isNoVisualizer(visualizer)) {
        return <p className="no-visualizer-reason">{getNoVisualizerReason(visualizer)}</p>;
    } else {
        const isYouTubeVideo =
            visualizer.providerId === 'ambientvideo' && visualizer.video.src.startsWith('youtube:');
        const externalUrl = visualizer
            ? visualizer.externalUrl || getVisualizerProvider(visualizer.providerId)?.externalUrl
            : undefined;

        return isYouTubeVideo ? (
            <YouTubeVideoInfo visualizer={visualizer} />
        ) : (
            <>
                {visualizer.name ? <h4>Name: {visualizer.name}</h4> : null}
                {externalUrl ? (
                    <p className="external-view">
                        Url: <ExternalLink href={externalUrl} />
                    </p>
                ) : null}
                <ToggleFavorite visualizer={visualizer} />
            </>
        );
    }
}

function YouTubeVideoInfo({visualizer}: {visualizer: AmbientVideoVisualizer}) {
    const video = useYouTubeVideoInfo(visualizer.video.src);
    const visualizerWithTitle = useMemo(
        () => ({...visualizer, title: video?.title}),
        [visualizer, video]
    );
    return video ? (
        <>
            <div className="youtube-video-info">
                <h4>Title: {video.title}</h4>
                <Owner owner={video.owner} src={video.src} />
                <p className="external-view">
                    View on YouTube: <ExternalLink icon="youtube" href={video.externalUrl} />
                </p>
            </div>
            <ToggleFavorite visualizer={visualizerWithTitle} />
        </>
    ) : null;
}

function ToggleFavorite({visualizer}: {visualizer: Visualizer}) {
    const [isFavorite, setIsFavorite] = useState(() => visualizerStore.hasFavorite(visualizer));

    const handleClick = useCallback(async () => {
        if (isFavorite) {
            await visualizerStore.removeFavorite(visualizer);
        } else {
            await visualizerStore.addFavorite(visualizer);
        }
        setIsFavorite(visualizerStore.hasFavorite(visualizer));
    }, [visualizer, isFavorite]);

    return (
        <IconButtons>
            <IconButton
                icon={isFavorite ? 'tick-fill' : 'plus'}
                title={isFavorite ? t('Remove from favorite visualizers') : t('Add to favorite visualizers')}
                onClick={handleClick}
            />
        </IconButtons>
    );
}

function getProviderName(visualizer: Visualizer | null): string {
    if (visualizer) {
        if (isNoVisualizer(visualizer)) {
            const provider = getVisualizerProvider(visualizer.name);
            return provider?.name || visualizer.name || 'none';
        } else {
            const provider = getVisualizerProvider(visualizer.providerId);
            return provider?.name || visualizer.providerId || 'none';
        }
    }
    return 'none';
}

function getNoVisualizerReason(visualizer: Visualizer | null): string {
    if (isNoVisualizer(visualizer)) {
        switch (visualizer.reason) {
            case 'not supported':
                return 'Visualizer not supported for this media.';

            case 'not loaded':
                return 'Visualizer not loaded.';

            case 'error':
                return 'Visualizer error.';
        }
    }
    return '';
}

function isNoVisualizer(visualizer: Visualizer | null): visualizer is NoVisualizer {
    return visualizer?.providerId === 'none';
}
