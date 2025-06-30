import React, {useCallback} from 'react';
import mediaPlayback from 'services/mediaPlayback';
import playback from 'services/mediaPlayback/playback';
import playlist from 'services/playlist';
import {prompt} from 'components/Dialog';
import {ListViewHandle} from 'components/ListView';
import usePlaylistInject from 'components/Playlist/usePlaylistInject';
import {showCreatePlaylistDialog} from 'components/Actions/CreatePlaylistDialog';
import {PopupMenuProps, showPopupMenu} from 'components/PopupMenu';
import PlaylistMenu from './PlaylistMenu';

export default function usePlaylistMenu(listViewRef: React.RefObject<ListViewHandle | null>) {
    const inject = usePlaylistInject();

    const showPlaylistMenu = useCallback(
        async (target: HTMLElement, x: number, y: number) => {
            const listView = listViewRef.current!;
            const action = await showPopupMenu(
                (props: PopupMenuProps) => <PlaylistMenu {...props} />,
                target,
                x,
                y
            );
            switch (action) {
                case 'jump-to-current':
                    listView.scrollIntoView(playlist.getCurrentIndex());
                    listView.focus();
                    break;

                case 'stop-after-current':
                    mediaPlayback.stopAfterCurrent = !mediaPlayback.stopAfterCurrent;
                    break;

                case 'loop':
                    mediaPlayback.loop = !mediaPlayback.loop;
                    break;

                case 'clear':
                    playlist.clear();
                    break;

                case 'shuffle':
                    await playlist.shuffle(!playback.paused);
                    listView.scrollIntoView(0);
                    break;

                case 'add-from-file': {
                    const input = document.createElement('input');
                    input.type = 'file';
                    input.accept = 'audio/*,video/*';
                    input.multiple = true;
                    input.addEventListener('change', async () => {
                        const files = input.files;
                        if (files) {
                            await inject.files(files, -1);
                        }
                    });
                    input.click();
                    break;
                }

                case 'add-from-url': {
                    const examples = [
                        'https://www.youtube.com/*',
                        'https://open.spotify.com/*',
                        'https://music.apple.com/*',
                        'https://soundcloud.com/*',
                        'https://www.mixcloud.com/*',
                        'https://example.com/stream',
                    ];
                    const list = await prompt({
                        title: 'External Media',
                        type: 'textarea',
                        label: 'Urls (max 10)',
                        placeholder: examples.join('\n'),
                        okLabel: 'Add to playlist',
                    });
                    const urls = list.match(/\S+/g);
                    if (urls) {
                        await inject.urls(urls, -1);
                    }
                    break;
                }

                case 'save-as-playlist':
                    await showCreatePlaylistDialog(playlist.getItems());
                    break;
            }
        },
        [listViewRef, inject]
    );

    return {showPlaylistMenu};
}
