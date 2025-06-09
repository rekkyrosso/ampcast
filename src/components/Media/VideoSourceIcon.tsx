import React from 'react';
import MediaType from 'types/MediaType';
import ServiceType from 'types/ServiceType';
import {getServiceFromSrc} from 'services/mediaServices';
import youtubeApi from 'services/youtube/youtubeApi';
import ExternalLink from 'components/ExternalLink';
import Icon from 'components/Icon';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';

export default function VideoSourceIcon() {
    const item = useCurrentlyPlaying();
    const visualizer = useCurrentVisualizer();

    if (item?.mediaType === MediaType.Video) {
        const service = getServiceFromSrc(item);
        if (service?.serviceType === ServiceType.PublicMedia) {
            if (service.id === 'youtube') {
                return <YouTubeIcon src={item.src} />;
            } else {
                return (
                    <Icon
                        className="video-source-icon"
                        name={service.id === 'apple' ? 'apple-logo' : service.icon}
                    />
                );
            }
        }
    } else if (
        visualizer?.providerId === 'ambientvideo' &&
        visualizer.video.src.startsWith('youtube:')
    ) {
        return <YouTubeIcon src={visualizer.video.src} />;
    }
}

function YouTubeIcon({src}: {src: string}) {
    const [, , videoId] = src.split(':');
    const url = youtubeApi.getVideoUrl(videoId);
    return (
        <ExternalLink className="video-source-icon youtube" href={url} title="Watch on YouTube">
            <Icon name="youtube" />
        </ExternalLink>
    );
}
