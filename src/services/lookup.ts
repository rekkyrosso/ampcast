import MediaItem from 'types/MediaItem';

// TODO

export async function getPlayableItem(item: MediaItem): Promise<MediaItem | null> {
    const [source, , id] = item.playableSrc?.split(':') || [];
    if (id) {
        return item;
    }
    let found: MediaItem | null = null;
    switch (source) {
        case 'jellyfin':
            found = await jellyfinLookup(item);
            break;

        case 'plex':
            found = await plexLookup(item);
            break;

        case 'apple':
            found = await appleLookup(item);
            break;

        case 'spotify':
            found = await spotifyLookup(item);
            break;

        case 'youtube':
            found = await youtubeLookup(item);
            break;
    }
    return found;
}

async function jellyfinLookup(item: MediaItem): Promise<MediaItem | null> {
    return null;
}

async function plexLookup(item: MediaItem): Promise<MediaItem | null> {
    return null;
}

async function appleLookup(item: MediaItem): Promise<MediaItem | null> {
    return null;
}

async function spotifyLookup(item: MediaItem): Promise<MediaItem | null> {
    return null;
}

async function youtubeLookup(item: MediaItem): Promise<MediaItem | null> {
    return null;
}
