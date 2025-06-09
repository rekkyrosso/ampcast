import React from 'react';
import ItemType from 'types/ItemType';
import MediaAlbum from 'types/MediaAlbum';
import MediaArtist from 'types/MediaArtist';
import MediaItem from 'types/MediaItem';
import MediaListLayout from 'types/MediaListLayout';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaService from 'types/MediaService';
import MediaSource from 'types/MediaSource';
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
    defaultLayout?: MediaListLayout;
    loadingText?: string;
    emptyMessage?: string;
}

export default function PagedItems(props: PagedItemsProps<MediaObject>) {
    switch (props.source.itemType) {
        case ItemType.Artist:
            return <Artists {...(props as PagedItemsProps<MediaArtist>)} />;

        case ItemType.Album:
            return <Albums {...(props as PagedItemsProps<MediaAlbum>)} />;

        case ItemType.Playlist:
            if (props.source.isPin) {
                return <PinnedPlaylist {...(props as PagedItemsProps<MediaPlaylist>)} />;
            } else {
                return <Playlists {...(props as PagedItemsProps<MediaPlaylist>)} />;
            }

        default:
            return <MediaItems {...(props as PagedItemsProps<MediaItem>)} />;
    }
}
