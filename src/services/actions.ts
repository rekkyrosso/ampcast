import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import mediaObjectChanges from 'services/mediaObjectChanges';
import mediaPlayback from 'services/mediaPlayback';
import {getService} from 'services/mediaServices';
import pinStore from 'services/pins/pinStore';
import playlist from 'services/playlist';
import {showMediaInfoDialog} from 'components/Media/MediaInfoDialog';
import {Logger} from 'utils';

const logger = new Logger('ampcast/actions');

export async function performAction<T extends MediaObject>(
    action: Action,
    items: readonly T[],
    payload?: any
): Promise<void> {
    const item = items[0];
    if (!item) {
        return;
    }

    const itemType = item.itemType;

    try {
        switch (action) {
            case Action.PlayNow:
            case Action.PlayNext:
                if (action === Action.PlayNow) {
                    mediaPlayback.autoplay = true;
                }
                switch (itemType) {
                    case ItemType.Media:
                        await playlist.insert(items as readonly MediaItem[]);
                        break;

                    case ItemType.Album:
                    case ItemType.Playlist:
                        await playlist.insert(item as MediaAlbum);
                        break;
                }
                if (action === Action.PlayNow) {
                    playlist.next();
                }
                break;

            case Action.Queue:
                switch (itemType) {
                    case ItemType.Media:
                        await playlist.add(items as readonly MediaItem[]);
                        break;

                    case ItemType.Album:
                        await playlist.add(item as MediaAlbum);
                        break;
                }
                break;

            case Action.Pin:
                if (itemType === ItemType.Playlist) {
                    await pinStore.pin(items as readonly MediaPlaylist[]);
                }
                break;

            case Action.Unpin:
                if (itemType === ItemType.Playlist) {
                    await pinStore.unpin(items as readonly MediaPlaylist[]);
                }
                break;

            case Action.Info:
                await showMediaInfoDialog(items[0]);
                break;

            case Action.Like:
                await rate(item, 1);
                break;

            case Action.Unlike:
                await rate(item, 0);
                break;

            case Action.Rate: {
                if (typeof payload === 'number') {
                    await rate(item, payload);
                }
                break;
            }

            case Action.AddToLibrary:
                await store(item, true);
                break;

            case Action.RemoveFromLibrary:
                await store(item, false);
                break;
        }
    } catch (err) {
        logger.warn('Failed to perform action:', {action, items, payload});
        logger.error(err);
    }
}

async function rate<T extends MediaObject>(item: T, rating: number): Promise<void> {
    const [serviceId] = item.src.split(':');
    const service = getService(serviceId);
    if (service) {
        if (service.rate) {
            await service.rate(item, rating);
            mediaObjectChanges.dispatch<MediaObject>({
                match: (object: MediaObject) => service.compareForRating(object, item),
                values: {rating},
            });
        } else {
            throw Error(`\`rate\` not supported by ${serviceId}.`);
        }
    } else {
        throw Error(`Service not found '${serviceId}'.`);
    }
}

async function store(item: MediaObject, inLibrary: boolean): Promise<void> {
    const [serviceId] = item.src.split(':');
    const service = getService(serviceId);
    if (service) {
        if (service.store) {
            await service.store(item, inLibrary);
            mediaObjectChanges.dispatch<MediaObject>({
                match: (object: MediaObject) => object.src === item.src,
                values: {inLibrary},
            });
        } else {
            throw Error(`\`store\` not supported by ${serviceId}.`);
        }
    } else {
        throw Error(`Service not found '${serviceId}'.`);
    }
}
