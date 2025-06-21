import React from 'react';
import Action from 'types/Action';
import MediaPlaylist from 'types/MediaPlaylist';
import MediaSource from 'types/MediaSource';
import {ActionsMenuItems} from 'components/Actions';
import PopupMenu, {PopupMenuProps, PopupMenuSeparator, showPopupMenu} from 'components/PopupMenu';
import {MediaSourceMenuItems} from './MediaSourceMenu';

export default async function showPinnedPlaylistMenu(
    source: MediaSource<any>,
    playlist: MediaPlaylist,
    target: HTMLElement,
    x: number,
    y: number,
    align: 'left' | 'right' = 'left'
): Promise<Action | undefined> {
    source = {...source, primaryItems: {layout: {views: []}}};
    return showPopupMenu(
        (props: PopupMenuProps<Action>) => (
            <PinnedPlaylistMenu {...props} source={source} playlist={playlist} />
        ),
        target,
        x,
        y,
        align
    );
}

interface PinnedPlaylistMenuProps {
    source: MediaSource<any>;
    playlist: MediaPlaylist;
}

function PinnedPlaylistMenu({
    source,
    playlist,
    ...props
}: PopupMenuProps<Action> & PinnedPlaylistMenuProps) {
    return (
        <PopupMenu {...props}>
            <ActionsMenuItems items={[playlist]} />
            <PopupMenuSeparator />
            <MediaSourceMenuItems source={source} />
        </PopupMenu>
    );
}
