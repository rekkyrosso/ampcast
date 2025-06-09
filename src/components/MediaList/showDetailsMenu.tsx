import React from 'react';
import PopupMenu, {PopupMenuItem, PopupMenuProps, showPopupMenu} from 'components/PopupMenu';

export default async function showDetailsMenu(
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
): Promise<string | undefined> {
    return showPopupMenu(
        (props: PopupMenuProps) => <DetailsMenu {...props} />,
        target,
        x,
        y,
        align
    );
}

function DetailsMenu(props: PopupMenuProps) {
    return (
        <PopupMenu {...props}>
            <PopupMenuItem label="Edit fields…" value="edit-fields" />
        </PopupMenu>
    );
}
