import React, {useCallback, useEffect, useRef, useState} from 'react';
import {skip} from 'rxjs';
import {LiteStorage, clamp} from 'utils';
import {MAX_DURATION} from 'services/constants';
import mediaPlayback, {pause, play, seek, stop} from 'services/mediaPlayback';
import {observeCurrentTime} from 'services/mediaPlayback/playback';
import {observeCurrentIndex, observeCurrentItem, observeSize} from 'services/playlist';
import {ListViewHandle} from 'components/ListView';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import usePlaybackState from 'hooks/usePlaybackState';
import useThrottledValue from 'hooks/useThrottledValue';
import MediaButton from './MediaButton';
import VolumeControl from './VolumeControl';
import usePlaylistMenu from './usePlaylistMenu';
import './MediaControls.scss';

const storage = new LiteStorage('currentTimeControl', 'session');

export interface MediaControlsProps {
    playlistRef: React.RefObject<ListViewHandle | null>;
}

export default function MediaControls({playlistRef}: MediaControlsProps) {
    const playheadRef = useRef<HTMLInputElement>(null);
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentItem = useObservable(observeCurrentItem, null);
    const size = useObservable(observeSize, 0);
    const {startedAt, currentTime, duration, paused} = usePlaybackState();
    const isInfiniteStream = duration === MAX_DURATION;
    const unpausable = currentItem?.isLivePlayback || isInfiniteStream;
    const {showPlaylistMenu} = usePlaylistMenu(playlistRef);
    const [seekTime, setSeekTime] = useThrottledValue(-1, 300, {trailing: true});
    const [seeking, setSeeking] = useState(false);
    const [popupOpen, setPopupOpen] = useState(false);
    const [showRemainingTime, setShowRemainingTime] = useState(() =>
        storage.getBoolean('showRemainingTime')
    );
    const elapsedTime = isInfiniteStream
        ? startedAt
            ? (Date.now() - startedAt) / 1000
            : 0
        : currentTime;
    const remainingTime = isInfiniteStream ? -MAX_DURATION : elapsedTime - duration;

    const toggleTimeDisplay = useCallback(() => {
        const newValue = !storage.getBoolean('showRemainingTime');
        storage.setBoolean('showRemainingTime', newValue);
        setShowRemainingTime(newValue);
    }, []);

    useEffect(() => {
        if (!seeking) {
            const subscription = observeCurrentTime()
                .pipe(skip(1))
                .subscribe(
                    (currentTime) =>
                        (playheadRef.current!.valueAsNumber = unpausable
                            ? currentTime && 1
                            : currentTime)
                );
            return () => subscription.unsubscribe();
        }
    }, [unpausable, seeking]);

    useEffect(() => {
        if (seekTime !== -1) {
            seek(seekTime);
        }
    }, [seekTime]);

    const handleSeekChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSeeking(true);
            setSeekTime(event.target.valueAsNumber);
        },
        [setSeekTime]
    );

    const stopSeeking = useCallback(() => setSeeking(false), []);

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

    const handlePrevClick = useCallback(async () => {
        const index = clamp(0, currentIndex - 1, size - 1);
        playlistRef.current?.scrollIntoView(index);
        playlistRef.current?.focus();
        mediaPlayback.prev();
    }, [playlistRef, currentIndex, size]);

    const handleNextClick = useCallback(async () => {
        const index = clamp(0, currentIndex + 1, size - 1);
        playlistRef.current?.scrollIntoView(index);
        playlistRef.current?.focus();
        mediaPlayback.next();
    }, [playlistRef, currentIndex, size]);

    return (
        <div className="media-controls">
            <div className="current-time-control">
                <Time
                    time={showRemainingTime ? remainingTime : elapsedTime}
                    title="Toggle elapsed/remaining time"
                    onClick={toggleTimeDisplay}
                />
                <input
                    id="playhead"
                    className={!paused && elapsedTime >= 1 ? 'smile' : undefined}
                    type="range"
                    aria-label="Seek"
                    min={0}
                    max={unpausable ? 1 : duration}
                    step={1}
                    defaultValue={0}
                    disabled={paused || unpausable}
                    onChange={handleSeekChange}
                    onMouseUp={stopSeeking}
                    onKeyUp={stopSeeking}
                    ref={playheadRef}
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
                        disabled={unpausable && !paused}
                    />
                    <MediaButton aria-label="Stop" icon="stop" onClick={stop} />
                    <MediaButton aria-label="Next track" icon="next" onClick={handleNextClick} />
                </div>
                <div className="media-buttons-menu">
                    <MediaButton
                        title="More…"
                        icon="menu"
                        onClick={popupOpen ? undefined : handleMenuClick}
                    />
                </div>
            </div>
        </div>
    );
}
