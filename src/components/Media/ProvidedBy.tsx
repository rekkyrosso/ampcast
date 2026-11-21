import React from 'react';
import MediaItem from 'types/MediaItem';
import ServiceType from 'types/ServiceType';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import useMediaServices from 'hooks/useMediaServices';

export default function ProvidedBy({item}: {item: MediaItem | null}) {
    const services = useMediaServices();
    const [serviceId] = item?.src.split(':') || [];
    const service = services.find((service) => service.id === serviceId);

    if (
        item &&
        service &&
        service.serviceType === ServiceType.PublicMedia &&
        serviceId !== 'internet-radio'
    ) {
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
