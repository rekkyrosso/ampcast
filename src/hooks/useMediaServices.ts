import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaService from 'types/MediaService';
import {loadServices} from 'services/mediaServices';

export default function useMediaServices() {
    const [services, setServices] = useState<readonly MediaService[]>([]);

    useEffect(() => {
        const subscription = from(loadServices()).subscribe(setServices);
        return () => subscription.unsubscribe();
    }, []);

    return services;
}
