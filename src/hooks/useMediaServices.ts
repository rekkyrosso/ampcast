import {useEffect, useState} from 'react';
import {defer} from 'rxjs';
import MediaService from 'types/MediaService';
import {getServices, loadMediaServices} from 'services/mediaServices';

export default function useMediaServices() {
    const [services, setServices] = useState<readonly MediaService[]>(() => getServices());

    useEffect(() => {
        const subscription = defer(() => loadMediaServices()).subscribe(setServices);
        return () => subscription.unsubscribe();
    }, []);

    return services;
}
