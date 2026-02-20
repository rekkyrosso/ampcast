import React, {useCallback, useState} from 'react';
import {ListViewHandle} from 'components/ListView';
import MediaButton from './MediaButton';
import usePlaylistMenu from './usePlaylistMenu';

export interface PlaylistMenuButtonProps {
    playlistRef: React.RefObject<ListViewHandle | null>;
}

export default function PlaylistMenuButton({playlistRef}: PlaylistMenuButtonProps) {
    const {showPlaylistMenu} = usePlaylistMenu(playlistRef);
    const [popupOpen, setPopupOpen] = useState(false);

    const handleMenuClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            setPopupOpen(true);
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const {right, bottom} = button.getBoundingClientRect();
            await showPlaylistMenu(button, right, bottom + 4);
            setTimeout(() => setPopupOpen(false), 300);
        },
        [showPlaylistMenu]
    );

    return (
        <div className="media-buttons-menu">
            <MediaButton
                title="More…"
                icon="menu"
                onClick={popupOpen ? undefined : handleMenuClick}
            />
        </div>
    );
}
