import React, {useCallback} from 'react';
import MediaSource from 'types/MediaSource';
import IconButton from 'components/Button';
import useHasMenuButton from './useHasMenuButton';
import showMediaSourceOptions from './showMediaSourceOptions';

export interface MenuButtonProps {
    source: MediaSource<any>;
}

export default function MenuButton({source}: MenuButtonProps) {
    const hasMenuButton = useHasMenuButton(source);

    const handleMenuClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const {right} = button.getBoundingClientRect();
            const {bottom} = (event.target as HTMLButtonElement).getBoundingClientRect();
            await showMediaSourceOptions(source, button, right, bottom + 4);
        },
        [source]
    );

    return hasMenuButton ? (
        <IconButton
            className="menu-button"
            title="Options…"
            icon="menu"
            onClick={handleMenuClick}
        />
    ) : null;
}
