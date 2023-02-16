import React from 'react';
import PlaylistItem from 'types/PlaylistItem';
import {browser} from 'utils';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';

export default async function showActionsMenu(
    items: readonly PlaylistItem[],
    selectedItems: readonly PlaylistItem[],
    x: number,
    y: number,
    rowIndex: number
): Promise<string | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps) => (
            <ActionsMenu
                {...props}
                items={items}
                selectedItems={selectedItems}
                rowIndex={rowIndex}
            />
        ),
        x,
        y
    );
}

interface ActionsMenuProps extends PopupMenuProps {
    items: readonly PlaylistItem[];
    selectedItems: readonly PlaylistItem[];
    rowIndex: number;
}

function ActionsMenu({items, selectedItems, rowIndex, ...props}: ActionsMenuProps) {
    const isEmpty = items.length === 0;
    const allSelected = selectedItems.length === items.length;
    const isSingleSelection = selectedItems.length === 1;

    return (
        <PopupMenu {...props} className="actions-menu">
            <ul className="actions-menu-items">
                {rowIndex === -1 ? null : (
                    <>
                        {isSingleSelection ? (
                            <PopupMenuItem
                                label="Play"
                                action="play"
                                acceleratorKey="Enter"
                                key="play"
                            />
                        ) : null}
                        <PopupMenuItem
                            label="Remove"
                            action="remove"
                            acceleratorKey="Del"
                            key="remove"
                        />
                        {isSingleSelection ? (
                            <PopupMenuItem
                                label="Info..."
                                action="info"
                                acceleratorKey={`${browser.ctrlKeyStr}+I`}
                                key="info"
                            />
                        ) : null}
                    </>
                )}
                <PopupMenuSeparator />
                {allSelected ? null : (
                    <PopupMenuItem
                        label="Select all"
                        action="select-all"
                        acceleratorKey={`${browser.ctrlKeyStr}+A`}
                        key="select-all"
                    />
                )}
                {!isSingleSelection && isContiguousSelection(items, selectedItems) ? (
                    <PopupMenuItem
                        label="Reverse selection"
                        action="reverse-selection"
                        key="reverse-selection"
                    />
                ) : null}
                <PopupMenuSeparator />
                {isEmpty ? null : <PopupMenuItem label="Clear" action="clear" key="clear" />}
            </ul>
        </PopupMenu>
    );
}

function isContiguousSelection(
    items: readonly PlaylistItem[],
    selectedItems: readonly PlaylistItem[]
): boolean {
    const startIndex = items.findIndex((item) => item === selectedItems[0]);
    return selectedItems.every((item, index) => item === items[startIndex + index]);
}
