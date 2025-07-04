import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LibraryAction from 'types/LibraryAction';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {Pinnable} from 'types/Pin';
import PlayAction from 'types/PlayAction';
import actionsStore from 'services/actions/actionsStore';
import mediaPlayback from 'services/mediaPlayback';
import pinStore from 'services/pins/pinStore';
import playlist from 'services/playlist';
import {addToRecentPlaylist} from 'services/recentPlaylists';
import {error} from 'components/Dialog';
import {showMediaInfoDialog} from 'components/MediaInfo/MediaInfoDialog';
import {showAddToPlaylistDialog} from './AddToPlaylistDialog';
import {showCreatePlaylistDialog} from './CreatePlaylistDialog';
import {Logger} from 'utils';

const logger = new Logger('ampcast/performAction');

export default async function performAction<T extends MediaObject>(
    action: Action,
    items: readonly T[],
    payload?: any
): Promise<void> {
    const item = items[0];
    if (!item) {
        return;
    }

    switch (action) {
        case Action.PlayNow:
        case Action.PlayNext:
        case Action.Queue:
            performPlayAction(action, items);
            break;

        case Action.Rate:
        case Action.AddToLibrary:
        case Action.RemoveFromLibrary:
            performLibraryAction(action, item, payload);
            break;

        case Action.Pin:
            await pinStore.pin(items as readonly Pinnable[]);
            break;

        case Action.Unpin:
            await pinStore.unpin(items as readonly Pinnable[]);
            break;

        case Action.Info:
            await showMediaInfoDialog(item);
            break;

        case Action.AddToPlaylist:
            await showAddToPlaylistDialog(items as readonly MediaItem[]);
            break;

        case Action.AddToNewPlaylist:
            await showCreatePlaylistDialog(items as readonly MediaItem[]);
            break;

        case Action.AddToRecentPlaylist1:
        case Action.AddToRecentPlaylist2:
        case Action.AddToRecentPlaylist3:
        case Action.AddToRecentPlaylist4: {
            try {
                await addToRecentPlaylist(
                    Number(action.slice(-1)) - 1,
                    items as readonly MediaItem[]
                );
            } catch (err) {
                logger.error(err);
                await error('An error occurred while updating your playlist.');
            }
            break;
        }
    }
}

async function performPlayAction<T extends MediaObject>(
    action: PlayAction,
    items: readonly T[]
): Promise<void> {
    const item = items[0];
    if (!item) {
        return;
    }

    const itemType = item.itemType;
    const wasEmptyPlaylist = playlist.size === 0;

    if (
        itemType === ItemType.Media ||
        itemType === ItemType.Album ||
        itemType === ItemType.Playlist
    ) {
        switch (action) {
            case Action.PlayNow:
            case Action.PlayNext:
                if (action === Action.PlayNow) {
                    mediaPlayback.autoplay = true;
                }
                if (itemType === ItemType.Media) {
                    await playlist.inject(items as readonly MediaItem[]);
                } else {
                    await playlist.inject(item);
                }
                if (action === Action.PlayNow && !wasEmptyPlaylist) {
                    playlist.next();
                }
                break;

            case Action.Queue:
                if (itemType === ItemType.Media) {
                    await playlist.add(items as readonly MediaItem[]);
                } else {
                    await playlist.add(item);
                }
                break;
        }
    }
}

async function performLibraryAction<T extends MediaObject>(
    action: LibraryAction,
    item: T,
    payload?: any
): Promise<void> {
    if (!item) {
        return;
    }
    try {
        switch (action) {
            case Action.Rate: {
                await actionsStore.rate(item, payload);
                break;
            }

            case Action.AddToLibrary:
                await actionsStore.store(item, true);
                break;

            case Action.RemoveFromLibrary:
                await actionsStore.store(item, false);
                break;
        }
    } catch (err) {
        logger.info('Failed to perform action:', action);
        logger.error(err);
    }
}
