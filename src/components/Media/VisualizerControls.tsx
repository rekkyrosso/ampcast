import React, {memo, useCallback, useEffect, useState} from 'react';
import {debounceTime, filter, tap} from 'rxjs';
import MediaType from 'types/MediaType';
import Visualizer from 'types/Visualizer';
import {browser, isMiniPlayer} from 'utils';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {
    lockVisualizer,
    unlockVisualizer,
    nextVisualizer,
    observeNextVisualizerReason,
} from 'services/visualizer';
import {observeVisualizerLocked} from 'services/visualizer/visualizerSettings';
import AppTitle from 'components/App/AppTitle';
import Icon from 'components/Icon';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import useObservable from 'hooks/useObservable';
import {showDialog} from 'components/Dialog';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from 'components/MediaInfo/CurrentlyPlayingDialog';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import usePreferences from 'hooks/usePreferences';
import usePaused from 'hooks/usePaused';
import MediaButtons from './MediaButtons';
import ProgressBar from './ProgressBar';
import Static from './Static';
import useCanLockVisualizer from './useCanLockVisualizer';
import useVideoSourceIcon from './useVideoSourceIcon';
import './VisualizerControls.scss';

export interface VisualizerControlsProps {
    fullscreen: boolean;
    onFullscreenToggle: () => void;
}

export default memo(function VisualizerControls({
    fullscreen,
    onFullscreenToggle,
}: VisualizerControlsProps) {
    const currentVisualizer = useCurrentVisualizer();
    const locked = useObservable(observeVisualizerLocked, false);
    const canLock = useCanLockVisualizer();
    const hasNext = canLock && !locked;
    const videoSourceIcon = useVideoSourceIcon();
    const [nextClicked, setNextClicked] = useState(false);
    const paused = usePaused();
    const currentlyPlaying = useCurrentlyPlaying();
    const isPlayingVideo = currentlyPlaying?.mediaType === MediaType.Video;
    const noVisualizerReason = getNoVisualizerReason(currentVisualizer);
    const preferences = usePreferences();
    const miniPlayerEnabled = preferences.miniPlayer && !isMiniPlayer && !browser.isElectron;
    const miniPlayerActive = useMiniPlayerActive();
    const showStatic = nextClicked && !paused && !isPlayingVideo && !miniPlayerActive;

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    const handleNextClick = useCallback(() => {
        if (miniPlayer.active) {
            miniPlayer.nextVisualizer();
        } else {
            nextVisualizer('next-clicked');
        }
    }, []);

    useEffect(() => {
        const subscription = observeNextVisualizerReason()
            .pipe(
                filter((reason) => reason === 'next-clicked' || reason === 'new-provider'),
                tap(() => setNextClicked(true)),
                debounceTime(500),
                tap(() => setNextClicked(false))
            )
            .subscribe();
        return () => subscription.unsubscribe();
    }, []);

    return (
        <div className="visualizer-controls" style={nextClicked ? {opacity: '1'} : undefined}>
            {showStatic ? <Static /> : null}
            <AppTitle />
            {videoSourceIcon ? <Icon className="video-source-icon" name={videoSourceIcon} /> : null}
            <p className="media-state no-visualizer-reason">{noVisualizerReason}</p>
            <ProgressBar />
            <IconButtons className="visualizer-buttons visualizer-controls-settings">
                <IconButton icon="info" title="Info" tabIndex={-1} onClick={openInfoDialog} />
                <IconButton
                    icon="settings"
                    title="Settings"
                    tabIndex={-1}
                    onClick={openSettingsDialog}
                />
                {miniPlayerActive ? null : (
                    <IconButton
                        icon={fullscreen ? 'collapse' : 'expand'}
                        title={fullscreen ? 'Restore' : 'Fullscreen'}
                        tabIndex={-1}
                        onClick={onFullscreenToggle}
                    />
                )}
                {miniPlayerEnabled ? (
                    <IconButton
                        icon="link"
                        title={miniPlayerActive ? 'Playback window' : 'Open playback in new window'}
                        tabIndex={-1}
                        onClick={miniPlayer.open}
                    />
                ) : null}
            </IconButtons>
            <IconButtons className="visualizer-buttons visualizer-controls-selector">
                {canLock || locked ? (
                    <IconButton
                        icon={locked ? 'locked' : 'unlocked'}
                        title={`${locked ? 'Unlock' : 'Lock the current visualizer'}`}
                        tabIndex={-1}
                        onClick={locked ? unlockVisualizer : lockVisualizer}
                    />
                ) : null}
                {hasNext ? (
                    <IconButton
                        icon="right"
                        title="Next visualizer"
                        tabIndex={-1}
                        onClick={handleNextClick}
                    />
                ) : null}
            </IconButtons>
            <MediaButtons />
        </div>
    );
});

function getNoVisualizerReason(visualizer: Visualizer | null): string {
    if (visualizer?.providerId === 'none' && visualizer.name) {
        return `visualizer ${visualizer.name}`;
    }
    return '';
}
