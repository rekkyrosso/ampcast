import React from 'react';
import MediaItem from 'types/MediaItem';
import {isPublicMediaService} from 'services/mediaServices';
import MediaSourceLabel from './MediaSourceLabel';
import useMediaServices from 'hooks/useMediaServices';

export default function ProvidedBy({item}: {item: MediaItem | null}) {
    const services = useMediaServices();
    const [serviceId] = item?.src.split(':') || [];
    const service = services.find((service) => service.id === serviceId);

    if (item && service && isPublicMediaService(service)) {
        return (
            <MediaSourceLabel
                className="provided-by"
                icon={service.icon}
                text={`Provided by ${service.name}`}
            />
        );
    } else {
        return null;
    }
}
