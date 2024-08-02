import React, {memo, useCallback, useEffect, useState} from 'react';
import {timer} from 'rxjs';
import MediaType from 'types/MediaType';
import Visualizer from 'types/Visualizer';
import {browser, isMiniPlayer} from 'utils';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {
    lockVisualizer,
    unlockVisualizer,
    nextVisualizer,
    observeCurrentVisualizers,
} from 'services/visualizer';
import {
    observeVisualizerProviderId,
    observeLockedVisualizer,
} from 'services/visualizer/visualizerSettings';
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
import usePreferences from 'hooks/usePreferences';
import usePrevious from 'hooks/usePrevious';
import usePaused from 'hooks/usePaused';
import useVideoSourceIcon from './useVideoSourceIcon';
import MediaButtons from './MediaButtons';
import ProgressBar from './ProgressBar';
import Static from './Static';
import './VisualizerControls.scss';

export interface VisualizerControlsProps {
    fullscreen: boolean;
    onFullscreenToggle: () => void;
}

export default memo(function VisualizerControls({
    fullscreen,
    onFullscreenToggle,
}: VisualizerControlsProps) {
    const currentVisualizers = useObservable(observeCurrentVisualizers, []);
    const currentVisualizer = useCurrentVisualizer();
    const locked = useObservable(observeLockedVisualizer, false);
    const providerId = useObservable(observeVisualizerProviderId, '');
    const prevProviderId = usePrevious(providerId);
    const hasVisualizers = providerId !== 'none';
    const isRandom = !providerId;
    const canLock = isRandom || currentVisualizers.length > 1;
    const hasNext = canLock && !locked;
    const videoSourceIcon = useVideoSourceIcon();
    const [nextClicked, setNextClicked] = useState(0);
    const paused = usePaused();
    const currentlyPlaying = useCurrentlyPlaying();
    const isPlayingVideo = currentlyPlaying?.mediaType === MediaType.Video;
    const noVisualizerReason = getNoVisualizerReason(currentVisualizer);
    const preferences = usePreferences();
    const miniPlayerEnabled = preferences.miniPlayer && !isMiniPlayer && !browser.isElectron;

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    const handleNextClick = useCallback(() => {
        setNextClicked(nextClicked + 1);
        if (nextClicked === 0) {
            setTimeout(() => nextVisualizer('next-clicked'));
        }
    }, [nextClicked]);

    useEffect(() => {
        // Don't show static while the page is loading.
        if (prevProviderId && prevProviderId !== providerId && !isPlayingVideo) {
            // Changed via Settings.
            setNextClicked((nextClicked) => nextClicked + 1);
        }
    }, [prevProviderId, providerId, isPlayingVideo]);

    useEffect(() => {
        if (nextClicked) {
            const subscription = timer(500).subscribe(() => setNextClicked(0));
            return () => subscription.unsubscribe();
        }
    }, [nextClicked]);

    return (
        <div className="visualizer-controls" style={nextClicked ? {opacity: '1'} : undefined}>
            {hasVisualizers && nextClicked && !paused ? <Static /> : null}
            {isMiniPlayer ? <AppTitle /> : null}
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
                <IconButton
                    icon={fullscreen ? 'collapse' : 'expand'}
                    title={fullscreen ? 'Restore' : 'Fullscreen'}
                    tabIndex={-1}
                    onClick={onFullscreenToggle}
                />
                {miniPlayerEnabled ? (
                    <IconButton
                        icon="link"
                        title="Open playback in new window"
                        tabIndex={-1}
                        onClick={miniPlayer.open}
                    />
                ) : null}
            </IconButtons>
            {hasVisualizers ? (
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
            ) : null}
            <MediaButtons />
        </div>
    );
});

function getNoVisualizerReason(visualizer: Visualizer | null): string {
    if (visualizer?.providerId === 'none' && visualizer.reason) {
        return `visualizer ${visualizer.reason}`;
    }
    return '';
}
