import React, {useCallback, useEffect, useRef, useState} from 'react';
import {skip} from 'rxjs';
import {LiteStorage} from 'utils';
import {MAX_DURATION} from 'services/constants';
import {seek} from 'services/mediaPlayback';
import {observeCurrentTime} from 'services/mediaPlayback/playback';
import {observeCurrentItem} from 'services/playlist';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import usePlaybackState from 'hooks/usePlaybackState';
import useThrottledValue from 'hooks/useThrottledValue';
import {MediaControlsProps} from './MediaControls';

const storage = new LiteStorage('currentTimeControl', 'session');

export default function TimeControl({overlay}: MediaControlsProps) {
    const playheadRef = useRef<HTMLInputElement>(null);
    const currentItem = useObservable(observeCurrentItem, null);
    const {startedAt, currentTime, duration} = usePlaybackState();
    const paused = usePaused();
    const isInfiniteStream = duration === MAX_DURATION;
    const unpausable = currentItem?.isLivePlayback || isInfiniteStream;
    const [seekTime, setSeekTime] = useThrottledValue(-1, 300, {trailing: true});
    const [seeking, setSeeking] = useState(false);
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

    return (
        <div className="time-control">
            <Time
                time={showRemainingTime ? remainingTime : elapsedTime}
                title="Toggle elapsed/remaining time"
                onClick={toggleTimeDisplay}
            />
            <input
                id={overlay ? undefined : 'playhead'}
                className={!overlay && !paused && elapsedTime >= 1 ? 'smile' : undefined}
                type="range"
                aria-label="Seek"
                min={0}
                max={unpausable ? 1 : duration}
                step={1}
                defaultValue={0}
                tabIndex={overlay ? -1 : undefined}
                disabled={paused || unpausable}
                onChange={handleSeekChange}
                onMouseUp={stopSeeking}
                onKeyUp={stopSeeking}
                ref={playheadRef}
            />
        </div>
    );
}
