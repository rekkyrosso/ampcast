import {useEffect, useState} from 'react';
import {from} from 'rxjs';
import MediaObject from 'types/MediaObject';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import {getService} from 'services/mediaServices';

export default function useCurrentItem<T extends MediaObject>(item: T): T {
    const [currentItem, setCurrentItem] = useState<T>(item);
    const [metadataSrc, setMetadataSrc] = useState('');

    useEffect(() => {
        setCurrentItem(item);

        const subscription = mediaObjectChanges.observe<T>().subscribe((changes) => {
            for (const {match, values} of changes) {
                if (match(item)) {
                    setCurrentItem({...item, ...values});
                    break;
                }
            }
        });

        return () => subscription.unsubscribe();
    }, [item]);

    useEffect(() => {
        if (metadataSrc !== item.src) {
            const [serviceId] = item.src.split(':');
            const service = getService(serviceId);

            if (service?.getMetadata) {
                const subscription = from(service.getMetadata(item)).subscribe((data) => {
                    setMetadataSrc(item.src);
                    setCurrentItem({...item, ...data});
                });
                return () => subscription.unsubscribe();
            } else {
                setMetadataSrc(item.src);
            }
        }
    }, [item, metadataSrc]);

    return currentItem;
}
