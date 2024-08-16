import React, {useEffect, useState} from 'react';
import PlaylistItem from 'types/PlaylistItem';
import {getServiceFromSrc, isPublicMediaService} from 'services/mediaServices';
import MediaSourceLabel from './MediaSourceLabel';
import MediaService from 'types/MediaService';
import useMediaServices from 'hooks/useMediaServices';

export default function ProvidedBy({item}: {item: PlaylistItem}) {
    const services = useMediaServices();
    const [service, setService] = useState<MediaService | undefined>();

    useEffect(() => {
        const service = getServiceFromSrc(item);
        setService(service);
    }, [services, item]);

    return service && isPublicMediaService(service) ? (
        <MediaSourceLabel icon={service.icon} text={`Provided by ${service.name}`} />
    ) : null;
}
