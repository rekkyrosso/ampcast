import MediaItem from 'types/MediaItem';
import {jellyfinSearch} from 'services/jellyfin';
import {plexSearch} from 'services/plex';
import {hasPlayableSrc} from 'services/mediaServices';
import {fetchFirstPage, Logger} from 'utils';
import lookupStore from './lookupStore';
import {dispatchLookupEvent} from './lookupEvents';

const logger = new Logger('lookup');

export default async function lookup(item: MediaItem): Promise<MediaItem | undefined> {
    if (!item) {
        return;
    }
    if (hasPlayableSrc(item)) {
        return item;
    }
    const {link, artist, title} = item;
    if (!artist || !title) {
        return;
    }
    try {
        const [service = ''] = link?.src.split(':') || [];
        const lookup = await lookupStore.get(service, artist, title);
        if (lookup) {
            const foundItem = lookup.item;
            if (foundItem) {
                dispatchLookupEvent(item, foundItem);
            }
            return foundItem;
        }
        let foundItem: MediaItem | undefined;
        if (service) {
            foundItem = await serviceLookup(service, item);
            // TODO: Move this later...
            await lookupStore.add(service, artist, title, foundItem);
        }
        if (foundItem) {
            dispatchLookupEvent(item, foundItem);
        }
        return foundItem;
    } catch (err) {
        logger.error(err);
    }
}

async function serviceLookup(service: string, item: MediaItem): Promise<MediaItem | undefined> {
    switch (service) {
        case 'jellyfin':
            return jellyfinLookup(item);

        case 'plex':
            return plexLookup(item);

        case 'apple':
            return appleLookup(item);

        case 'spotify':
            return spotifyLookup(item);

        case 'youtube':
            return youtubeLookup(item);
    }
}

async function jellyfinLookup(item: MediaItem): Promise<MediaItem | undefined> {
    logger.log('jellyfinLookup', {item});
    try {
        const pager = jellyfinSearch<MediaItem>(item.title, undefined, {
            pageSize: 100,
            maxSize: 100,
        });
        const matches = await fetchFirstPage(pager);
        return matches.find((match) => match.title === item.title && match.artist === item.artist);
    } catch (err) {
        logger.id('jellyfin').error(err);
    }
}

async function plexLookup(item: MediaItem): Promise<MediaItem | undefined> {
    logger.log('plexLookup', {item});
    try {
        const pager = plexSearch<MediaItem>(item.title, undefined, {pageSize: 100, maxSize: 100});
        const matches = await fetchFirstPage(pager);
        return matches.find((match) => match.title === item.title && match.artist === item.artist);
    } catch (err) {
        logger.id('plex').error(err);
    }
}

async function appleLookup(item: MediaItem): Promise<MediaItem | undefined> {
    logger.log('appleLookup', {item});
    return;
}

async function spotifyLookup(item: MediaItem): Promise<MediaItem | undefined> {
    logger.log('spotifyLookup', {item});
    return;
}

async function youtubeLookup(item: MediaItem): Promise<MediaItem | undefined> {
    logger.log('youtubeLookup', {item});
    return;
}
