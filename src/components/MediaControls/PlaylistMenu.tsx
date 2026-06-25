import React from 'react';
import LinearType from 'types/LinearType';
import RepeatMode from 'types/RepeatMode';
import {MAX_DURATION} from 'services/constants';
import mediaPlayback from 'services/mediaPlayback';
import playlist from 'services/playlist';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuItemCheckbox,
    PopupMenuItemGroup,
    PopupMenuItemRadio,
    PopupMenuProps,
    PopupMenuSeparator,
} from 'components/PopupMenu';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import usePaused from 'hooks/usePaused';
import usePlaybackSettings from 'hooks/usePlaybackSettings';

export default function PlaylistMenu(props: PopupMenuProps) {
    const isEmpty = playlist.size === 0;
    const currentItem = useCurrentlyPlaying();
    const {repeatMode} = usePlaybackSettings();
    const paused = usePaused();
    const canSave = playlist.getItems().some((item) => item.linearType !== LinearType.Station);

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
                label="Save as playlist…"
                value="save-as-playlist"
                disabled={!canSave}
                key="save-as-playlist"
            />
            <PopupMenuSeparator />
            <PopupMenuItem label="Add from file…" value="add-from-file" key="add-from-file" />
            <PopupMenuItem label="Add from url…" value="add-from-url" key="add-from-url" />
            <PopupMenuSeparator />
            <PopupMenuItem label="Repeat" disabled={isEmpty} key="repeat">
                <PopupMenuItemGroup>
                    <PopupMenuItemRadio
                        label="None"
                        value="repeat-none"
                        checked={repeatMode === RepeatMode.None}
                        key="repeat-none"
                    />
                    <PopupMenuItemRadio
                        label="Current"
                        value="repeat-one"
                        checked={repeatMode === RepeatMode.One}
                        disabled={
                            !!currentItem?.linearType || currentItem?.duration === MAX_DURATION
                        }
                        key="repeat-one"
                    />
                    <PopupMenuItemRadio
                        label="All"
                        value="repeat-all"
                        checked={repeatMode === RepeatMode.All}
                        key="repeat-all"
                    />
                </PopupMenuItemGroup>
            </PopupMenuItem>
            <PopupMenuSeparator />
            <PopupMenuItem label="Clear" value="clear" disabled={isEmpty} key="clear" />
        </PopupMenu>
    );
}
