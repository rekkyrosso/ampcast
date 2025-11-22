import React, {useCallback, useState} from 'react';
import {SetOptional} from 'type-fest';
import IconButton, {IconButtonProps} from './IconButton';

export interface PopupMenuButtonProps extends SetOptional<IconButtonProps, 'icon'> {
    showPopup: (button: HTMLButtonElement) => Promise<void>;
}

export default function PopupMenuButton({
    icon = 'menu',
    showPopup,
    ...props
}: PopupMenuButtonProps) {
    const [open, setOpen] = useState(false);

    const handleClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            setOpen(true);
            await showPopup(button);
            setTimeout(() => setOpen(false), 300);
        },
        [showPopup]
    );

    return <IconButton {...props} icon={icon} onClick={open ? undefined : handleClick} />;
}
