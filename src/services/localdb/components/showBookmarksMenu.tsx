import React from 'react';
import PopupMenu, {PopupMenuItem, PopupMenuProps, showPopupMenu} from 'components/PopupMenu';

export default async function showBookmarksMenu(
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
): Promise<string | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps) => (
            <PopupMenu {...props}>
                <PopupMenuItem label="Delete" value="delete" acceleratorKey="Del" key="delete" />
            </PopupMenu>
        ),
        target,
        x,
        y,
        align
    );
}
