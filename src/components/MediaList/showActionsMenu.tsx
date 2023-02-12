import React from 'react';
import Action from 'types/Action';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {getService} from 'services/mediaServices';
import {browser} from 'utils';
import {getLabelForAction} from 'components/Actions';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';

export default async function showActionsMenu<T extends MediaObject>(
    items: readonly T[],
    x: number,
    y: number,
    isContextMenu = false
): Promise<Action | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <ActionsMenu {...props} items={items} isContextMenu={isContextMenu} />
        ),
        x,
        y
    );
}

interface ActionsMenuProps<T extends MediaObject> extends PopupMenuProps<Action> {
    items: readonly T[];
    isContextMenu?: boolean;
}

function ActionsMenu<T extends MediaObject>({items, isContextMenu, ...props}: ActionsMenuProps<T>) {
    const item = items[0];
    const isSingleItem = items.length === 1 && !!item;
    const allPlayable = items.every(
        (item) => item.itemType === ItemType.Media || item.itemType === ItemType.Album
    );

    return (
        <PopupMenu {...props} className="actions">
            <ul className="actions-menu-items">
                {allPlayable ? <PlayActions /> : null}
                <PopupMenuSeparator />
                {isContextMenu && isSingleItem ? <ContextualActions item={item} /> : null}
                <PopupMenuSeparator />
                {isSingleItem ? (
                    <PopupMenuItem<Action>
                        label="Info..."
                        action={Action.Info}
                        acceleratorKey={`${browser.ctrlKeyStr}+I`}
                        key={Action.Info}
                    />
                ) : null}
            </ul>
        </PopupMenu>
    );
}

function PlayActions() {
    return (
        <>
            <PopupMenuItem<Action>
                label="Queue"
                action={Action.Queue}
                acceleratorKey="Enter"
                key={Action.Queue}
            />
            <PopupMenuItem<Action>
                label="Play next"
                action={Action.PlayNext}
                acceleratorKey="Shift+Enter"
                key={Action.PlayNext}
            />
            <PopupMenuItem<Action>
                label="Play now"
                action={Action.PlayNow}
                acceleratorKey={`${browser.ctrlKeyStr}+Enter`}
                key={Action.PlayNow}
            />
        </>
    );
}

interface ContextualActionsProps<T extends MediaObject> {
    item: T;
}

function ContextualActions<T extends MediaObject>({item}: ContextualActionsProps<T>) {
    const [serviceId] = item?.src.split(':') || [];
    const service = getService(serviceId);

    return (
        <>
            {item.itemType === ItemType.Playlist ? (
                <PopupMenuItem<Action>
                    label={item.isPinned ? 'Unpin' : 'Pin'}
                    action={item.isPinned ? Action.Unpin : Action.Pin}
                    key={item.isPinned ? Action.Unpin : Action.Pin}
                />
            ) : null}
            {item.rating !== undefined && service?.canRate(item, true) ? (
                <PopupMenuItem<Action>
                    label={
                        item.rating
                            ? getLabelForAction(service, Action.Unlike)
                            : getLabelForAction(service, Action.Like)
                    }
                    action={item.rating ? Action.Unlike : Action.Like}
                    key={item.rating ? Action.Unlike : Action.Like}
                />
            ) : null}
            {item.inLibrary === false && service?.canStore(item, true) ? (
                <PopupMenuItem<Action>
                    label={getLabelForAction(service, Action.AddToLibrary)}
                    action={Action.AddToLibrary}
                    key={Action.AddToLibrary}
                />
            ) : null}
        </>
    );
}
