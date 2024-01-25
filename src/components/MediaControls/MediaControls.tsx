import React, {useCallback, useRef} from 'react';
import mediaPlayback, {
    pause,
    play,
    seek,
    stop,
    observeCurrentTime,
    observeDuration,
} from 'services/mediaPlayback';
import playlist, {observeCurrentIndex} from 'services/playlist';
import {ListViewHandle} from 'components/ListView';
import Time from 'components/Time';
import usePlaylistInject from 'components/Playlist/usePlaylistInject';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import MediaButton from './MediaButton';
import VolumeControl from './VolumeControl';
import usePlaylistMenu from './usePlaylistMenu';
import './MediaControls.scss';

export interface MediaControlsProps {
    listViewRef: React.MutableRefObject<ListViewHandle | null>;
}

export default function MediaControls({listViewRef}: MediaControlsProps) {
    const fileRef = useRef<HTMLInputElement>(null); // TODO
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentTime = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);
    const paused = usePaused();
    const {showPlaylistMenu} = usePlaylistMenu(listViewRef, fileRef);
    const inject = usePlaylistInject();

    const handleSeekChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        seek(event.target.valueAsNumber);
    }, []);

    const handleMoreClick = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const {right, bottom} = (event.target as HTMLButtonElement).getBoundingClientRect();
            await showPlaylistMenu(right, bottom + 4);
        },
        [showPlaylistMenu]
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

    const handleFileImport = useCallback(
        async (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target!.files;
            if (files) {
                await inject.files(files, -1);
                event.target!.value = '';
            }
        },
        [inject]
    );

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
                    <MediaButton title="More…" icon="menu" onClick={handleMoreClick} />
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
