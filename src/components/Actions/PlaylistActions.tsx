import React, {useCallback} from 'react';
import Action from 'types/Action';
import ItemsByService from 'types/ItemsByService';
import MediaItem from 'types/MediaItem';
import MediaPlaylist from 'types/MediaPlaylist';
import {getServiceFromSrc} from 'services/mediaServices';
import {getPlaylistItemsByService, getRecentPlaylists} from 'services/recentPlaylists';
import IconButton from 'components/Button';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import usePlaylistItems from './usePlaylistItems';
import performAction from './performAction';

export interface AddToPlaylistButtonProps<T extends MediaItem> {
    item: T;
}

export function AddToPlaylistButton<T extends MediaItem>({item}: AddToPlaylistButtonProps<T>) {
    const playlistItems = usePlaylistItems([item]);
    const itemsByService = getPlaylistItemsByService(playlistItems);

    const handleAddToPlaylistClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const rect = button.getBoundingClientRect();
            const action = await showAddToPlaylistMenu(
                playlistItems,
                button,
                rect.right,
                rect.bottom,
                'right'
            );
            if (action) {
                await performAction(action, playlistItems);
            }
        },
        [playlistItems]
    );

    return itemsByService.length === 0 ? null : (
        <IconButton
            icon="playlist-add"
            title="Add to playlist…"
            onClick={handleAddToPlaylistClick}
        />
    );
}

async function showAddToPlaylistMenu<T extends MediaItem>(
    items: readonly T[],
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'right'
): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <PopupMenu {...props}>
                <PlaylistActions items={items} />
            </PopupMenu>
        ),
        target,
        x,
        y,
        align
    );
}

export interface AddToPlaylistMenuItemProps<T extends MediaItem> {
    items: readonly T[];
}

export function AddToPlaylistMenuItem<T extends MediaItem>({items}: PlaylistActionsProps<T>) {
    const playlistItems = usePlaylistItems(items);
    const itemsByService = getPlaylistItemsByService(playlistItems);
    const disabled = itemsByService.length === 0;
    return (
        <PopupMenuItem label="Add to playlist" disabled={disabled}>
            {disabled ? null : <PlaylistActions items={playlistItems} />}
        </PopupMenuItem>
    );
}

interface PlaylistActionsProps<T extends MediaItem> {
    items: readonly T[];
}

function PlaylistActions<T extends MediaItem>({items}: PlaylistActionsProps<T>) {
    const itemsByService = getPlaylistItemsByService(items);
    const recentPlaylists = getRecentPlaylists(itemsByService.map((items) => items.service));

    return (
        <>
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
        </>
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
