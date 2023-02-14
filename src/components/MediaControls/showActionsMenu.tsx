import React from 'react';
import mediaPlayback from 'services/mediaPlayback';
import {observeCurrentIndex} from 'services/playlist';
import PopupMenu, {
    PopupMenuItem,
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
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const paused = usePaused();

    return (
        <PopupMenu {...props} className="actions">
            <ul className="actions-menu-items">
                <PopupMenuItem
                    label="Stop after current"
                    action="stop-after-current"
                    disabled={paused}
                    checked={mediaPlayback.stopAfterCurrent}
                    key="stop-after-current"
                />
                <PopupMenuItem
                    label="Jump to current"
                    action="jump-to-current"
                    disabled={currentIndex === -1}
                    key="jump-to-current"
                />
                <PopupMenuSeparator />
                <PopupMenuItem label="Shuffle" action="shuffle" key="shuffle" />
                <PopupMenuSeparator />
                <PopupMenuItem label="Clear" action="clear" key="clear" />
            </ul>
        </PopupMenu>
    );
}
