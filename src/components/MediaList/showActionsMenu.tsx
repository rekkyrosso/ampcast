import React from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {browser} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import {AddToPlaylistMenuItem, getLabelForAction} from 'components/Actions';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import useIsPlaylistPlayable from './useIsPlaylistPlayable';

export default async function showActionsMenu<T extends MediaObject>(
    items: readonly T[],
    isContextMenu: boolean,
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <ActionsMenu {...props} items={items} isContextMenu={isContextMenu} />
        ),
        target,
        x,
        y,
        align
    );
}

interface ActionsMenuProps<T extends MediaObject> extends PopupMenuProps<Action> {
    items: readonly T[];
    isContextMenu?: boolean;
}

function ActionsMenu<T extends MediaObject>({items, isContextMenu, ...props}: ActionsMenuProps<T>) {
    const item = items[0];
    const isSingleItem = items.length === 1 && !!item;
    const isPlaylist = item?.itemType === ItemType.Playlist;
    const playableTypes = [ItemType.Media, ItemType.Album, ItemType.Playlist];
    const allPlayable = items.every((item) => playableTypes.includes(item.itemType));
    const playlistPlayable = useIsPlaylistPlayable(isPlaylist ? item : undefined);
    const playableNow = isPlaylist ? playlistPlayable : allPlayable;
    const canAddToPlaylist = item?.itemType === ItemType.Media;

    return (
        <PopupMenu<Action> {...props}>
            {allPlayable ? <PlayActions disabled={!playableNow} /> : null}
            {isContextMenu && isSingleItem ? <ContextualActions item={item} /> : null}
            {canAddToPlaylist ? (
                <>
                    <AddToPlaylistMenuItem items={items as readonly MediaItem[]} />
                    <PopupMenuSeparator />
                </>
            ) : null}
            {isSingleItem ? (
                <PopupMenuItem
                    label="Info…"
                    value={Action.Info}
                    acceleratorKey={`${browser.cmdKeyStr}+I`}
                    key={Action.Info}
                />
            ) : null}
        </PopupMenu>
    );
}

interface PlayActionsProps {
    disabled?: boolean;
}

function PlayActions({disabled}: PlayActionsProps) {
    return (
        <>
            <PopupMenuItem<Action>
                label="Queue"
                value={Action.Queue}
                acceleratorKey="Enter"
                disabled={disabled}
                key={Action.Queue}
            />
            <PopupMenuItem<Action>
                label="Play next"
                value={Action.PlayNext}
                acceleratorKey="Shift+Enter"
                disabled={disabled}
                key={Action.PlayNext}
            />
            <PopupMenuItem<Action>
                label="Play now"
                value={Action.PlayNow}
                acceleratorKey={`${browser.cmdKeyStr}+Enter`}
                disabled={disabled}
                key={Action.PlayNow}
            />
            <PopupMenuSeparator />
        </>
    );
}

interface ContextualActionsProps<T extends MediaObject> {
    item: T;
}

function ContextualActions<T extends MediaObject>({item}: ContextualActionsProps<T>) {
    const service = getServiceFromSrc(item);

    return (
        <>
            {service?.canPin?.(item, true) ? (
                <PopupMenuItem<Action>
                    label={item.isPinned ? 'Unpin' : 'Pin'}
                    value={item.isPinned ? Action.Unpin : Action.Pin}
                    key={item.isPinned ? Action.Unpin : Action.Pin}
                />
            ) : null}
            {item.rating !== undefined && service?.canRate?.(item, true) ? (
                <PopupMenuItem<Action>
                    label={
                        item.rating
                            ? getLabelForAction(service, Action.Unlike)
                            : getLabelForAction(service, Action.Like)
                    }
                    value={item.rating ? Action.Unlike : Action.Like}
                    key={item.rating ? Action.Unlike : Action.Like}
                />
            ) : null}
            {item.inLibrary === false && service?.canStore?.(item, true) ? (
                <PopupMenuItem<Action>
                    label={getLabelForAction(service, Action.AddToLibrary)}
                    value={Action.AddToLibrary}
                    key={Action.AddToLibrary}
                />
            ) : null}
            {/* remove doesn't work (https://developer.apple.com/forums/thread/107807) */}
            {service?.id !== 'apple' &&
            item.inLibrary === true &&
            service?.canStore?.(item, true) ? (
                <PopupMenuItem<Action>
                    label={getLabelForAction(service, Action.RemoveFromLibrary)}
                    value={Action.RemoveFromLibrary}
                    key={Action.RemoveFromLibrary}
                />
            ) : null}
            <PopupMenuSeparator />
        </>
    );
}
