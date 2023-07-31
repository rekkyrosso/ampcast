import {useEffect, useState} from 'react';
import MediaType from 'types/MediaType';
import {getServiceFromSrc} from 'services/mediaServices';
import {MediaSourceIconName} from 'components/Icon';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import ServiceType from 'types/ServiceType';

export default function useVideoSourceIcon(): MediaSourceIconName | '' {
    const media = useCurrentlyPlaying();
    const visualizer = useCurrentVisualizer();
    const [icon, setIcon] = useState<MediaSourceIconName | ''>('');

    useEffect(() => {
        if (media?.mediaType === MediaType.Video) {
            const service = getServiceFromSrc(media);
            if (service?.serviceType === ServiceType.PublicMedia) {
                setIcon(service.id === 'apple' ? 'apple-logo' : service.icon);
            } else {
                setIcon('');
            }
        } else if (
            visualizer?.providerId === 'ambientvideo' &&
            visualizer.src.startsWith('youtube:')
        ) {
            setIcon('youtube');
        } else {
            setIcon('');
        }
    }, [media, visualizer]);

    return icon;
}
