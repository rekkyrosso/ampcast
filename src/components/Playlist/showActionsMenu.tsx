import React from 'react';
import PlaylistItem from 'types/PlaylistItem';
import PopupMenu, {PopupMenuItem, PopupMenuProps, showPopupMenu} from 'components/PopupMenu';

export default async function showActionsMenu(
    items: readonly PlaylistItem[],
    x: number,
    y: number
): Promise<string> {
    return showPopupMenu((props: PopupMenuProps) => <ActionsMenu {...props} items={items} />, x, y);
}

interface ActionsMenuProps extends PopupMenuProps {
    items: readonly PlaylistItem[];
}

function ActionsMenu({items, ...props}: ActionsMenuProps) {
    const isSingleItem = items.length === 1;

    return (
        <PopupMenu {...props} className="actions">
            <ul className="actions-menu-items">
                <PopupMenuItem
                    label="Select all"
                    action="select-all"
                    acceleratorKey="Ctrl+A"
                    key="select-all"
                />
                {isSingleItem ? (
                    <PopupMenuItem label="Play" action="play" acceleratorKey="Enter" key="play" />
                ) : null}
                <PopupMenuItem label="Remove" action="remove" acceleratorKey="Del" key="remove" />
                {isSingleItem ? (
                    <PopupMenuItem
                        label="Info..."
                        action="info"
                        acceleratorKey="Ctrl+I"
                        key="info"
                    />
                ) : null}
            </ul>
        </PopupMenu>
    );
}
