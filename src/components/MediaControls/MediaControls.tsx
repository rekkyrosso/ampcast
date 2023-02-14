import React, {useCallback} from 'react';
import mediaPlayback, {
    pause,
    play,
    seek,
    stop,
    prev,
    next,
    observeCurrentTime,
    observeDuration,
    observePaused,
} from 'services/mediaPlayback';
import playlist, {observeCurrentIndex} from 'services/playlist';
import {ListViewHandle} from 'components/ListView';
import Time from 'components/Time';
import useObservable from 'hooks/useObservable';
import MediaIconButton from './MediaIconButton';
import VolumeControl from './VolumeControl';
import showActionsMenu from './showActionsMenu';
import './MediaControls.scss';

export interface MediaControlsProps {
    playlistRef: React.MutableRefObject<ListViewHandle | null>;
}

export default function MediaControls({playlistRef}: MediaControlsProps) {
    const currentIndex = useObservable(observeCurrentIndex, -1);
    const currentTime = useObservable(observeCurrentTime, 0);
    const duration = useObservable(observeDuration, 0);
    const paused = useObservable(observePaused, true);

    const handleSeekChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        seek(event.target.valueAsNumber);
    }, []);

    const handleMoreClick = useCallback(
        async (event: React.MouseEvent) => {
            const action = await showActionsMenu(event.pageX, event.pageY);
            switch (action) {
                case 'jump-to-current':
                    playlistRef.current!.scrollTo(currentIndex);
                    break;

                case 'stop-after-current':
                    mediaPlayback.stopAfterCurrent = !mediaPlayback.stopAfterCurrent;
                    break;

                case 'clear':
                    playlist.clear();
                    break;

                case 'shuffle':
                    playlist.shuffle();
                    break;
            }
        },
        [playlistRef, currentIndex]
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
                    <MediaIconButton aria-label="Previous track" icon="prev" onClick={prev} />
                    <MediaIconButton
                        aria-label={paused ? 'Play' : 'Pause'}
                        icon={paused ? 'play' : 'pause'}
                        onClick={paused ? play : pause}
                    />
                    <MediaIconButton aria-label="Stop" icon="stop" onClick={stop} />
                    <MediaIconButton aria-label="Next track" icon="next" onClick={next} />
                </div>
                <div className="media-buttons-more">
                    <MediaIconButton title="More..." icon="menu" onClick={handleMoreClick} />
                </div>
            </div>
        </div>
    );
}
