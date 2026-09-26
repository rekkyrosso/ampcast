import {useEffect, useState} from 'react';
import {defer, filter, mergeMap, tap} from 'rxjs';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {getTextFromHtml, Logger} from 'utils';
import lastfmApi from 'services/lastfm/lastfmApi';
import listenbrainzApi from 'services/listenbrainz/listenbrainzApi';
import {dispatchMetadataChanges, observeMetadataChange} from 'services/metadata';
import {getServiceFromSrc, isPersonalMedia} from 'services/mediaServices';
import stationStore from 'services/internetRadio/stationStore';

const logger = new Logger('useActiveItem');

export default function useActiveItem<T extends MediaObject | null>(
    item: T,
    addMetadata?: boolean
): T {
    const [activeItem, setActiveItem] = useState<T>(item);

    useEffect(() => {
        if (item) {
            if (addMetadata) {
                const subscription = defer(() => Promise.resolve(item))
                    .pipe(
                        tap((item) => setActiveItem(item)),
                        mergeMap((item) => addServiceMetadata(item)),
                        tap((item) => setActiveItem(item)),
                        mergeMap((item) => addDescription(item as MediaItem)),
                        tap((item) => setActiveItem(item as T)),
                        filter((item) => item.itemType === ItemType.Media),
                        mergeMap((item) => listenbrainzApi.addMetadata(item as MediaItem)),
                        tap((item) => setActiveItem(item as T))
                    )
                    .subscribe(logger);
                return () => subscription.unsubscribe();
            }
        } else {
            setActiveItem(item as T);
        }
    }, [item, addMetadata]);

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

async function addServiceMetadata<T extends MediaObject>(item: T): Promise<T> {
    try {
        const prevItem = item;
        const service = getServiceFromSrc(item);
        if (service?.addMetadata) {
            item = await service.addMetadata?.(item);
        }
        if (
            item.itemType === ItemType.Media &&
            item.linearType === LinearType.Station &&
            item.isFavoriteStation === undefined
        ) {
            item = {...item, isFavoriteStation: stationStore.isFavorite(item)};
        }
        let changed = false;
        const values: Partial<T> = {};
        const keys = Object.keys(item) as (keyof T)[];
        keys.forEach((key) => {
            if (item[key] !== prevItem[key]) {
                changed = true;
                values[key] = item[key];
            }
        });
        if (changed) {
            dispatchMetadataChanges({
                match: (object) => object.src === item.src,
                values,
            });
        }
    } catch (err) {
        logger.error(err);
    }
    return item;
}

async function addDescription<T extends MediaObject>(item: T): Promise<T> {
    // Add artist/album descriptions from last.fm.
    try {
        if (!isPersonalMedia(item) || item.description !== undefined) {
            return item;
        }
        let description = '';
        if (item.itemType === ItemType.Album) {
            const albumInfo = await lastfmApi.getAlbumInfo(item.title, item.artists?.[0]);
            const wiki = albumInfo?.wiki;
            description = getTextFromHtml(wiki?.content || wiki?.summary);
        } else if (item.itemType === ItemType.Artist) {
            const artistInfo = await lastfmApi.getArtistInfo(item.title);
            const bio = artistInfo?.bio;
            description = getTextFromHtml(bio?.content || bio?.summary);
        } else {
            return item;
        }
        if (description) {
            [description]= description.split(/\s+Full Wikipedia article:/);
            description += '\n\ncredit:lastfm';
        }
        item = {...item, description};
        dispatchMetadataChanges({
            match: (object) => object.src === item.src,
            values: {description},
        });
    } catch (err) {
        logger.error(err);
    }
    return item;
}
