import React, {useCallback, useEffect, useState} from 'react';
import MediaObject from 'types/MediaObject';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import DefaultActions, {ActionsProps} from 'components/Actions';
import showPinnedPlaylistMenu from './showPinnedPlaylistMenu';

export default function usePinnedPlaylistActions(source: MediaSource<any>) {
    const [Actions, setActions] = useState<React.FC<ActionsProps>>(() => DefaultActions);

    const showMenu = useCallback(
        async (
            [playlist]: readonly MediaObject[],
            target: HTMLElement,
            x: number,
            y: number,
            align?: 'left' | 'right'
        ) => {
            return showPinnedPlaylistMenu(source, playlist as MediaPlaylist, target, x, y, align);
        },
        [source]
    );

    useEffect(() => {
        setActions(
            () =>
                function PinnedPlaylistActions({item}: ActionsProps) {
                    return <DefaultActions item={item} showMenu={showMenu} />;
                }
        );
    }, [showMenu]);

    return Actions;
}
