import React from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import {browser} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import useIsPlaylistPlayable from 'hooks/useIsPlaylistPlayable';
import {getLabelForAction} from './Actions';
import {AddToPlaylistMenuItem} from './PlaylistActions';

export async function showActionsMenu<T extends MediaObject>(
    items: readonly T[],
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left',
    inListView?: boolean
): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <ActionsMenu {...props} items={items} inListView={inListView} />
        ),
        target,
        x,
        y,
        align
    );
}

export function ActionsMenuItems<T extends MediaObject>({items, inListView}: ActionsMenuProps<T>) {
    const item = items[0];
    const isSingleItem = items.length === 1 && !!item;
    const isPlaylist = item?.itemType === ItemType.Playlist;
    const playableTypes = [ItemType.Media, ItemType.Album, ItemType.Playlist];
    const allPlayable = items.every((item) => playableTypes.includes(item.itemType));
    const playlistPlayable = useIsPlaylistPlayable(isPlaylist ? item : undefined);
    const playableNow = isPlaylist ? playlistPlayable : allPlayable;
    const canAddToPlaylist = item?.itemType === ItemType.Media;

    return (
        <>
            {allPlayable ? <PlayActions disabled={!playableNow} /> : null}
            {isSingleItem ? <ContextualActions item={item} inListView={inListView} /> : null}
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
        </>
    );
}

interface ActionsMenuProps<T extends MediaObject> {
    items: readonly T[];
    inListView?: boolean;
}

function ActionsMenu<T extends MediaObject>({
    items,
    inListView,
    ...props
}: PopupMenuProps<Action> & ActionsMenuProps<T>) {
    return (
        <PopupMenu<Action> {...props}>
            <ActionsMenuItems items={items} inListView={inListView} />
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
    inListView?: boolean;
}

function ContextualActions<T extends MediaObject>({item, inListView}: ContextualActionsProps<T>) {
    const service = getServiceFromSrc(item);

    return (
        <>
            {service?.canPin?.(item, inListView) ? (
                <PopupMenuItem<Action>
                    label={item.isPinned ? 'Unpin' : 'Pin'}
                    value={item.isPinned ? Action.Unpin : Action.Pin}
                    key={item.isPinned ? Action.Unpin : Action.Pin}
                />
            ) : null}
            {item.rating !== undefined && service?.canRate?.(item, inListView) ? (
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
            {item.inLibrary === false && service?.canStore?.(item, inListView) ? (
                <PopupMenuItem<Action>
                    label={getLabelForAction(service, Action.AddToLibrary)}
                    value={Action.AddToLibrary}
                    key={Action.AddToLibrary}
                />
            ) : null}
            {/* remove doesn't work (https://developer.apple.com/forums/thread/107807) */}
            {service?.id !== 'apple' &&
            item.inLibrary === true &&
            service?.canStore?.(item, inListView) ? (
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
