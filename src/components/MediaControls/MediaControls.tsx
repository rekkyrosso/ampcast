import React, {useCallback, useEffect, useRef, useState} from 'react';
import {skip} from 'rxjs';
import {MAX_DURATION} from 'services/constants';
import mediaPlayback, {pause, play, seek, stop} from 'services/mediaPlayback';
import {observeCurrentTime} from 'services/mediaPlayback/playback';
import {observeCurrentIndex, observeCurrentItem, observeSize} from 'services/playlist';
import {ListViewHandle} from 'components/ListView';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import usePlaybackState from 'hooks/usePlaybackState';
import useThrottledValue from 'hooks/useThrottledValue';
import MediaButton from './MediaButton';
import VolumeControl from './VolumeControl';
import usePlaylistMenu from './usePlaylistMenu';
import './MediaControls.scss';

export interface MediaControlsProps {
    playlistRef: React.RefObject<ListViewHandle | null>;
}

export default function MediaControls({playlistRef}: MediaControlsProps) {
    const playheadRef = useRef<HTMLInputElement>(null);
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentItem = useObservable(observeCurrentItem, null);
    const size = useObservable(observeSize, null);
    const {startedAt, currentTime, duration} = usePlaybackState();
    const isInfiniteStream = duration === MAX_DURATION;
    const unpausable = currentItem?.isLivePlayback || isInfiniteStream;
    const paused = usePaused();
    const {showPlaylistMenu} = usePlaylistMenu(playlistRef);
    const [seekTime, setSeekTime] = useThrottledValue(-1, 300, {trailing: true});
    const [seeking, setSeeking] = useState(false);
    const displayTime = isInfiniteStream
        ? startedAt
            ? (Date.now() - startedAt) / 1000
            : 0
        : currentTime;

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
            const button = (event.target as HTMLButtonElement).closest('button')!;
            const {right, bottom} = button.getBoundingClientRect();
            await showPlaylistMenu(button, right, bottom + 4);
        },
        [showPlaylistMenu]
    );

    const handlePrevClick = useCallback(async () => {
        if (size && currentIndex > 0) {
            mediaPlayback.prev();
            playlistRef.current?.scrollIntoView(currentIndex - 1);
        }
        playlistRef.current?.focus();
    }, [playlistRef, currentIndex, size]);

    const handleNextClick = useCallback(async () => {
        if (size && currentIndex < size - 1) {
            mediaPlayback.next();
            playlistRef.current?.scrollIntoView(currentIndex + 1);
        }
        playlistRef.current?.focus();
    }, [playlistRef, currentIndex, size]);

    return (
        <div className="media-controls">
            <div className="current-time-control">
                <Time time={displayTime} />
                <input
                    id="playhead"
                    className={!paused && displayTime >= 1 ? 'smile' : undefined}
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
                    <MediaButton title="More…" icon="menu" onClick={handleMenuClick} />
                </div>
            </div>
        </div>
    );
}
