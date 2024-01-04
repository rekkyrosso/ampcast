import React, {useCallback} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import playlist from 'services/playlist';
import {prompt} from 'components/Dialog';
import {ListViewHandle} from 'components/ListView';
import usePlaylistInject from 'components/Playlist/usePlaylistInject';
import {showSavePlaylistDialog} from './SavePlaylistDialog';
import showActionsMenu from './showActionsMenu';

export default function useActionsMenu(
    listViewRef: React.MutableRefObject<ListViewHandle | null>,
    fileRef: React.MutableRefObject<HTMLInputElement | null>
) {
    const inject = usePlaylistInject();

    const show = useCallback(
        async (x: number, y: number) => {
            const listView = listViewRef.current!;
            const action = await showActionsMenu(x, y);
            switch (action) {
                case 'jump-to-current':
                    listView.scrollIntoView(playlist.getCurrentIndex());
                    listView.focus();
                    break;

                case 'stop-after-current':
                    mediaPlayback.stopAfterCurrent = !mediaPlayback.stopAfterCurrent;
                    break;

                case 'clear':
                    playlist.clear();
                    break;

                case 'shuffle':
                    playlist.shuffle(!mediaPlayback.paused);
                    listView.scrollIntoView(0);
                    break;

                case 'add-from-file':
                    fileRef.current!.click();
                    break;

                case 'add-from-url': {
                    const url = await prompt({
                        title: 'External Media',
                        type: 'url',
                        label: 'Url',
                        okLabel: 'Add',
                    });
                    if (url) {
                        await inject.urls([url], -1);
                    }
                    break;
                }

                case 'save-as-playlist':
                    await showSavePlaylistDialog(playlist.getItems());
                    break;
            }
        },
        [listViewRef, fileRef, inject]
    );

    return {showActionsMenu: show};
}
