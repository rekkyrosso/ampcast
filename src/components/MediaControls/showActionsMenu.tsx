import React from 'react';
import mediaPlayback from 'services/mediaPlayback';
import {observeCurrentIndex, getCurrentIndex} from 'services/playlist';
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
    const currentIndex = useObservable(observeCurrentIndex, getCurrentIndex());
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
                disabled={currentIndex === -1}
                key="jump-to-current"
            />
            <PopupMenuSeparator />
            <PopupMenuItem label="Shuffle" value="shuffle" key="shuffle" />
            <PopupMenuSeparator />
            <PopupMenuItem label="Clear" value="clear" key="clear" />
        </PopupMenu>
    );
}
