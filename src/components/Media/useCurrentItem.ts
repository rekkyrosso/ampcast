import {useEffect, useState} from 'react';
import {from, tap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import mediaObjectChanges from 'services/actions/mediaObjectChanges';
import {getService} from 'services/mediaServices';
import {Logger} from 'utils';

const logger = new Logger('useCurrentItem');

export default function useCurrentItem<T extends MediaObject>(item: T): T {
    const [currentItem, setCurrentItem] = useState<T>(item);
    const [metadataSrc, setMetadataSrc] = useState('');

    useEffect(() => {
        if (metadataSrc !== item.src) {
            const [serviceId] = item.src.split(':');
            const service = getService(serviceId);

            if (service?.getMetadata) {
                const subscription = from(service.getMetadata(item))
                    .pipe(
                        tap((data) => {
                            logger.log({item, data});
                            setMetadataSrc(item.src);
                            setCurrentItem({...item, ...data});
                        })
                    )
                    .subscribe(logger);
                return () => subscription.unsubscribe();
            } else {
                setMetadataSrc(item.src);
            }
        }
    }, [item, metadataSrc]);

    useEffect(() => {
        const subscription = mediaObjectChanges
            .observe<T>()
            .pipe(
                tap((changes) => {
                    for (const {match, values} of changes) {
                        if (match(currentItem)) {
                            setCurrentItem({...currentItem, ...values});
                            break;
                        }
                    }
                })
            )
            .subscribe(logger);

        return () => subscription.unsubscribe();
    }, [currentItem]);

    return currentItem;
}
