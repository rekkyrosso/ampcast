import React from 'react';
import ItemType from 'types/ItemType';
import MediaObject from 'types/MediaObject';
import {browser} from 'utils';
import PopupMenu, {PopupMenuItem, PopupMenuProps, showPopupMenu} from 'components/PopupMenu';

export default async function showActionsMenu<T extends MediaObject>(
    items: readonly T[],
    x: number,
    y: number,
    unplayable?: boolean
): Promise<string> {
    return showPopupMenu(
        (props: PopupMenuProps) => <ActionsMenu {...props} items={items} unplayable={unplayable} />,
        x,
        y
    );
}

interface ActionsMenuProps<T extends MediaObject> extends PopupMenuProps {
    items: readonly T[];
    unplayable?: boolean;
}

function ActionsMenu<T extends MediaObject>({items, unplayable, ...props}: ActionsMenuProps<T>) {
    const isSingleItem = items.length === 1;
    const isPlayable =
        !unplayable &&
        items.every((item) => item.itemType === ItemType.Media || item.itemType === ItemType.Album);

    return (
        <PopupMenu {...props} className="actions">
            <ul className="actions-menu-items">
                {isPlayable ? (
                    <>
                        <PopupMenuItem
                            label="Queue"
                            action="queue"
                            acceleratorKey="Enter"
                            key="queue"
                        />
                        <PopupMenuItem
                            label="Play next"
                            action="play-next"
                            acceleratorKey="Shift+Enter"
                            key="play-next"
                        />
                        <PopupMenuItem
                            label="Play now"
                            action="play"
                            acceleratorKey={`${browser.ctrlKeyStr}+Enter`}
                            key="play"
                        />
                    </>
                ) : null}
                {isSingleItem ? (
                    <PopupMenuItem
                        label="Info..."
                        action="info"
                        acceleratorKey={`${browser.ctrlKeyStr}+I`}
                        key="info"
                    />
                ) : null}
            </ul>
        </PopupMenu>
    );
}
