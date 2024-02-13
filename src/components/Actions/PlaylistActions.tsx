import React, {useMemo} from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import ItemsByService from 'types/ItemsByService';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import {getServiceFromSrc} from 'services/mediaServices';
import {getRecentPlaylists} from 'services/recentPlaylists';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import {PopupMenuItem, PopupMenuSeparator} from 'components/PopupMenu';
import usePlaylistItemsByService from './usePlaylistItemsByService';

export interface PlaylistActionsProps {
    items: readonly MediaObject[];
}

export default function PlaylistActions({items}: PlaylistActionsProps) {
    const mediaItems = useMemo(
        () => items.filter((item): item is MediaItem => item.itemType === ItemType.Media),
        [items]
    );
    const itemsByService = usePlaylistItemsByService(mediaItems);
    const recentPlaylists = getRecentPlaylists(itemsByService.map((items) => items.service));

    return itemsByService.length === 0 ? null : (
        <PopupMenuItem label="Add to playlist">
            <PopupMenuItem<Action>
                label="New playlist…"
                value={Action.AddToNewPlaylist}
                key={Action.AddToNewPlaylist}
            />
            <PopupMenuSeparator />
            {recentPlaylists.map((playlist, index) => (
                <AddToRecentPlaylist
                    playlist={playlist}
                    itemsByService={itemsByService}
                    index={index + 1}
                    key={playlist.src}
                />
            ))}
            <PopupMenuSeparator />
            <PopupMenuItem<Action>
                label="Other…"
                value={Action.AddToPlaylist}
                key={Action.AddToPlaylist}
            />
        </PopupMenuItem>
    );
}

interface AddToRecentPlaylistProps {
    playlist: MediaPlaylist;
    itemsByService: readonly ItemsByService<MediaItem>[];
    index: number;
}

function AddToRecentPlaylist({playlist, itemsByService, index}: AddToRecentPlaylistProps) {
    const service = getServiceFromSrc(playlist);
    const title = playlist.title;
    const items = itemsByService.find((items) => items.service === service)?.items || [];
    const count = items.length;
    const text = count > 1 ? `${title} (${count})` : title;

    return service ? (
        <PopupMenuItem<Action>
            label={<MediaSourceLabel icon={service.icon} text={text} />}
            value={`add-to-recent-playlist-${index}` as Action}
        />
    ) : null;
}
