import React from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
import MediaSourceLayout from 'types/MediaSourceLayout';
import Pager from 'types/Pager';
import Albums from './Albums';
import Artists from './Artists';
import MediaItems from './MediaItems';
import PinnedPlaylist from './PinnedPlaylist';
import Playlists from './Playlists';

export interface PagedItemsProps<T extends MediaObject> {
    service: MediaService;
    source: MediaSource<T>;
    pager: Pager<T> | null;
    layout?: MediaSourceLayout<T>;
    loadingText?: string;
}

export default function PagedItems<T extends MediaObject>(props: PagedItemsProps<T>) {
    // TODO: Annoyed about the casting.

    switch (props.source.itemType) {
        case ItemType.Artist:
            return <Artists {...(props as any)} />;

        case ItemType.Album:
            return <Albums {...(props as any)} />;

        case ItemType.Playlist:
            if (props.source.isPin) {
                return <PinnedPlaylist {...(props as any)} />;
            } else {
                return <Playlists {...(props as any)} />;
            }

        default:
            return <MediaItems {...(props as any)} />;
    }
}
