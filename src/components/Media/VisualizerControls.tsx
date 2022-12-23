import React, {memo, useCallback, useEffect, useState} from 'react';
import {timer} from 'rxjs';
import {observeLocked, lock, unlock, nextVisualizer} from 'services/visualizer';
import Icon from 'components/Icon';
import IconButton from 'components/Button/IconButton';
import IconButtons from 'components/Button/IconButtons';
import useObservable from 'hooks/useObservable';
import usePaused from 'hooks/usePaused';
import {showDialog} from 'components/Dialog';
import {VisualizerSettingsDialog} from 'components/Settings';
import CurrentlyPlayingDialog from './CurrentlyPlayingDialog';
import Static from './Static';
import useVideoSourceIcon from './useVideoSourceIcon';
import './Visualizer.scss';

function VisualizerControls() {
    const paused = usePaused();
    const locked = useObservable(observeLocked, false);
    const videoIcon = useVideoSourceIcon();
    const [nextClicked, setNextClicked] = useState(false);

    const openInfoDialog = useCallback(() => {
        showDialog(CurrentlyPlayingDialog);
    }, []);

    const openSettingsDialog = useCallback(() => {
        showDialog(VisualizerSettingsDialog, true);
    }, []);

    const handleNextClick = useCallback(() => {
        nextVisualizer();
        setNextClicked(true);
    }, []);

    useEffect(() => {
        if (nextClicked) {
            const subscription = timer(500).subscribe(() => setNextClicked(false));
            return () => subscription.unsubscribe();
        }
    }, [nextClicked]);

    return (
        <div className="visualizer-controls">
            {nextClicked ? <Static /> : null}
            <IconButtons className="visualizer-controls-settings">
                <IconButton
                    className="with-overlay"
                    icon="info"
                    title="Info"
                    tabIndex={-1}
                    onClick={openInfoDialog}
                />
                <IconButton
                    className="with-overlay"
                    icon="settings"
                    title="Settings"
                    tabIndex={-1}
                    onClick={openSettingsDialog}
                />
            </IconButtons>
            <IconButtons className="visualizer-controls-selector">
                <IconButton
                    className="with-overlay"
                    icon={locked ? 'locked' : 'unlocked'}
                    title={`${locked ? 'Unlock' : 'Lock the current visualizer'}`}
                    tabIndex={-1}
                    onClick={locked ? unlock : lock}
                />
                {!locked && !paused ? (
                    <IconButton
                        className="with-overlay"
                        icon="right"
                        title="Change the visualizer"
                        tabIndex={-1}
                        onClick={handleNextClick}
                    />
                ) : null}
            </IconButtons>
            {videoIcon ? <Icon className="source-icon" name={videoIcon} /> : null}
        </div>
    );
}

export default memo(VisualizerControls);
