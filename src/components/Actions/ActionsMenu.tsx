import React from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import LinearType from 'types/LinearType';
import MediaItem from 'types/MediaItem';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {browser} from 'utils';
import {getService, getServiceFromSrc} from 'services/mediaServices';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import usePager from 'hooks/usePager';
import {getLabelForAction} from './Actions';
import {AddToPlaylistMenuItem} from './PlaylistActions';

export async function showActionsMenu<T extends MediaObject>(
    items: readonly T[],
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left',
    actionsMenuProps?: Pick<ActionsMenuProps<T>, 'inListView' | 'parentPlaylist' | 'source'>
): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <ActionsMenu {...props} items={items} {...actionsMenuProps} />
        ),
        target,
        x,
        y,
        align
    );
}

export interface ActionsMenuProps<T extends MediaObject> {
    items: readonly T[];
    inListView?: boolean;
    parentPlaylist?: MediaPlaylist;
    source?: MediaSource<any>;
}

export default function ActionsMenu<T extends MediaObject>({
    items,
    inListView,
    parentPlaylist,
    source,
    ...props
}: PopupMenuProps<Action> & ActionsMenuProps<T>) {
    return (
        <PopupMenu<Action> {...props}>
            <ActionsMenuItems
                items={items}
                inListView={inListView}
                parentPlaylist={parentPlaylist}
                source={source}
            />
        </PopupMenu>
    );
}

export function ActionsMenuItems<T extends MediaObject>({
    items,
    inListView,
    parentPlaylist,
    source,
}: ActionsMenuProps<T>) {
    const item = items[0];
    const isSingleItem = items.length === 1 && !!item;
    const isPlaylist = item?.itemType === ItemType.Playlist;
    const playableTypes = [ItemType.Media, ItemType.Album, ItemType.Playlist];
    const allPlayable = items.every((item) => playableTypes.includes(item.itemType));
    const [{complete: playlistPlayable}] = usePager(isPlaylist ? item.pager : null);
    const playableNow = isPlaylist ? playlistPlayable : allPlayable;
    const canAddToPlaylist = item?.itemType === ItemType.Media;

    return (
        <>
            {allPlayable ? <PlayActions disabled={!playableNow} /> : null}
            {isSingleItem ? (
                <ContextualActions item={item} inListView={inListView} source={source} />
            ) : null}
            {parentPlaylist?.items?.deletable ? (
                <>
                    <PopupMenuItem
                        label="Remove from playlist"
                        value={Action.DeletePlaylistItems}
                        acceleratorKey="Del"
                        key={Action.DeletePlaylistItems}
                    />
                    <PopupMenuSeparator />
                </>
            ) : null}
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
    source?: MediaSource<any>;
}

function ContextualActions<T extends MediaObject>({
    item,
    inListView,
    source,
}: ContextualActionsProps<T>) {
    const service = getServiceFromSrc(item);
    const internetRadio = getService('internet-radio');

    return (
        <>
            {service?.canPin?.(item, inListView) ? (
                <>
                    <PopupMenuItem<Action>
                        label={item.isPinned ? 'Unpin' : 'Pin'}
                        value={item.isPinned ? Action.Unpin : Action.Pin}
                        key={item.isPinned ? Action.Unpin : Action.Pin}
                    />
                    <PopupMenuSeparator />
                </>
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

            {item.itemType === ItemType.Media &&
            item.linearType === LinearType.Station &&
            item.isFavoriteStation !== undefined &&
            internetRadio?.canStore?.(item, inListView) ? (
                <>
                    {source?.id === 'internet-radio/my-stations' ? (
                        <PopupMenuItem<Action>
                            label="Edit station…"
                            value={Action.EditStation}
                            key={Action.EditStation}
                        />
                    ) : null}
                    <PopupMenuItem<Action>
                        label={
                            item.isFavoriteStation
                                ? 'Remove from My Stations'
                                : 'Add to My Stations'
                        }
                        value={item.isFavoriteStation ? Action.RemoveStation : Action.AddStation}
                        key={item.isFavoriteStation ? Action.RemoveStation : Action.AddStation}
                    />
                </>
            ) : null}

            {item.itemType === ItemType.Playlist ? (
                <>
                    <PopupMenuSeparator />
                    {service?.editPlaylist ? (
                        <PopupMenuItem<Action>
                            label="Edit playlist details…"
                            value={Action.EditPlaylist}
                            disabled={!item.editable}
                            key={Action.EditPlaylist}
                        />
                    ) : null}
                    {inListView && service?.deletePlaylist ? (
                        <PopupMenuItem<Action>
                            label="Delete playlist"
                            acceleratorKey="Del"
                            value={Action.DeletePlaylist}
                            disabled={!item.deletable}
                            key={Action.DeletePlaylist}
                        />
                    ) : null}
                </>
            ) : null}
            <PopupMenuSeparator />
        </>
    );
}
