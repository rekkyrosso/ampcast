import React from 'react';
import mediaPlayback from 'services/mediaPlayback';
import {observeSize} from 'services/playlist';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuItemCheckbox,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';

export default async function showActionsMenu(x: number, y: number): Promise<string | undefined> {
    return showPopupMenu((props: PopupMenuProps) => <ActionsMenu {...props} />, x, y);
}

function ActionsMenu(props: PopupMenuProps) {
    const size = useObservable(observeSize, 0);
    const isEmpty = size === 0;
    const paused = usePaused();

    return (
        <PopupMenu {...props}>
            <PopupMenuItemCheckbox
                label="Stop after current"
                value="stop-after-current"
                checked={mediaPlayback.stopAfterCurrent}
                disabled={paused}
                key="stop-after-current"
            />
            <PopupMenuItem
                label="Jump to current"
                value="jump-to-current"
                disabled={isEmpty}
                key="jump-to-current"
            />
            <PopupMenuSeparator />
            <PopupMenuItem label="Shuffle" value="shuffle" disabled={isEmpty} key="shuffle" />
            <PopupMenuSeparator />
            <PopupMenuItem
                label="Save as playlist..."
                value="save-as-playlist"
                disabled={isEmpty}
                key="save-as-playlist"
            />
            <PopupMenuSeparator />
            <PopupMenuItem label="Add from file..." value="add-from-file" key="add-from-file" />
            <PopupMenuItem label="Add from url..." value="add-from-url" key="add-from-url" />
            <PopupMenuSeparator />
            <PopupMenuItem label="Clear" value="clear" disabled={isEmpty} key="clear" />
        </PopupMenu>
    );
}
