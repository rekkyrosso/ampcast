import {useEffect, useState} from 'react';
import {defer, filter, mergeMap, of, tap} from 'rxjs';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {Logger} from 'utils';
import listenbrainzApi from 'services/listenbrainz/listenbrainzApi';
import {observeMetadataChange} from 'services/metadata';
import {getServiceFromSrc} from 'services/mediaServices';
import stationStore from 'services/internetRadio/stationStore';

const logger = new Logger('useActiveItem');

export default function useActiveItem<T extends MediaObject | null>(item: T) {
    const [activeItem, setActiveItem] = useState<T>(item);

    useEffect(() => {
        if (item) {
            const subscription = defer(() => of(item))
                .pipe(
                    tap((item) => setActiveItem(item)),
                    mergeMap((item) => addMetadata(item)),
                    tap((item) => setActiveItem(item)),
                    filter((item) => item.itemType === ItemType.Media),
                    mergeMap((item) => listenbrainzApi.addMetadata(item as MediaItem)),
                    tap((item) => setActiveItem(item as T))
                )
                .subscribe(logger);
            return () => subscription.unsubscribe();
        } else {
            setActiveItem(null as T);
        }
    }, [item]);

    useEffect(() => {
        if (activeItem) {
            const subscription = observeMetadataChange(activeItem)
                .pipe(tap((values) => setActiveItem({...activeItem, ...values})))
                .subscribe(logger);

            return () => subscription.unsubscribe();
        }
    }, [activeItem]);

    return activeItem;
}

async function addMetadata<T extends MediaObject>(item: T): Promise<T> {
    try {
        const service = getServiceFromSrc(item);
        item = (await service?.addMetadata?.(item)) || item;
        if (item.itemType === ItemType.Media && item.linearType === LinearType.Station) {
            item = {...item, isFavoriteStation: stationStore.isFavorite(item)};
        }
    } catch (err) {
        logger.error(err);
    }
    return item;
}
