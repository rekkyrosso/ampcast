import React, {useCallback} from 'react';
import getYouTubeID from 'get-youtube-id';
import {createMediaItemFromUrl} from 'services/music-metadata';
import mediaPlayback from 'services/mediaPlayback';
import playlist from 'services/playlist';
import {getYouTubeVideoInfo} from 'services/youtube';
import {alert, prompt} from 'components/Dialog';
import {ListViewHandle} from 'components/ListView';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import {showSavePlaylistDialog} from './SavePlaylistDialog';
import showActionsMenu from './showActionsMenu';

export default function useActionsMenu(
    listViewRef: React.MutableRefObject<ListViewHandle | null>,
    fileRef: React.MutableRefObject<HTMLInputElement | null>
) {
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
                        const videoId = getYouTubeID(url);
                        try {
                            const item = await (videoId
                                ? getYouTubeVideoInfo(videoId)
                                : createMediaItemFromUrl(url));
                            playlist.add(item);
                        } catch (err: any) {
                            await alert({
                                title: <MediaSourceLabel icon="error" text="Error" />,
                                message:
                                    err.message ||
                                    `${videoId ? 'video' : 'media'} cannot be played.`,
                            });
                        }
                    }
                    break;
                }

                case 'save-as-playlist':
                    showSavePlaylistDialog(playlist.getItems());
                    break;
            }
        },
        [listViewRef, fileRef]
    );

    return {showActionsMenu: show};
}
