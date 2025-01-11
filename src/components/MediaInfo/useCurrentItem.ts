import {useEffect, useState} from 'react';
import {from, tap} from 'rxjs';
import MediaObject from 'types/MediaObject';
import {observeMediaObjectChanges} from 'services/actions/mediaObjectChanges';
import {getServiceFromSrc} from 'services/mediaServices';
import {Logger} from 'utils';

const logger = new Logger('Media/useCurrentItem');

export default function useCurrentItem<T extends MediaObject>(item: T): T {
    const [currentItem, setCurrentItem] = useState<T>(item);
    const [metadataSrc, setMetadataSrc] = useState('');

    useEffect(() => {
        if (metadataSrc !== item.src) {
            const service = getServiceFromSrc(item);

            if (service?.addMetadata) {
                const subscription = from(service.addMetadata(item))
                    .pipe(
                        tap((data) => {
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
        const subscription = observeMediaObjectChanges<T>()
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
