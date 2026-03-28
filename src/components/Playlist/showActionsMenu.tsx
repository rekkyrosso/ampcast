import React from 'react';
import PlaylistItem from 'types/PlaylistItem';
import RepeatMode from 'types/RepeatMode';
import {browser} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {AddToPlaylistMenuItem} from 'components/Actions';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuItemCheckbox,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import useCurrentlyPlayingId from 'hooks/useCurrentlyPlayingId';
import usePlaybackSettings from 'hooks/usePlaybackSettings';

export default async function showActionsMenu(
    items: readonly PlaylistItem[],
    selectedItems: readonly PlaylistItem[],
    rowIndex: number,
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
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
        target,
        x,
        y,
        align
    );
}

interface ActionsMenuProps extends PopupMenuProps {
    items: readonly PlaylistItem[];
    selectedItems: readonly PlaylistItem[];
    rowIndex: number;
}

function ActionsMenu({items, selectedItems, rowIndex, ...props}: ActionsMenuProps) {
    const itemCount = items.length;
    const selectedCount = selectedItems.length;
    const allSelected = selectedCount === itemCount;
    const isSingleSelection = selectedCount === 1;
    const selectedItem = isSingleSelection ? selectedItems[0] : null;
    const currentId = useCurrentlyPlayingId();
    const {repeatMode} = usePlaybackSettings();

    return (
        <PopupMenu {...props}>
            {rowIndex === -1 ? null : (
                <>
                    {isSingleSelection ? (
                        <PopupMenuItem
                            label="Play"
                            value="play"
                            acceleratorKey="Enter"
                            key="play"
                        />
                    ) : null}
                    <PopupMenuItem
                        label="Remove"
                        value="remove"
                        acceleratorKey="Del"
                        key="remove"
                    />
                </>
            )}
            <PopupMenuSeparator />
            {allSelected ? null : (
                <PopupMenuItem
                    label="Select all"
                    value="select-all"
                    acceleratorKey={`${browser.cmdKeyStr}+A`}
                    key="select-all"
                />
            )}
            {!isSingleSelection && isContiguousSelection(items, selectedItems) ? (
                <PopupMenuItem
                    label="Reverse selection"
                    value="reverse-selection"
                    key="reverse-selection"
                />
            ) : null}
            <PopupMenuSeparator />
            <AddToPlaylistMenuItem items={selectedItems} />
            {selectedItem?.id === currentId ? (
                <>
                    <PopupMenuSeparator />
                    <PopupMenuItemCheckbox
                        label="Repeat"
                        value="toggle-repeat"
                        key="toggle-repeat"
                        checked={repeatMode === RepeatMode.One}
                        disabled={
                            !!selectedItem?.linearType || selectedItem?.duration === MAX_DURATION
                        }
                    />
                </>
            ) : null}
            <PopupMenuSeparator />
            {isSingleSelection ? (
                <PopupMenuItem
                    label="Info…"
                    value="info"
                    acceleratorKey={`${browser.cmdKeyStr}+I`}
                    key="info"
                />
            ) : null}
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
