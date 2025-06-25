import React, {memo, useCallback, useEffect, useState} from 'react';
import {debounceTime, filter, tap} from 'rxjs';
import MediaType from 'types/MediaType';
import PlaybackType from 'types/PlaybackType';
import Visualizer from 'types/Visualizer';
import {browser, isMiniPlayer} from 'utils';
import {getServiceFromSrc} from 'services/mediaServices';
import miniPlayer from 'services/mediaPlayback/miniPlayer';
import {
    lockVisualizer,
    unlockVisualizer,
    nextVisualizer,
    observeNextVisualizerReason,
} from 'services/visualizer';
import AppTitle from 'components/App/AppTitle';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import {showDialog} from 'components/Dialog';
import PopupMenu, {
    PopupMenuItem,
    PopupMenuItemCheckbox,
    PopupMenuProps,
    PopupMenuSeparator,
    showPopupMenu,
} from 'components/PopupMenu';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from 'components/MediaInfo/CurrentlyPlayingDialog';
import useCurrentlyPlaying from 'hooks/useCurrentlyPlaying';
import useCurrentVisualizer from 'hooks/useCurrentVisualizer';
import useMiniPlayerActive from 'hooks/useMiniPlayerActive';
import usePreferences from 'hooks/usePreferences';
import usePaused from 'hooks/usePaused';
import useVisualizerSettings from 'hooks/useVisualizerSettings';
import MediaButtons from './MediaButtons';
import ProgressBar from './ProgressBar';
import Static from './Static';
import VideoSourceIcon from './VideoSourceIcon';
import useCanLockVisualizer from './useCanLockVisualizer';
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
    const {lockedVisualizer} = useVisualizerSettings();
    const locked = lockedVisualizer !== null;
    const canLock = useCanLockVisualizer();
    const hasNext = canLock && !locked;
    const [nextClicked, setNextClicked] = useState(false);
    const paused = usePaused();
    const currentItem = useCurrentlyPlaying();
    const iframe =
        currentItem?.playbackType === PlaybackType.IFrame
            ? getServiceFromSrc(currentItem)?.iframeAudioPlayback
            : undefined;
    const hideSelector = paused ||
        currentItem?.mediaType === MediaType.Video ||
        currentVisualizer?.providerId === 'none' ||
        iframe?.showContent ||
        iframe?.showCoverArt;
    const noVisualizerReason = getNoVisualizerReason(currentVisualizer);
    const preferences = usePreferences();
    const miniPlayerEnabled = preferences.miniPlayer && !isMiniPlayer && !browser.isElectron;
    const miniPlayerActive = useMiniPlayerActive();
    const showStatic = nextClicked && !paused && !hideSelector && !miniPlayerActive;

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

    const handleContextMenu = useCallback(
        (event: React.MouseEvent) => {
            event.preventDefault();
            event.stopPropagation();
            if ((event.target as HTMLElement).closest('button')) {
                // Clicked on a button.
                return;
            }
            return showPopupMenu(
                (props: PopupMenuProps) => (
                    <PopupMenu {...props}>
                        {hideSelector ? null : (
                            <>
                                <PopupMenuItem
                                    label="Next visualizer"
                                    disabled={!hasNext}
                                    onClick={handleNextClick}
                                />
                                <PopupMenuItemCheckbox
                                    label="Lock the current visualizer"
                                    checked={locked}
                                    disabled={!canLock}
                                    onClick={locked ? unlockVisualizer : lockVisualizer}
                                />
                                <PopupMenuSeparator />
                            </>
                        )}
                        <PopupMenuItem label="Visualizer settings…" onClick={openSettingsDialog} />
                        <PopupMenuSeparator />
                        <PopupMenuItem label="Info…" onClick={openInfoDialog} />
                    </PopupMenu>
                ),
                event.target as HTMLElement,
                event.pageX,
                event.pageY,
                'left'
            );
        },
        [
            locked,
            canLock,
            hasNext,
            hideSelector,
            openInfoDialog,
            openSettingsDialog,
            handleNextClick,
        ]
    );

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
        <div
            className="visualizer-controls"
            style={nextClicked ? {opacity: '1'} : undefined}
            onContextMenu={handleContextMenu}
        >
            {showStatic ? <Static /> : null}
            <AppTitle />
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
            {hideSelector ? null : (
                <IconButtons className="visualizer-buttons visualizer-controls-selector">
                    {canLock || locked ? (
                        <IconButton
                            icon={locked ? 'locked' : 'unlocked'}
                            title={locked ? 'Unlock' : 'Lock the current visualizer'}
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
            )}
            <MediaButtons />
            <VideoSourceIcon />
        </div>
    );
});

function getNoVisualizerReason(visualizer: Visualizer | null): string {
    if (visualizer?.providerId === 'none' && visualizer.name) {
        return `visualizer ${visualizer.name}`;
    }
    return '';
}
