import React, {useCallback, useRef} from 'react';
import getYouTubeID from 'get-youtube-id';
import {createMediaItemFromUrl} from 'services/music-metadata';
import mediaPlayback, {
    pause,
    play,
    seek,
    stop,
    observeCurrentTime,
    observeDuration,
} from 'services/mediaPlayback';
import playlist, {observeCurrentIndex} from 'services/playlist';
import {getYouTubeVideoInfo} from 'services/youtube';
import {alert, prompt} from 'components/Dialog';
import {ListViewHandle} from 'components/ListView';
import MediaSourceLabel from 'components/MediaSources/MediaSourceLabel';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import MediaButton from './MediaButton';
import VolumeControl from './VolumeControl';
import showActionsMenu from './showActionsMenu';
import './MediaControls.scss';

export interface MediaControlsProps {
    listViewRef: React.MutableRefObject<ListViewHandle | null>;
}

export default function MediaControls({listViewRef}: MediaControlsProps) {
    const fileRef = useRef<HTMLInputElement>(null);
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentTime = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);
    const paused = usePaused();

    const handleSeekChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        seek(event.target.valueAsNumber);
    }, []);

    const handleMoreClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const listView = listViewRef.current!;
            const rect = (event.target as HTMLButtonElement).getBoundingClientRect();
            const action = await showActionsMenu(rect.right, rect.bottom + 4);
            switch (action) {
                case 'jump-to-current':
                    listView.scrollIntoView(currentIndex);
                    listView.focus();
                    break;

                case 'stop-after-current':
                    mediaPlayback.stopAfterCurrent = !mediaPlayback.stopAfterCurrent;
                    break;

                case 'clear':
                    playlist.clear();
                    break;

                case 'shuffle':
                    playlist.shuffle(!paused);
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
            }
        },
        [listViewRef, currentIndex, paused]
    );

    const handlePrevClick = useCallback(async () => {
        if (!playlist.atStart) {
            mediaPlayback.prev();
            const listView = listViewRef.current!;
            listView.scrollIntoView(currentIndex - 1);
        }
    }, [listViewRef, currentIndex]);

    const handleNextClick = useCallback(async () => {
        if (!playlist.atEnd) {
            mediaPlayback.next();
            const listView = listViewRef.current!;
            listView.scrollIntoView(currentIndex + 1);
        }
    }, [listViewRef, currentIndex]);

    const handleFileImport = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target!.files;
        if (files) {
            await playlist.add(files);
            event.target!.value = '';
        }
    }, []);

    return (
        <div className="media-controls">
            <div className="current-time-control">
                <Time time={currentTime} />
                <input
                    id="playhead"
                    type="range"
                    aria-label="Seek"
                    min={0}
                    max={duration}
                    step={1}
                    value={currentTime}
                    disabled={paused}
                    onChange={handleSeekChange}
                />
            </div>
            <div className="playback-control">
                <VolumeControl />
                <div className="media-buttons">
                    <MediaButton
                        aria-label="Previous track"
                        icon="prev"
                        onClick={handlePrevClick}
                    />
                    <MediaButton
                        aria-label={paused ? 'Play' : 'Pause'}
                        icon={paused ? 'play' : 'pause'}
                        onClick={paused ? play : pause}
                    />
                    <MediaButton aria-label="Stop" icon="stop" onClick={stop} />
                    <MediaButton aria-label="Next track" icon="next" onClick={handleNextClick} />
                </div>
                <div className="media-buttons-more">
                    <MediaButton title="More..." icon="menu" onClick={handleMoreClick} />
                    <input
                        type="file"
                        accept="audio/*,video/*"
                        multiple
                        onChange={handleFileImport}
                        ref={fileRef}
                    />
                </div>
            </div>
        </div>
    );
}
